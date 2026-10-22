from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import require_role
from app.models.user import User
from app.models.work_order import WorkOrder
from app.models.magic_link import MagicLink
from app.models.enums import UserRoleEnum
from app.schemas.notification import (
    ManualNotifyRequest,
    EmailNotificationResponse,
)
from app.services.auth_service import generate_magic_link_for_order
from app.services.email_service import (
    send_transactional_email,
    build_magic_link_html,
    build_service_completed_html,
)
from app.core.config import settings

router = APIRouter()


@router.post(
    "/send-magic-link",
    response_model=EmailNotificationResponse,
    summary="Reenvío manual de Magic Link al cliente",
    description="Permite al coordinador reenviar la invitación con Magic Link o recordatorio de visita al correo del cliente (RF-BO-11 / 14-DocArq §3.3).",
)
async def resend_magic_link(
    request: ManualNotifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Disparo manual de notificación transaccional."""
    # 1. Obtener orden con cliente y magic links
    result = await db.execute(
        select(WorkOrder)
        .options(
            selectinload(WorkOrder.client),
            selectinload(WorkOrder.magic_links),
            selectinload(WorkOrder.technician),
        )
        .where(WorkOrder.id == request.work_order_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden de trabajo con ID {request.work_order_id} no encontrada"
        )

    # 2. Determinar correo destinatario (personalizado o el guardado en el cliente)
    target_email = request.recipient_email or (order.client.contact_email if order.client else None)
    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La orden no cuenta con un correo de cliente y no se especificó un correo de destino"
        )

    # Si se especificó un correo personalizado y difiere del actual, actualizarlo en el cliente
    if request.recipient_email and order.client and order.client.contact_email != request.recipient_email:
        order.client.contact_email = str(request.recipient_email)
        await db.commit()

    # 3. Obtener token activo de Magic Link (vigente) o auto-generarlo
    active_token = None
    if order.magic_links:
        now_utc = datetime.now(timezone.utc)
        sorted_links = sorted(
            order.magic_links,
            key=lambda l: l.created_at or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
        for ml in sorted_links:
            if ml.is_active and ml.expires_at > now_utc:
                active_token = ml.token
                break

    if not active_token:
        generated = await generate_magic_link_for_order(db=db, work_order_id=order.id)
        active_token = generated.token

    magic_link_url = f"{settings.FRONTEND_PORTAL_URL}/{active_token}"
    client_name = order.client.contact_person or order.client.business_name if order.client else "Estimado Cliente"
    service_type = order.service_type.value.replace("_", " ").title()
    date_str = order.scheduled_date.strftime("%d/%m/%Y a las %H:%M hrs")
    address = order.address_override or (order.client.address if order.client else "Dirección de visita")

    html_content = build_magic_link_html(
        client_name=client_name,
        order_number=order.order_number,
        service_type=service_type,
        scheduled_date_str=date_str,
        address=address,
        magic_link_url=magic_link_url,
    )

    subject = f"🌍 Atlas Entel: Seguimiento de tu visita técnica ({order.order_number})"

    return await send_transactional_email(
        to_email=str(target_email),
        subject=subject,
        html_content=html_content,
    )


@router.post(
    "/test-email",
    response_model=EmailNotificationResponse,
    summary="Prueba de conectividad de correos (Resend)",
    description="Envía un correo de prueba para verificar que la integración con la API de Resend funcione correctamente. Solo Administradores.",
)
async def test_email(
    to_email: str = Query(..., description="Correo de destino para la prueba"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.ADMIN])),
):
    """Endpoint de diagnóstico para validar la clave de Resend."""
    html = """
    <h2>Atlas FSM - Prueba de Conexión Exitosa</h2>
    <p>Este correo confirma que el backend de Atlas tiene configurado correctamente el proveedor transaccional Resend.</p>
    """
    return await send_transactional_email(
        to_email=to_email,
        subject="[Atlas FSM] Test de Conexión de Correo Transaccional",
        html_content=html,
    )
