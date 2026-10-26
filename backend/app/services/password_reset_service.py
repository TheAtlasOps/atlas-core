import hashlib
import logging
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit, urlunsplit

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.password_reset import PasswordResetToken
from app.models.user import User
from app.services.email_service import build_password_reset_html, send_transactional_email

logger = logging.getLogger(__name__)
REQUEST_MESSAGE = "Si el correo corresponde a una cuenta habilitada, recibirás instrucciones para recuperar el acceso."
INVALID_LINK = "El enlace no es válido, ha vencido o ya fue utilizado. Solicita uno nuevo."
TOKEN_LIFETIME = timedelta(minutes=30)
REQUEST_COOLDOWN = timedelta(minutes=1)


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def validate_new_password(password: str, confirmation: str) -> None:
    if password != confirmation:
        raise HTTPException(400, "Las contraseñas no coinciden.")
    if len(password) < 12 or not password.strip():
        raise HTTPException(400, "La contraseña debe tener al menos 12 caracteres.")
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(400, "La contraseña supera el máximo de 72 bytes permitido por bcrypt.")


def reset_url(token: str) -> str:
    configured = settings.PASSWORD_RESET_URL.strip()
    source = urlsplit(configured or settings.FRONTEND_PORTAL_URL)
    if source.username or source.password or not source.hostname:
        raise ValueError("Origen de recuperación no válido")
    local = source.hostname in ("localhost", "127.0.0.1", "::1")
    local_development = local and settings.ENVIRONMENT in ("development", "test")
    if (local and not local_development) or (source.scheme != "https" and not (source.scheme == "http" and local_development)):
        raise ValueError("La recuperación requiere HTTPS")
    path = source.path if configured else "/reset-password"
    # El fragmento no se envía en las peticiones HTTP ni en sus access logs.
    return urlunsplit((source.scheme, source.netloc, path or "/reset-password", "", f"token={token}"))


async def invalidate_reset_tokens(db: AsyncSession, user_id: uuid.UUID, now: datetime) -> None:
    await db.execute(update(PasswordResetToken).where(
        PasswordResetToken.user_id == user_id, PasswordResetToken.used_at.is_(None)
    ).values(used_at=now))


async def request_password_reset(email: str) -> None:
    """Tarea posterior a la respuesta pública. Nunca devuelve ni registra el token."""
    try:
        async with AsyncSessionLocal() as db:
            async with db.begin():
                result = await db.execute(select(User).where(
                    func.lower(func.trim(User.email)) == email.strip().lower(), User.is_active.is_(True)
                ).with_for_update())
                user = result.scalar_one_or_none()
                if user is None:
                    return
                now = datetime.now(timezone.utc)
                previous_result = await db.execute(select(PasswordResetToken).where(
                    PasswordResetToken.user_id == user.id
                ).order_by(PasswordResetToken.created_at.desc()).limit(1))
                previous = previous_result.scalar_one_or_none()
                if previous and utc(previous.created_at) > now - REQUEST_COOLDOWN:
                    return
                raw_token = secrets.token_urlsafe(32)
                link_url = reset_url(raw_token)
                digest = token_digest(raw_token)
                recipient = user.email
                html = build_password_reset_html(user.full_name, link_url)
                await invalidate_reset_tokens(db, user.id, now)
                db.add(PasswordResetToken(
                    user_id=user.id, token_hash=digest, created_at=now, expires_at=now + TOKEN_LIFETIME
                ))
            try:
                sent = await send_transactional_email(
                    recipient, "ATLAS · Recupera tu acceso", html, sensitive=True
                )
                delivered = sent.success and not sent.simulated
            except Exception:
                delivered = False
            if not delivered:
                async with db.begin():
                    await db.execute(update(PasswordResetToken).where(
                        PasswordResetToken.token_hash == digest,
                        PasswordResetToken.used_at.is_(None),
                    ).values(used_at=datetime.now(timezone.utc)))
                logger.warning("password_reset_delivery_failed")
    except Exception as exc:
        # No incluir correo, URL, token, excepciones del proveedor ni parámetros SQL.
        logger.error("password_reset_request_failed error_type=%s", type(exc).__name__)


async def apply_password_change(db: AsyncSession, user: User, password: str, now: datetime) -> None:
    user.password_hash = get_password_hash(password)
    user.auth_version = (user.auth_version or 0) + 1
    await invalidate_reset_tokens(db, user.id, now)


async def confirm_password_reset(db: AsyncSession, token: str, password: str, confirmation: str) -> None:
    validate_new_password(password, confirmation)
    if not re.fullmatch(r"[A-Za-z0-9_-]{43}", token):
        raise HTTPException(400, INVALID_LINK)
    try:
        async with db.begin():
            digest = token_digest(token)
            owner = await db.execute(select(PasswordResetToken.user_id).where(
                PasswordResetToken.token_hash == digest
            ))
            user_id = owner.scalar_one_or_none()
            if user_id is None:
                raise HTTPException(400, INVALID_LINK)
            # Mismo orden de bloqueos que emisión y herramienta administrativa.
            users = await db.execute(select(User).where(User.id == user_id).with_for_update())
            user = users.scalar_one_or_none()
            tokens = await db.execute(select(PasswordResetToken).where(
                PasswordResetToken.token_hash == digest
            ).with_for_update().execution_options(populate_existing=True))
            record = tokens.scalar_one_or_none()
            now = datetime.now(timezone.utc)
            if user is None or not user.is_active or record is None or record.used_at is not None or utc(record.expires_at) <= now:
                raise HTTPException(400, INVALID_LINK)
            await apply_password_change(db, user, password, now)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("password_reset_confirm_failed error_type=%s", type(exc).__name__)
        raise HTTPException(503, "No pudimos actualizar la contraseña. Inténtalo más tarde.") from None


async def admin_reset_password(db: AsyncSession, user_id: uuid.UUID, email: str, password: str, confirmation: str) -> None:
    validate_new_password(password, confirmation)
    async with db.begin():
        result = await db.execute(select(User).where(
            User.id == user_id, func.lower(func.trim(User.email)) == email.strip().lower()
        ).with_for_update())
        user = result.scalar_one_or_none()
        if user is None:
            raise ValueError("No existe una cuenta que coincida con el UUID y correo indicados.")
        await apply_password_change(db, user, password, datetime.now(timezone.utc))
