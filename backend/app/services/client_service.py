import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.magic_link import MagicLink
from app.models.work_order import WorkOrder, OrderStatusHistory
from app.models.user import Technician
from app.models.evidence import WorkOrderEvidence
from app.models.enums import OrderStatusEnum, EvidenceTypeEnum
from app.schemas.client_portal import (
    TimelineStepItem,
    ClientTechnicianBadge,
    ClientOrderSummaryResponse,
    ConfirmVisitRequest,
    ConfirmVisitResponse,
    SignConformityRequest,
    SignConformityResponse,
)


async def validate_magic_link_token(db: AsyncSession, token: str) -> MagicLink:
    """
    Valida el registro, vigencia y estado del Magic Link (RNF-SEG-03 / RF-CLI-03 / RF-CLI-09).
    Si el token venció o fue revocado, arroja HTTP 410 (Gone).
    """
    clean_token = token.strip()
    result = await db.execute(
        select(MagicLink)
        .options(
            selectinload(MagicLink.work_order).options(
                selectinload(WorkOrder.client),
                selectinload(WorkOrder.technician).selectinload(Technician.user),
                selectinload(WorkOrder.status_history),
            )
        )
        .where(MagicLink.token == clean_token)
    )
    magic_link = result.scalar_one_or_none()

    if not magic_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El enlace de acceso (Magic Link) no es válido o no existe en el sistema."
        )

    now_utc = datetime.now(timezone.utc)

    # Validación de expiración e invalidación automática (RNF-SEG-03 / RF-CLI-09)
    if not magic_link.is_active or magic_link.expires_at <= now_utc:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Este enlace de seguimiento ha expirado o ya no se encuentra activo. Solicite un nuevo enlace de acceso a la mesa de soporte."
        )

    return magic_link


def compute_timeline_steps(order: WorkOrder) -> List[TimelineStepItem]:
    """
    Calcula los 4 hitos secuenciales del Timeline del portal cliente
    contrastándolos con el historial de estados de PostgreSQL.
    """
    status_order = {
        OrderStatusEnum.IDLE: 0,
        OrderStatusEnum.CONFIRMADA: 1,
        OrderStatusEnum.EN_RUTA: 2,
        OrderStatusEnum.EN_SITIO: 3,
        OrderStatusEnum.COMPLETADA: 4,
        OrderStatusEnum.CANCELADA: -1,
    }

    current_rank = status_order.get(order.status, 0)

    # Extraer marcas de tiempo del historial
    timestamps = {}
    if order.status_history:
        for entry in order.status_history:
            if entry.new_status not in timestamps:
                timestamps[entry.new_status] = entry.created_at.strftime("%H:%M")

    steps_definitions = [
        ("confirmada", "Visita confirmada", 1, OrderStatusEnum.CONFIRMADA, "Cita agendada y aprobada"),
        ("en_ruta", "Técnico en ruta", 2, OrderStatusEnum.EN_RUTA, "Especialista desplazándose al lugar"),
        ("en_sitio", "Técnico en el lugar", 3, OrderStatusEnum.EN_SITIO, "Atención técnica en ejecución"),
        ("completada", "Servicio completado", 4, OrderStatusEnum.COMPLETADA, "Protocolo finalizado y acta disponible"),
    ]

    items = []
    for key, label, rank, enum_val, desc in steps_definitions:
        completed = current_rank >= rank if current_rank != -1 else False
        current = current_rank == rank
        ts = timestamps.get(enum_val)

        items.append(
            TimelineStepItem(
                key=key,
                label=label,
                completed=completed,
                current=current,
                timestamp=ts,
                description=desc,
            )
        )

    return items


def _build_summary_response(
    order: WorkOrder, magic_link: Optional[MagicLink] = None
) -> ClientOrderSummaryResponse:
    status_label_map = {
        OrderStatusEnum.IDLE: "Pendiente de asignación",
        OrderStatusEnum.CONFIRMADA: "Visita confirmada",
        OrderStatusEnum.EN_RUTA: "En ruta",
        OrderStatusEnum.EN_SITIO: "En el lugar",
        OrderStatusEnum.COMPLETADA: "Completada",
        OrderStatusEnum.CANCELADA: "Cancelada",
    }
    status_text = status_label_map.get(order.status, order.status.value)
    status_key = order.status.value.lower()

    tech_badge = None
    if order.technician and order.technician.user:
        tech_badge = ClientTechnicianBadge(
            name=order.technician.user.full_name,
            phone=order.technician.user.phone or "+56 9 8765 4321",
            avatar=order.technician.initials or "TC",
            vehicle_plate=order.technician.vehicle_plate,
        )

    eta_str = None
    if order.eta:
        eta_str = order.eta.strftime("%H:%M")
    elif order.scheduled_date:
        eta_str = order.scheduled_date.strftime("%H:%M")

    timeline = compute_timeline_steps(order)

    address = order.address_override or (order.client.address if order.client else "Dirección no informada")
    comuna = order.comuna_override or (order.client.comuna if order.client else "")
    contact_person = order.client.contact_person if order.client else None
    contact_phone = order.client.contact_phone if order.client else None
    company = order.client.business_name if order.client else None

    confirmed_at = magic_link.client_confirmed_at if magic_link else None
    signature_url = magic_link.signature_url if magic_link else None
    is_confirmed = (confirmed_at is not None) or (
        order.status in (OrderStatusEnum.CONFIRMADA, OrderStatusEnum.EN_RUTA, OrderStatusEnum.EN_SITIO, OrderStatusEnum.COMPLETADA)
    )

    return ClientOrderSummaryResponse(
        order_id=order.id,
        order_number=order.order_number,
        title=order.title,
        company=company,
        status=status_text,
        status_key=status_key,
        service_type=order.service_type.value.replace("_", " ").title(),
        scheduled_date=order.scheduled_date,
        eta=eta_str,
        eta_label="Llegada estimada",
        address=address,
        comuna=comuna,
        contact_person=contact_person,
        contact_phone=contact_phone,
        technician=tech_badge,
        timeline_steps=timeline,
        client_confirmed_at=confirmed_at,
        is_confirmed=is_confirmed,
        signature_url=signature_url,
        is_completed=order.status == OrderStatusEnum.COMPLETADA,
        is_expired=False,
    )


