import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import verify_password, create_access_token, generate_magic_link_token
from app.models.user import User
from app.models.work_order import WorkOrder
from app.models.magic_link import MagicLink
from app.models.enums import EvidenceTypeEnum
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
    db: AsyncSession, work_order_id: uuid.UUID, expire_hours: int = 48, force_new: bool = False
) -> MagicLinkResponse:
    """
    Emite un Magic Link criptográfico de alta entropía asociado a una OT (RNF-SEG-03 / RF-API-09).
    - Si existe un enlace activo y vigente y force_new es False, lo reutiliza preservando trazabilidad.
    - Si force_new es True o no hay enlace vigente, desactiva enlaces previos y genera uno nuevo.
    - Preserva la firma digital existente en el nuevo enlace si la orden ya fue firmada.
    - Permite enlaces de consulta para órdenes auditadas en modo de solo lectura.
    """
    # 1. Verificar existencia de la orden con sus evidencias y enlaces
    order_result = await db.execute(
        select(WorkOrder)
        .options(
            selectinload(WorkOrder.magic_links),
            selectinload(WorkOrder.evidences),
        )
        .where(WorkOrder.id == work_order_id)
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró la orden de trabajo con ID {work_order_id}"
        )

    now_utc = datetime.now(timezone.utc)

    # 2. Identificar si la orden ya tiene firma registrada (evidencias o enlaces previos)
    existing_signature_key = None
    if hasattr(order, "evidences") and order.evidences:
        for ev in order.evidences:
            if ev.evidence_type == EvidenceTypeEnum.FIRMA_CLIENTE and ev.storage_url and ev.storage_url.strip():
                existing_signature_key = ev.storage_url.strip()
                break

    if not existing_signature_key and hasattr(order, "magic_links") and order.magic_links:
        for ml in order.magic_links:
            if ml.signature_url and ml.signature_url.strip():
                existing_signature_key = ml.signature_url.strip()
                break

    # 3. Comprobar si existe un enlace vigente no expirado para reutilizar (solo si not force_new)
    active_link = None
    if not force_new and hasattr(order, "magic_links") and order.magic_links:
        for ml in order.magic_links:
            if ml.is_active and ml.expires_at > now_utc:
                active_link = ml
                break

    if active_link:
        # Si la orden ya tenía firma y el enlace activo no la tenía asignada, sincronizarla
        if existing_signature_key and not active_link.signature_url:
            active_link.signature_url = existing_signature_key
            await db.commit()
            await db.refresh(active_link)

        portal_url = f"{settings.FRONTEND_PORTAL_URL}/{active_link.token}"
        work_order_id_val = getattr(active_link, "work_order_id", None) or getattr(getattr(active_link, "work_order", None), "id", None) or work_order_id
        return MagicLinkResponse(
            id=active_link.id,
            work_order_id=work_order_id_val,
            token=active_link.token,
            portal_url=portal_url,
            expires_at=active_link.expires_at,
            is_active=active_link.is_active
        )

    # 4. Desactivar tokens previos (vencidos, inactivos o reemplazados por force_new) para evitar colisiones
    if hasattr(order, "magic_links") and order.magic_links:
        for link in order.magic_links:
            link.is_active = False

    # 5. Generar token de 32 bytes base64url conservando la firma si ya existía
    raw_token = generate_magic_link_token()
    expires_at = now_utc + timedelta(hours=expire_hours)

    new_magic_link = MagicLink(
        work_order_id=work_order_id,
        token=raw_token,
        expires_at=expires_at,
        is_active=True,
        signature_url=existing_signature_key,
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


async def revoke_magic_link_for_order(
    db: AsyncSession, work_order_id: uuid.UUID
) -> dict:
    """
    Revoca de inmediato todos los Magic Links activos asociados a una orden de trabajo (RNF-SEG-03 / RF-CLI-09).
    Establece is_active = False para que cualquier consulta posterior responda HTTP 410 (Gone).
    """
    order_result = await db.execute(
        select(WorkOrder)
        .options(selectinload(WorkOrder.magic_links))
        .where(WorkOrder.id == work_order_id)
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró la orden de trabajo con ID {work_order_id}"
        )

    revoked_count = 0
    if hasattr(order, "magic_links") and order.magic_links:
        for ml in order.magic_links:
            if ml.is_active:
                ml.is_active = False
                revoked_count += 1
        if revoked_count > 0:
            await db.commit()

    return {
        "success": True,
        "message": f"Se revocaron {revoked_count} enlace(s) de seguimiento para la orden.",
        "revoked_count": revoked_count,
    }
