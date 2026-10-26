import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import verify_password, create_access_token, generate_magic_link_token
from app.models.user import User
from app.models.work_order import WorkOrder
from app.models.magic_link import MagicLink
from app.schemas.auth import Token, MagicLinkResponse


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> Optional[User]:
    """Busca al usuario por email y valida su contraseña hasheada."""
    result = await db.execute(select(User).where(User.email == email.lower().strip()))
    user = result.scalar_one_or_none()

    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_user_token_response(user: User) -> Token:
    """Genera el token JWT y emite la respuesta con metadatos del usuario."""
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        auth_version=user.auth_version or 0,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value
    )


async def generate_magic_link_for_order(
    db: AsyncSession, work_order_id: uuid.UUID, expire_hours: int = 48
) -> MagicLinkResponse:
    """
    Emite un Magic Link criptográfico de alta entropía asociado a una OT (RNF-SEG-03 / RF-API-09).
    Si ya existían tokens activos para esa OT, los desactiva antes de emitir uno nuevo.
    """
    # 1. Verificar existencia de la orden
    order_result = await db.execute(select(WorkOrder).where(WorkOrder.id == work_order_id))
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró la orden de trabajo con ID {work_order_id}"
        )

    # 2. Desactivar tokens previos para evitar colisiones
    prev_links_result = await db.execute(
        select(MagicLink).where(
            MagicLink.work_order_id == work_order_id,
            MagicLink.is_active == True
        )
    )
    prev_links = prev_links_result.scalars().all()
    for link in prev_links:
        link.is_active = False

    # 3. Generar token de 32 bytes base64url
    raw_token = generate_magic_link_token()
    now_utc = datetime.now(timezone.utc)
    expires_at = now_utc + timedelta(hours=expire_hours)

    new_magic_link = MagicLink(
        work_order_id=work_order_id,
        token=raw_token,
        expires_at=expires_at,
        is_active=True,
        created_at=now_utc
    )
    db.add(new_magic_link)
    await db.commit()
    await db.refresh(new_magic_link)

    portal_url = f"{settings.FRONTEND_PORTAL_URL}/{raw_token}"

    return MagicLinkResponse(
        id=new_magic_link.id,
        work_order_id=new_magic_link.work_order_id,
        token=new_magic_link.token,
        portal_url=portal_url,
        expires_at=new_magic_link.expires_at,
        is_active=new_magic_link.is_active
    )
