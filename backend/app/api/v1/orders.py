import uuid
import json
import urllib.request
import urllib.parse
import logging
from datetime import datetime, timezone
from typing import Optional, List, Union
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.api.deps import get_current_active_user, require_role
from app.models.user import User
from app.models.client import Client
from app.models.work_order import WorkOrder
from app.models.enums import UserRoleEnum, OrderStatusEnum, OrderPriorityEnum, ServiceTypeEnum, EvidenceTypeEnum
from app.services.storage_service import generate_presigned_download_url
from app.schemas.work_order import (
    WorkOrderCreate,
    WorkOrderUpdate,
    WorkOrderStatusUpdate,
    WorkOrderAssign,
    WorkOrderLocationUpdate,
    WorkOrderLocationResponse,
    TechnicianLocationSummary,
    WorkOrderResponse,
    WorkOrderListResponse,
    DispatchKPIsResponse,
    SyncBatchRequest,
    SyncBatchResponse,
    ClientSummary,
    TechnicianSummary,
    TechnicianCreate,
    OrderStatusHistoryResponse,
    OrderActivityLogItem,
    OrderActivityLogPaginatedResponse,
    WorkOrderItemResponse,
    AuditorSummary,
    AuditApprovalRequest,
    MagicLinkDetailSummary,
    ClientContactEmailUpdate,
    ClientUpdate,
)
from app.services.order_service import (
    list_orders,
    get_order_by_id,
    approve_order_audit,
    create_order,
    update_order,
    update_order_status,
    update_technician_order_location,
    list_technicians_locations,
    assign_technician,
    process_offline_sync_batch,
    get_dispatch_kpis,
    list_technicians,
    list_clients,
    create_technician,
    toggle_technician_availability,
    get_recent_activity_log,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def build_order_response(order: WorkOrder, include_token: bool = False) -> WorkOrderResponse:
    """Construye un DTO WorkOrderResponse a partir de la entidad ORM con relaciones cargadas."""
    # Mapeo de cliente
    client_summary = None
    if order.client:
        client_summary = ClientSummary.model_validate(order.client)

    # Mapeo de técnico
    tech_summary = None
    if order.technician and order.technician.user:
        tech_summary = TechnicianSummary(
            id=order.technician.id,
            full_name=order.technician.user.full_name,
            rut=order.technician.rut,
            initials=order.technician.initials,
            phone=order.technician.user.phone,
            vehicle_plate=order.technician.vehicle_plate,
            is_available=order.technician.is_available,
            current_lat=order.technician.current_lat,
            current_lng=order.technician.current_lng,
            last_location_at=order.technician.last_location_at,
        )

    # Mapeo de auditor
    auditor_summary = None
    if getattr(order, "auditor", None):
        auditor_summary = AuditorSummary(
            id=order.auditor.id,
            full_name=order.auditor.full_name,
            email=order.auditor.email,
            role=(
                order.auditor.role.value
                if hasattr(order.auditor.role, "value")
                else str(order.auditor.role)
            ),
        )

    # Trazabilidad de firma real de la orden (evidencias FIRMA_CLIENTE o MagicLink previo)
    order_signature_key = None
    order_signed_at = None
    order_signed_by = None

    if getattr(order, "evidences", None):
        for ev in order.evidences:
            if ev.evidence_type == EvidenceTypeEnum.FIRMA_CLIENTE and ev.storage_url and ev.storage_url.strip():
                order_signature_key = ev.storage_url.strip()
                order_signed_at = ev.captured_at
                if ev.notes and "Firma conforme otorgada por:" in ev.notes:
                    order_signed_by = ev.notes.split("Firma conforme otorgada por:", 1)[1].strip()
                break

    if not order_signature_key and getattr(order, "magic_links", None):
        for ml in order.magic_links:
            if ml.signature_url and ml.signature_url.strip():
                order_signature_key = ml.signature_url.strip()
                order_signed_at = ml.used_at or ml.created_at
                break

    if not order_signed_by and getattr(order, "status_history", None):
        for h in order.status_history:
            if h.comment and "Firma digital de conformidad registrada por receptor:" in h.comment:
                order_signed_by = h.comment.split("Firma digital de conformidad registrada por receptor:", 1)[1].strip()
                if not order_signed_at and h.created_at:
                    order_signed_at = h.created_at
                break

    if order_signed_at and order_signed_at.tzinfo is None:
        order_signed_at = order_signed_at.replace(tzinfo=timezone.utc)

    has_signature = bool(order_signature_key)
    sig_download_url = (
        generate_presigned_download_url(order_signature_key)
        if order_signature_key
        else None
    )

    # Buscar token de Magic Link activo solo si se solicita expresamente (P1)
    # y construir MagicLinkDetailSummary para administración y dashboard
    active_token = None
    magic_link_detail = None
    if order.magic_links:
        now_utc = datetime.now(timezone.utc)
        sorted_links = sorted(
            order.magic_links,
            key=lambda l: l.created_at or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
        if include_token:
            for ml in sorted_links:
                if ml.is_active and ml.expires_at > now_utc:
                    active_token = ml.token
                    break

        latest_ml = sorted_links[0] if sorted_links else None
        if latest_ml:
            if not latest_ml.is_active:
                l_status = "REVOCADO"
            elif latest_ml.expires_at <= now_utc:
                l_status = "VENCIDO"
            else:
                l_status = "VIGENTE"

            if order.status in (OrderStatusEnum.COMPLETADA, OrderStatusEnum.CANCELADA):
                p_mode = "Resumen final"
            elif order.status == OrderStatusEnum.EN_SITIO:
                p_mode = "Atención en sitio"
            else:
                p_mode = "Seguimiento activo"

            portal_url_val = (
                f"{settings.FRONTEND_PORTAL_URL}/{latest_ml.token}"
                if (include_token and latest_ml.token)
                else None
            )

            magic_link_detail = MagicLinkDetailSummary(
                id=latest_ml.id,
                token=latest_ml.token if include_token else None,
                portal_url=portal_url_val,
                is_active=latest_ml.is_active,
                expires_at=latest_ml.expires_at,
                created_at=latest_ml.created_at,
                link_status=l_status,
                portal_mode=p_mode,
                has_signature=has_signature,
                signature_url=sig_download_url,
                signed_at=order_signed_at,
                signed_by_name=order_signed_by,
            )

    # Mapeo de historial
    history_responses = []
    for h in (order.status_history or []):
        u_name = h.changed_by_user.full_name if h.changed_by_user else None
        u_role = (
            h.changed_by_user.role.value
            if (h.changed_by_user and hasattr(h.changed_by_user.role, "value"))
            else (str(h.changed_by_user.role) if h.changed_by_user else None)
        )
        history_responses.append(
            OrderStatusHistoryResponse(
                id=h.id,
                old_status=h.old_status,
                new_status=h.new_status,
                changed_by_user_id=h.changed_by_user_id,
                changed_by_name=u_name,
                changed_by_role=u_role,
                lat=h.lat,
                lng=h.lng,
                comment=h.comment,
                created_at=h.created_at,
            )
        )

    # Resolver coordenadas con fallback de cliente si la orden no tiene coordenadas directas
    client_lat = getattr(order.client, "lat", None) if getattr(order, "client", None) else None
    client_lng = getattr(order.client, "lng", None) if getattr(order, "client", None) else None
    resolved_lat = order.lat if order.lat is not None else client_lat
    resolved_lng = order.lng if order.lng is not None else client_lng

    return WorkOrderResponse(
        id=order.id,
        order_number=order.order_number,
        title=order.title,
        description=order.description,
        service_type=order.service_type,
        priority=order.priority,
        status=order.status,
        client_id=order.client_id,
        technician_id=order.technician_id,
        scheduled_date=order.scheduled_date,
        eta=order.eta,
        address_override=order.address_override,
        comuna_override=order.comuna_override,
        lat=resolved_lat,
        lng=resolved_lng,
        tag=order.tag,
        started_at=order.started_at,
        completed_at=order.completed_at,
        created_by=order.created_by,
        created_at=order.created_at,
        updated_at=order.updated_at,
        is_audited=bool(getattr(order, "is_audited", False)),
        audited_at=getattr(order, "audited_at", None),
        audited_by_user_id=getattr(order, "audited_by_user_id", None),
        auditor=auditor_summary,
        audit_notes=getattr(order, "audit_notes", None),
        has_signature=has_signature,
        is_signed=has_signature,
        signature_url=sig_download_url,
        signed_at=order_signed_at,
        signed_by_name=order_signed_by,
        client=client_summary,
        technician_summary=tech_summary,
        active_magic_link_token=active_token,
        magic_link_detail=magic_link_detail,
        status_history=history_responses,
        items=[
            WorkOrderItemResponse(
                id=it.id,
                work_order_id=it.work_order_id,
                sim_card_id=it.sim_card_id,
                equipment_id=it.equipment_id,
                action_type=it.action_type,
                created_at=it.created_at,
                sim_iccid=it.sim_card.iccid if getattr(it, 'sim_card', None) else None,
                equipment_serial=it.equipment.serial_number if getattr(it, 'equipment', None) else None,
                equipment_model=it.equipment.model if getattr(it, 'equipment', None) else None,
                equipment_brand=it.equipment.brand if getattr(it, 'equipment', None) else None,
            )
            for it in (order.items or [])
        ] if getattr(order, 'items', None) else [],
    )


@router.get(
    "",
    response_model=WorkOrderListResponse,
    summary="Listar órdenes de trabajo",
    description="Retorna listado paginado y filtrable por estado, prioridad, técnico, cliente o texto de búsqueda (RF-BO-10 / 14-DocArq §3.2).",
)
async def get_orders(
    status: Optional[OrderStatusEnum] = Query(None, description="Filtrar por estado del Kanban"),
    priority: Optional[OrderPriorityEnum] = Query(None, description="Filtrar por prioridad SLA"),
    service_type: Optional[ServiceTypeEnum] = Query(None, description="Filtrar por tipología de servicio"),
    technician_id: Optional[uuid.UUID] = Query(None, description="Filtrar por técnico asignado"),
    client_id: Optional[uuid.UUID] = Query(None, description="Filtrar por cliente"),
    search: Optional[str] = Query(None, description="Búsqueda por #OT, título, tag o dirección"),
    include_magic_tokens: bool = Query(False, description="Incluir tokens de Magic Link en texto plano (restringido a vistas autorizadas)"),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(20, ge=1, le=100, description="Elementos por página"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Consulta de órdenes para Backoffice y App Móvil."""
    # Si el usuario es técnico y no especifica filtro de técnico, restringir a su hoja de ruta (RF-APP-02)
    effective_tech_id = technician_id
    if current_user.role == UserRoleEnum.TECNICO and not effective_tech_id:
        effective_tech_id = current_user.id

    orders, total = await list_orders(
        db=db,
        status_filter=status,
        priority_filter=priority,
        service_type_filter=service_type,
        technician_id=effective_tech_id,
        client_id=client_id,
        search=search,
        page=page,
        size=size,
    )

    items = [build_order_response(o, include_token=include_magic_tokens) for o in orders]
    pages = (total + size - 1) // size if total > 0 else 1

    return WorkOrderListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get(
    "/kpis",
    response_model=DispatchKPIsResponse,
    summary="KPIs del Tablero de Despacho",
    description="Retorna métricas consolidadas en tiempo real: órdenes activas, técnicos en campo, tasa de SIMs y distribución por estado para el Donut Chart (RF-BO-05 / RNF-REN-02).",
)
async def get_kpis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Métricas en tiempo real para el Dispatch Board."""
    return await get_dispatch_kpis(db)


@router.get(
    "/technicians",
    response_model=List[TechnicianSummary],
    summary="Listar técnicos disponibles",
    description="Retorna el listado de técnicos registrados en base de datos para asignación de órdenes.",
)
async def get_technicians(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Consulta de técnicos para asignación de OT."""
    return await list_technicians(db)


@router.get(
    "/technicians/locations",
    response_model=List[TechnicianLocationSummary],
    summary="Telemetría cartográfica de técnicos en terreno",
    description="Retorna ubicaciones GPS activas, órdenes vinculadas y estados operativos de técnicos para el tablero de despacho.",
)
async def get_technicians_locations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Telemetría para renderizado en mapa Leaflet del Backoffice."""
    return await list_technicians_locations(db)


@router.post(
    "/technicians",
    response_model=TechnicianSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo técnico",
    description="Da de alta a un nuevo técnico creando su cuenta con rol TECNICO y credenciales para la app móvil.",
)
async def register_technician(
    tech_in: TechnicianCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Alta de técnico en terreno."""
    return await create_technician(db=db, tech_in=tech_in)


@router.patch(
    "/technicians/{technician_id}/toggle-availability",
    response_model=TechnicianSummary,
    summary="Alternar disponibilidad de técnico",
    description="Cambia el estado de disponibilidad del técnico (disponible en campo / no disponible).",
)
async def toggle_availability(
    technician_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Alternar disponibilidad de técnico."""
    return await toggle_technician_availability(db=db, technician_id=technician_id)



@router.get(
    "/clients",
    response_model=List[ClientSummary],
    summary="Listar clientes registrados",
    description="Retorna el listado de clientes en base de datos para creación y filtrado de órdenes.",
)
async def get_clients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Consulta de clientes registrados."""
    return await list_clients(db)


@router.patch(
    "/clients/{client_id}",
    response_model=ClientSummary,
    summary="Actualizar datos de contacto de un cliente",
    description="Permite modificar el correo y datos de contacto de un cliente registrado en Neon. Restringido a Coordinadores y Administradores.",
)
async def update_client_contact(
    client_id: uuid.UUID,
    payload: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Actualización de datos de un cliente."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client_obj = result.scalar_one_or_none()
    if not client_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cliente con ID {client_id} no encontrado",
        )

    if payload.contact_email is not None:
        client_obj.contact_email = str(payload.contact_email).strip().lower()
    if payload.contact_person is not None:
        client_obj.contact_person = payload.contact_person.strip()
    if payload.contact_phone is not None:
        client_obj.contact_phone = payload.contact_phone.strip()

    client_obj.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(client_obj)
    return ClientSummary.model_validate(client_obj)


@router.get(
    "/activity-log",
    response_model=Union[OrderActivityLogPaginatedResponse, List[OrderActivityLogItem]],
    summary="Bitácora de actividad reciente",
    description="Retorna las transiciones de estado y eventos registrados reales en order_status_history (RF-BO-12).",
)
async def get_activity_log(
    page: Optional[int] = Query(None, ge=1, description="Número de página para paginación"),
    size: Optional[int] = Query(None, ge=1, le=100, description="Cantidad de registros por página"),
    limit: int = Query(50, ge=1, le=100, description="Cantidad máxima de eventos (modo sin paginar)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Consulta de bitácora de actividad reciente verificable con soporte de paginación."""
    return await get_recent_activity_log(db=db, limit=limit, page=page, size=size)


@router.get(
    "/geocode",
    summary="Geocodificar dirección a coordenadas",
    description="Consulta el servicio de geocodificación abierta para obtener latitud y longitud a partir de una dirección.",
)
async def geocode_address(
    query: str = Query(..., min_length=2, description="Dirección a geolocalizar"),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Geocodifica una dirección usando el servicio abierto de OpenStreetMap Nominatim."""
    clean_query = query.strip()
    if not clean_query:
        return {
            "success": False,
            "lat": None,
            "lng": None,
            "error": "Por favor ingresa una dirección antes de buscar en el mapa.",
        }

    search_term = clean_query if "chile" in clean_query.lower() else f"{clean_query}, Chile"
    encoded = urllib.parse.quote(search_term)
    url = f"https://nominatim.openstreetmap.org/search?q={encoded}&format=json&limit=3&countrycodes=cl"

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "AtlasFSM/1.0 (soporte@theatlasops.cl)", "Accept": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and len(data) > 0:
                first = data[0]
                return {
                    "success": True,
                    "lat": float(first["lat"]),
                    "lng": float(first["lon"]),
                    "display_name": first.get("display_name", ""),
                }
            return {
                "success": False,
                "lat": None,
                "lng": None,
                "error": "No se pudo localizar la dirección especificada. Por favor verifica la calle, número y comuna, o ubica el marcador manualmente en el mapa.",
            }
    except Exception as e:
        logger.warning("Fallo al contactar servicio de geocodificación: %s", str(e))
        return {
            "success": False,
            "lat": None,
            "lng": None,
            "error": "No se pudo conectar con el servicio de geolocalización. Puedes ubicar el marcador manualmente en el mapa.",
        }


@router.get(
    "/{order_id}",
    response_model=WorkOrderResponse,
    summary="Detalle de una orden técnica",
    description="Obtiene la ficha técnica completa con cliente, técnico asignado, historial inmutable y token de Magic Link.",
)
async def get_order(
    order_id: uuid.UUID,
    include_magic_token: bool = Query(False, description="Incluir token de Magic Link en texto plano"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Consulta ficha técnica individual."""
    order = await get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden de trabajo con ID {order_id} no encontrada"
        )
    return build_order_response(order, include_token=include_magic_token)


@router.post(
    "",
    response_model=WorkOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear nueva orden de trabajo",
    description="Crea un ticket en el sistema asociando cliente, tipología y ventana horaria. Emite un Magic Link automáticamente (RF-BO-01 / 14-DocArq §3.3).",
)
async def create_new_order(
    order_in: WorkOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Alta de orden de trabajo técnica."""
    created = await create_order(db, order_in, creator_user=current_user)
    return build_order_response(created)


@router.patch(
    "/{order_id}",
    response_model=WorkOrderResponse,
    summary="Actualizar orden de trabajo",
    description="Permite modificar dirección, coordenadas geográficas (lat/lng), título y datos técnicos de una orden existente.",
)
async def update_work_order_endpoint(
    order_id: uuid.UUID,
    order_update: WorkOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Actualización de datos y coordenadas de la orden."""
    updated = await update_order(db, order_id, order_update, current_user=current_user)
    return build_order_response(updated)


@router.patch(
    "/{order_id}/client-email",
    response_model=WorkOrderResponse,
    summary="Actualizar correo de contacto del cliente de la orden",
    description="Actualiza en Neon el correo principal de contacto del cliente asociado a la orden de trabajo. Restringido a Coordinadores y Administradores.",
)
async def update_order_client_email(
    order_id: uuid.UUID,
    payload: ClientContactEmailUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Actualización del correo del cliente vinculado a una orden."""
    order = await get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden de trabajo con ID {order_id} no encontrada",
        )
    if not order.client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La orden de trabajo no tiene un cliente asociado",
        )

    order.client.contact_email = str(payload.contact_email).strip().lower()
    order.client.updated_at = datetime.now(timezone.utc)
    order.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(order.client)
    return build_order_response(order)


@router.patch(
    "/{order_id}/status",
    response_model=WorkOrderResponse,
    summary="Actualizar estado operativo",
    description="Transición atómica de estado (En Ruta, En Sitio, Completada, etc.). Registra coordenadas GPS y estampa de tiempo en el historial (RF-APP-05 / RNF-DIS-05).",
)
async def update_status(
    order_id: uuid.UUID,
    status_update: WorkOrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.ADMIN, UserRoleEnum.COORDINADOR, UserRoleEnum.TECNICO])),
):
    """Actualización del ciclo de vida de la orden."""
    updated = await update_order_status(db, order_id, status_update, current_user=current_user)
    return build_order_response(updated)


@router.patch(
    "/{order_id}/assign",
    response_model=WorkOrderResponse,
    summary="Asignar técnico a orden",
    description="Asigna un técnico de terreno y opcionalmente hora estimada de llegada (ETA). Pasa la orden a CONFIRMADA si estaba en IDLE (RF-BO-03 / RF-BO-04).",
)
async def assign_tech(
    order_id: uuid.UUID,
    assign_data: WorkOrderAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Asignación de técnico responsable."""
    assigned = await assign_technician(db, order_id, assign_data, current_user=current_user)
    return build_order_response(assigned)


@router.post(
    "/sync-batch",
    response_model=SyncBatchResponse,
    summary="Sincronización masiva offline (PWA)",
    description="Procesa en lote todas las mutaciones realizadas en modo desconectado acumuladas en IndexedDB (cambios de estado, checklists dBm y firmas) bajo transacción ACID en menos de 1,5 segundos (RF-API-11 / RNF-REN-05).",
)
async def sync_batch(
    batch_request: SyncBatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Ingesta masiva para la PWA de campo."""
    return await process_offline_sync_batch(
        db=db, batch_request=batch_request, technician_user=current_user
    )

@router.post(
    "/{order_id}/audit-approve",
    response_model=WorkOrderResponse,
    summary="Aprobar y cerrar auditoría administrativa",
    description="Valida evidencias y firma digital, y persiste la aprobación y cierre formal de la orden de trabajo por parte de coordinación o administración (P2 / P3).",
)
async def audit_approve_order(
    order_id: uuid.UUID,
    payload: Optional[AuditApprovalRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Cierre administrativo persistente de auditoría."""
    notes = payload.notes if payload else None
    approved = await approve_order_audit(
        db=db,
        order_id=order_id,
        notes=notes,
        current_user=current_user,
    )
    return build_order_response(approved, include_token=False)


@router.post(
    "/{order_id}/location",
    response_model=WorkOrderLocationResponse,
    summary="Registrar telemetría GPS del técnico en ruta",
    description="Permite a la app móvil del técnico reportar coordenadas periódicas mientras la orden esté en EN_RUTA (RF-APP-05 / RF-CLI-05).",
)
async def record_order_location(
    order_id: uuid.UUID,
    location_data: WorkOrderLocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Actualización de posición GPS durante el desplazamiento en terreno."""
    return await update_technician_order_location(
        db=db,
        order_id=order_id,
        location_data=location_data,
        current_user=current_user,
    )
