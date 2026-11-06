import struct
import uuid
import base64
import inspect
import logging
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
    ClientTechnicianLocation,
    ClientTrackingLocationResponse,
    ClientOrderSummaryResponse,
    ConfirmVisitRequest,
    ConfirmVisitResponse,
    SignConformityRequest,
    SignConformityResponse,
)
from app.services.storage_service import (
    upload_file_to_storage,
    generate_presigned_download_url,
)

logger = logging.getLogger(__name__)


async def validate_magic_link_token(db: AsyncSession, token: str) -> MagicLink:
    """
    Valida el registro, vigencia y estado del Magic Link (RNF-SEG-03 / RF-CLI-03 / RF-CLI-09).
    Si el token venció o fue revocado, arroja HTTP 410 (Gone).
    Carga anticipadamente el grafo completo de la orden para evitar inconsistencias de firma o auditoría.
    """
    clean_token = token.strip()
    result = await db.execute(
        select(MagicLink)
        .options(
            selectinload(MagicLink.work_order).options(
                selectinload(WorkOrder.client),
                selectinload(WorkOrder.technician).selectinload(Technician.user),
                selectinload(WorkOrder.status_history),
                selectinload(WorkOrder.evidences),
                selectinload(WorkOrder.magic_links),
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
    contrastándolos estrictamente con el historial de eventos reales en PostgreSQL.
    No marca como completadas etapas sin eventos verificables ni inventa fechas/horas.
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

    # Extraer marcas de tiempo de eventos reales del historial
    timestamps = {}
    if getattr(order, "status_history", None):
        for entry in order.status_history:
            if entry.new_status and entry.new_status not in timestamps and entry.created_at:
                timestamps[entry.new_status] = entry.created_at.strftime("%H:%M")

    # Si la orden está completada y no hay timestamp registrado en history, usar completed_at real
    completed_at_val = getattr(order, "completed_at", None)
    if order.status == OrderStatusEnum.COMPLETADA and completed_at_val and OrderStatusEnum.COMPLETADA not in timestamps:
        timestamps[OrderStatusEnum.COMPLETADA] = completed_at_val.strftime("%H:%M")

    steps_definitions = [
        ("confirmada", "Visita confirmada", 1, OrderStatusEnum.CONFIRMADA, "Cita agendada y aprobada"),
        ("en_ruta", "Técnico en ruta", 2, OrderStatusEnum.EN_RUTA, "Especialista desplazándose al lugar"),
        ("en_sitio", "Técnico en el lugar", 3, OrderStatusEnum.EN_SITIO, "Atención técnica en ejecución"),
        ("completada", "Servicio completado", 4, OrderStatusEnum.COMPLETADA, "Protocolo finalizado y acta disponible"),
    ]

    items = []
    for key, label, rank, enum_val, desc in steps_definitions:
        is_current = (current_rank == rank)
        has_timestamp = enum_val in timestamps
        ts = timestamps.get(enum_val)

        if is_current:
            is_completed = (order.status == OrderStatusEnum.COMPLETADA)
            step_desc = desc
        elif rank < current_rank:
            # Hito previo: solo completado si ocurrió un evento real registrado
            is_completed = has_timestamp
            step_desc = desc if is_completed else "Etapa no registrada en terreno"
        else:
            is_completed = False
            step_desc = desc

        items.append(
            TimelineStepItem(
                key=key,
                label=label,
                completed=is_completed,
                current=is_current,
                timestamp=ts,
                description=step_desc,
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

    # ── Datos reales del técnico (sin inventar teléfonos ni datos ficticios) ──
    tech_badge = None
    if order.technician and order.technician.user:
        tech_user = order.technician.user
        tech_badge = ClientTechnicianBadge(
            name=tech_user.full_name,
            phone=tech_user.phone or "No disponible",
            avatar=getattr(order.technician, "initials", None) or "TC",
            vehicle_plate=getattr(order.technician, "vehicle_plate", None) or None,
            credential_id=getattr(order.technician, "rut", None) or None,
            rut=getattr(order.technician, "rut", None) or None,
        )

    eta_str = None
    if order.status == OrderStatusEnum.COMPLETADA:
        eta_str = None
        eta_label = "Servicio finalizado"
    elif order.eta:
        eta_str = order.eta.strftime("%H:%M")
        eta_label = "Llegada estimada"
    elif order.scheduled_date:
        eta_str = order.scheduled_date.strftime("%H:%M")
        eta_label = "Llegada estimada"
    else:
        eta_str = None
        eta_label = "Llegada estimada"

    timeline = compute_timeline_steps(order)

    address = order.address_override or (order.client.address if order.client else "Dirección no informada")
    comuna = order.comuna_override or (order.client.comuna if order.client else "")
    contact_person = order.client.contact_person if order.client else None
    contact_phone = order.client.contact_phone if order.client else None
    company = order.client.business_name if order.client else None

    # ── Trazabilidad de firma real de la orden (independiente del MagicLink puntual) ──
    order_signature_key = None
    order_signed_at = None
    order_signed_by = None

    # 1. Buscar en evidencias oficiales FIRMA_CLIENTE
    if getattr(order, "evidences", None):
        for ev in order.evidences:
            if ev.evidence_type == EvidenceTypeEnum.FIRMA_CLIENTE and ev.storage_url and ev.storage_url.strip():
                order_signature_key = ev.storage_url.strip()
                order_signed_at = ev.captured_at
                if ev.notes and "Firma conforme otorgada por:" in ev.notes:
                    order_signed_by = ev.notes.split("Firma conforme otorgada por:", 1)[1].strip()
                break

    # 2. Buscar en enlaces previos de la orden si no estaba en evidencias
    if not order_signature_key and getattr(order, "magic_links", None):
        for ml in order.magic_links:
            if ml.signature_url and ml.signature_url.strip():
                order_signature_key = ml.signature_url.strip()
                order_signed_at = ml.used_at or ml.created_at
                break

    # 3. Revisar el MagicLink actual en consulta
    if not order_signature_key and magic_link and magic_link.signature_url and magic_link.signature_url.strip():
        order_signature_key = magic_link.signature_url.strip()
        order_signed_at = magic_link.used_at or magic_link.created_at

    # 4. Rescatar nombre de receptor en el historial si no estaba en notas de evidencia
    if not order_signed_by and getattr(order, "status_history", None):
        for h in order.status_history:
            if h.comment and "Firma digital de conformidad registrada por receptor:" in h.comment:
                order_signed_by = h.comment.split("Firma digital de conformidad registrada por receptor:", 1)[1].strip()
                if not order_signed_at and h.created_at:
                    order_signed_at = h.created_at
                break

    confirmed_at = magic_link.client_confirmed_at if magic_link else None
    signature_url = (
        generate_presigned_download_url(order_signature_key)
        if order_signature_key
        else None
    )
    is_confirmed = (confirmed_at is not None)
    is_signed = bool(order_signature_key)

    is_audited = bool(getattr(order, "is_audited", False))
    audited_at = getattr(order, "audited_at", None)
    audit_notes = getattr(order, "audit_notes", None)

    # ── Coordenadas de orden y ubicación en vivo del técnico (RF-CLI-05) ──
    client_lat = getattr(order.client, "lat", None) if getattr(order, "client", None) else None
    client_lng = getattr(order.client, "lng", None) if getattr(order, "client", None) else None
    order_lat = getattr(order, "lat", None) if getattr(order, "lat", None) is not None else client_lat
    order_lng = getattr(order, "lng", None) if getattr(order, "lng", None) is not None else client_lng

    technician_loc = None
    # Privacidad estricta: ÚNICAMENTE exponer ubicación si la orden está EN_RUTA
    order_tech = getattr(order, "technician", None)
    if order.status == OrderStatusEnum.EN_RUTA and order_tech:
        tech_lat = getattr(order_tech, "current_lat", None)
        tech_lng = getattr(order_tech, "current_lng", None)
        real_last_gps = getattr(order_tech, "last_location_at", None)
        # No mostrar coordenadas antiguas sin timestamp real de recepción
        if tech_lat is not None and tech_lng is not None and real_last_gps is not None:
            now_utc = datetime.now(timezone.utc)
            is_recent = 0 <= (now_utc - real_last_gps).total_seconds() <= 1800
            technician_loc = ClientTechnicianLocation(
                lat=tech_lat,
                lng=tech_lng,
                last_updated_at=real_last_gps,
                is_live=is_recent,
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
        completed_at=getattr(order, "completed_at", None),
        eta=eta_str,
        eta_label=eta_label,
        address=address,
        comuna=comuna,
        lat=order_lat,
        lng=order_lng,
        contact_person=contact_person,
        contact_phone=contact_phone,
        technician=tech_badge,
        technician_location=technician_loc,
        timeline_steps=timeline,
        client_confirmed_at=confirmed_at,
        is_confirmed=is_confirmed,
        signature_url=signature_url,
        is_signed=is_signed,
        signed_at=order_signed_at,
        signed_by_name=order_signed_by,
        is_audited=is_audited,
        audited_at=audited_at,
        audit_notes=audit_notes,
        is_completed=order.status == OrderStatusEnum.COMPLETADA,
        is_expired=False,
    )


async def get_client_live_tracking(db: AsyncSession, token: str) -> ClientTrackingLocationResponse:
    """
    Consulta ultraligera y segura por Magic Link para seguimiento cartográfico en vivo (RF-CLI-05).
    Retorna coordenadas solo si la orden se encuentra actualmente en estado EN_RUTA.
    Si la orden avanzó a EN_SITIO o posterior, o fue cancelada, oculta las coordenadas del técnico.
    """
    magic_link = await validate_magic_link_token(db, token)
    order = magic_link.work_order

    if order.status == OrderStatusEnum.EN_RUTA and order.technician:
        t = order.technician
        real_last_gps = getattr(t, "last_location_at", None)
        if t.current_lat is not None and t.current_lng is not None and real_last_gps is not None:
            now_utc = datetime.now(timezone.utc)
            is_recent = 0 <= (now_utc - real_last_gps).total_seconds() <= 1800
            return ClientTrackingLocationResponse(
                order_id=order.id,
                order_status=order.status.value,
                lat=t.current_lat,
                lng=t.current_lng,
                last_updated_at=real_last_gps,
                is_live=is_recent,
                message="Técnico en ruta hacia tu dirección" if is_recent else "Técnico en camino. Señal GPS en espera de actualización.",
            )
        return ClientTrackingLocationResponse(
            order_id=order.id,
            order_status=order.status.value,
            lat=None,
            lng=None,
            last_updated_at=None,
            is_live=False,
            message="Técnico en camino. Esperando señal de geolocalización.",
        )

    return ClientTrackingLocationResponse(
        order_id=order.id,
        order_status=order.status.value,
        lat=None,
        lng=None,
        last_updated_at=None,
        is_live=False,
        message="Seguimiento GPS no disponible para el estado actual de la visita.",
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
    Impide modificaciones si la orden ya cuenta con auditoría administrativa aprobada.
    """
    magic_link = await validate_magic_link_token(db, token)
    order = magic_link.work_order

    if getattr(order, "is_audited", False):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No es posible modificar datos de la visita: el servicio ya cuenta con auditoría administrativa aprobada y cerrada."
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



DISALLOWED_SIGNATURE_SUBSTRINGS = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",  # Píxel 1x1 PNG transparente / simulado
    "AAAAEAAAABCAYAAAAfFcSJ",           # Dummy base64 signature
)


def validate_and_decode_signature_image(signature_base64: str) -> bytes:
    """
    Valida rigurosamente la firma manuscrita recibida desde el canvas (RF-CLI-08 / RF-APP-09).
    - Rechaza valores vacíos o nulos.
    - Rechaza explícitamente el píxel transparente de 1x1 y firmas simuladas de prueba.
    - Valida decodificación Base64 y magic bytes de PNG.
    - Inspecciona el chunk IHDR para validar dimensiones mínimas (ancho y alto >= 10px).
    - Exige contenido binario mínimo de trazos reales (> 120 bytes).
    """
    if not signature_base64 or not signature_base64.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La firma digital es obligatoria y no puede estar vacía."
        )

    clean_sig = signature_base64.strip()

    # Rechazar explícitamente el píxel transparente de 1x1 y firmas dummy
    for marker in DISALLOWED_SIGNATURE_SUBSTRINGS:
        if marker in clean_sig:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Firma digital no válida: no se aceptan firmas simuladas ni píxeles transparentes de prueba. Debe registrar un trazo manuscrito real en el recuadro."
            )

    # Extraer parte base64 si incluye prefijo data URI
    raw_b64 = clean_sig
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1].strip()

    try:
        sig_bytes = base64.b64decode(raw_b64, validate=True)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La firma digital contiene una codificación Base64 inválida."
        )

    # Validar encabezado PNG (8 bytes: \x89PNG\r\n\x1a\n)
    if not sig_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de firma no admitido. La firma debe ser una imagen PNG generada por el recuadro de firma."
        )

    # Validar chunk IHDR (mínimo 24 bytes para leer encabezado y dimensiones)
    if len(sig_bytes) < 24 or sig_bytes[12:16] != b"IHDR":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Estructura de imagen PNG corrupta o sin encabezado IHDR."
        )

    # Extraer dimensiones de IHDR (ancho y alto son uint32 big-endian en bytes 16-24)
    width, height = struct.unpack(">II", sig_bytes[16:24])
    if width < 10 or height < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dimensiones de firma insuficientes ({width}x{height}px). Debe proporcionar un trazo manuscrito legible."
        )

    # Verificar que el binario contenga datos mínimos de trazo
    if len(sig_bytes) < 120:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trazo de firma insuficiente. Debe dibujar su firma antes de enviar la conformidad."
        )

    return sig_bytes

async def submit_client_signature(
    db: AsyncSession, token: str, sign_data: SignConformityRequest
) -> SignConformityResponse:
    """
    Persiste la firma digital capturada en pantalla de conformidad de servicio (RF-CLI-08 / RF-APP-09).
    - Bloqueo transaccional de fila para garantizar atomicidad frente a concurrencia.
    - Rechaza con HTTP 409 si el servicio ya cuenta con auditoría administrativa aprobada y cerrada.
    - Rechaza con HTTP 409 si la orden ya tiene una firma registrada (evitando firmas duplicadas o reemplazos).
    - Sube el binario a Neon Object Storage y persiste la clave en BD de forma transaccional.
    """
    magic_link = await validate_magic_link_token(db, token)
    order = magic_link.work_order

    # 1. Bloqueo transaccional de fila para atomicidad
    locked_order = order
    if hasattr(db, "execute"):
        order_stmt = select(WorkOrder).where(WorkOrder.id == order.id).with_for_update()
        exec_res = db.execute(order_stmt)
        if inspect.isawaitable(exec_res):
            locked_res = await exec_res
            if hasattr(locked_res, "scalar_one_or_none"):
                res_order = locked_res.scalar_one_or_none()
                if res_order is not None:
                    locked_order = res_order

    # 2. Impedir firmas si la orden ya está auditada y cerrada
    if getattr(locked_order, "is_audited", False):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No es posible firmar ni modificar la recepción conforme: el servicio ya cuenta con auditoría administrativa aprobada y cerrada."
        )

    # 3. Validar que la orden esté en un estado donde sea procedente firmar
    if locked_order.status not in (OrderStatusEnum.EN_SITIO, OrderStatusEnum.COMPLETADA):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede firmar la conformidad de un servicio que aún no ha sido ejecutado en terreno."
        )

    # 4. Impedir firmas duplicadas en la orden
    has_existing_sig = False
    if magic_link.signature_url and magic_link.signature_url.strip():
        has_existing_sig = True
    elif getattr(locked_order, "evidences", None):
        for ev in locked_order.evidences:
            if ev.evidence_type == EvidenceTypeEnum.FIRMA_CLIENTE and ev.storage_url and ev.storage_url.strip():
                has_existing_sig = True
                break
    elif getattr(locked_order, "magic_links", None):
        for ml in locked_order.magic_links:
            if ml.signature_url and ml.signature_url.strip():
                has_existing_sig = True
                break

    if has_existing_sig:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta orden de trabajo ya cuenta con una recepción conforme firmada digitalmente y no admite firmas duplicadas."
        )

    # 5. Validar y decodificar firma manuscrita real
    sig_bytes = validate_and_decode_signature_image(sign_data.signature_base64)

    signer_name = (sign_data.signed_by_name or "").strip()
    if not signer_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de la persona que recibe y firma la conformidad es obligatorio."
        )

    now_utc = datetime.now(timezone.utc)
    signature_key = f"signatures/{locked_order.id}_{uuid.uuid4().hex[:8]}.png"

    # Subir obligatoriamente a Neon Object Storage antes de modificar la base de datos
    try:
        upload_file_to_storage(content=sig_bytes, object_key=signature_key, content_type="image/png")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fallo al almacenar archivo de firma de la orden {locked_order.id} en Neon Storage: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al almacenar el archivo de firma en Neon Object Storage: {str(e)}"
        )

    # Guardar clave de objeto persistente en el enlace de la orden
    magic_link.signature_url = signature_key

    # Registrar evidencia formal
    if locked_order.technician_id:
        evidence = WorkOrderEvidence(
            work_order_id=locked_order.id,
            technician_id=locked_order.technician_id,
            evidence_type=EvidenceTypeEnum.FIRMA_CLIENTE,
            storage_url=signature_key,
            notes=f"Firma conforme otorgada por: {signer_name}",
            lat=locked_order.lat,
            lng=locked_order.lng,
            captured_at=now_utc,
        )
        db.add(evidence)

    # Auditoría inmutable
    history = OrderStatusHistory(
        work_order_id=locked_order.id,
        old_status=locked_order.status,
        new_status=locked_order.status,
        changed_by_user_id=None,
        lat=locked_order.lat,
        lng=locked_order.lng,
        comment=f"Firma digital de conformidad registrada por receptor: {signer_name}",
        created_at=now_utc,
    )
    db.add(history)

    await db.commit()

    # Emitir URL temporal de lectura
    presigned_url = generate_presigned_download_url(signature_key)

    return SignConformityResponse(
        success=True,
        message="Firma de conformidad registrada correctamente. Acta de servicio respaldada.",
        signature_url=presigned_url,
        signed_at=now_utc,
    )
