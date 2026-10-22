import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_active_user, require_role
from app.models.user import User
from app.models.work_order import WorkOrder
from app.models.enums import UserRoleEnum, OrderStatusEnum, OrderPriorityEnum, ServiceTypeEnum
from app.schemas.work_order import (
    WorkOrderCreate,
    WorkOrderStatusUpdate,
    WorkOrderAssign,
    WorkOrderResponse,
    WorkOrderListResponse,
    DispatchKPIsResponse,
    SyncBatchRequest,
    SyncBatchResponse,
    ClientSummary,
    TechnicianSummary,
    TechnicianCreate,
    OrderStatusHistoryResponse,
)
from app.services.order_service import (
    list_orders,
    get_order_by_id,
    create_order,
    update_order_status,
    assign_technician,
    process_offline_sync_batch,
    get_dispatch_kpis,
    list_technicians,
    list_clients,
    create_technician,
    toggle_technician_availability,
)

router = APIRouter()


def build_order_response(order: WorkOrder) -> WorkOrderResponse:
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
        )

    # Buscar token de Magic Link activo si existe (regla: a lo sumo 1 activo y vigente)
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

    # Mapeo de historial
    history_responses = [
        OrderStatusHistoryResponse.model_validate(h) for h in (order.status_history or [])
    ]

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
        lat=order.lat,
        lng=order.lng,
        tag=order.tag,
        started_at=order.started_at,
        completed_at=order.completed_at,
        created_by=order.created_by,
        created_at=order.created_at,
        updated_at=order.updated_at,
        client=client_summary,
        technician_summary=tech_summary,
        active_magic_link_token=active_token,
        status_history=history_responses,
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

    items = [build_order_response(o) for o in orders]
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


@router.get(
    "/{order_id}",
    response_model=WorkOrderResponse,
    summary="Detalle de una orden técnica",
    description="Obtiene la ficha técnica completa con cliente, técnico asignado, historial inmutable y token de Magic Link.",
)
async def get_order(
    order_id: uuid.UUID,
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
    return build_order_response(order)


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
    "/{order_id}/status",
    response_model=WorkOrderResponse,
    summary="Actualizar estado operativo",
    description="Transición atómica de estado (En Ruta, En Sitio, Completada, etc.). Registra coordenadas GPS y estampa de tiempo en el historial (RF-APP-05 / RNF-DIS-05).",
)
async def update_status(
    order_id: uuid.UUID,
    status_update: WorkOrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
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