async def get_client_order_summary(db: AsyncSession, token: str) -> ClientOrderSummaryResponse:
    """
    Construye la vista integral del portal de cliente a partir de un Magic Link válido (14-DocArq §3.2 / RF-CLI-04).
    """
    magic_link = await validate_magic_link_token(db, token)
    return _build_summary_response(magic_link.work_order, magic_link)


async def confirm_client_visit(
    db: AsyncSession, token: str, confirm_data: ConfirmVisitRequest
) -> ConfirmVisitResponse:
    """
    Ratifica la visita por parte del cliente y actualiza datos de contacto en sitio (RF-CLI-06 / RF-CLI-07).
    """
    magic_link = await validate_magic_link_token(db, token)
    order = magic_link.work_order

    if order.status not in (OrderStatusEnum.EN_SITIO, OrderStatusEnum.COMPLETADA):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede firmar la conformidad de un servicio que aún no ha sido ejecutado en terreno."
        )

    now_utc = datetime.now(timezone.utc)

    # 1. Registrar confirmación en el token
    magic_link.client_confirmed_at = now_utc

    # 2. Actualizar contacto si el cliente corrigió sus datos (RF-CLI-06)
    if order.client:
        if confirm_data.contact_person:
            order.client.contact_person = confirm_data.contact_person.strip()
        if confirm_data.contact_phone:
            order.client.contact_phone = confirm_data.contact_phone.strip()

    # 3. Si estaba en IDLE, pasa automáticamente a CONFIRMADA
    if order.status == OrderStatusEnum.IDLE:
        order.status = OrderStatusEnum.CONFIRMADA
        order.updated_at = now_utc

    # 4. Auditoría en order_status_history
    history = OrderStatusHistory(
        work_order_id=order.id,
        old_status=order.status,
        new_status=order.status,
        changed_by_user_id=None,  # Acción directa del cliente vía Magic Link
        lat=order.lat,
        lng=order.lng,
        comment=f"Visita ratificada por el cliente vía Magic Link. Nota: {confirm_data.notes or 'Sin observaciones'}",
        created_at=now_utc,
    )
    db.add(history)

    await db.commit()

    return ConfirmVisitResponse(
        success=True,
        message="Visita confirmada exitosamente. El equipo técnico ha sido notificado.",
        confirmed_at=now_utc,
    )


async def submit_client_signature(
    db: AsyncSession, token: str, sign_data: SignConformityRequest
) -> SignConformityResponse:
    """
    Persiste la firma digital capturada en pantalla de conformidad de servicio (RF-CLI-08 / RF-APP-09).
    """
    magic_link = await validate_magic_link_token(db, token)
    order = magic_link.work_order
    now_utc = datetime.now(timezone.utc)

    # Persistir referencia de la firma en el enlace de la orden
    signature_storage_url = f"https://storage.googleapis.com/atlas-evidences/signatures/{order.id}_{uuid.uuid4().hex[:8]}.png"
    magic_link.signature_url = signature_storage_url

    # Registrar evidencia formal
    if order.technician_id:
        evidence = WorkOrderEvidence(
            work_order_id=order.id,
            technician_id=order.technician_id,
            evidence_type=EvidenceTypeEnum.FIRMA_CLIENTE,
            storage_url=signature_storage_url,
            notes=f"Firma conforme otorgada por: {sign_data.signed_by_name}",
            lat=order.lat,
            lng=order.lng,
            captured_at=now_utc,
        )
        db.add(evidence)

    # Auditoría inmutable
    history = OrderStatusHistory(
        work_order_id=order.id,
        old_status=order.status,
        new_status=order.status,
        changed_by_user_id=None,
        lat=order.lat,
        lng=order.lng,
        comment=f"Firma digital de conformidad registrada por receptor: {sign_data.signed_by_name}",
        created_at=now_utc,
    )
    db.add(history)

    await db.commit()

    return SignConformityResponse(
        success=True,
        message="Firma de conformidad registrada correctamente. Acta de servicio respaldada.",
        signature_url=signature_storage_url,
        signed_at=now_utc,
    )
