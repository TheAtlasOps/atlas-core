import uuid
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.work_order import WorkOrder, OrderStatusHistory, WorkOrderItem
from app.models.client import Client
from app.models.user import User, Technician
from app.models.magic_link import MagicLink
from app.models.evidence import WorkOrderEvidence
from app.models.inventory import SimCard, Equipment
from app.models.enums import OrderStatusEnum, OrderPriorityEnum, ServiceTypeEnum, EvidenceTypeEnum, SimStatusEnum, UserRoleEnum
from app.schemas.work_order import (
    WorkOrderCreate,
    WorkOrderUpdate,
    WorkOrderStatusUpdate,
    WorkOrderAssign,
    WorkOrderLocationUpdate,
    WorkOrderLocationResponse,
    TechnicianLocationSummary,
    SyncBatchRequest,
    SyncBatchResponse,
    DispatchKPIsResponse,
    TechnicianSummary,
    TechnicianCreate,
    ClientSummary,
    OrderActivityLogItem,
)
from app.services.auth_service import generate_magic_link_for_order
from app.core.security import get_password_hash


async def list_orders(
    db: AsyncSession,
    status_filter: Optional[OrderStatusEnum] = None,
    priority_filter: Optional[OrderPriorityEnum] = None,
    service_type_filter: Optional[ServiceTypeEnum] = None,
    technician_id: Optional[uuid.UUID] = None,
    client_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    page: int = 1,
    size: int = 20,
) -> Tuple[List[WorkOrder], int]:
    """
    Retorna el listado paginado y filtrable de órdenes de trabajo (RNF-REN-02 / RF-BO-10).
    Realiza carga ansiosa (selectinload) de cliente, técnico y enlaces activos.
    """
    query = select(WorkOrder).options(
        selectinload(WorkOrder.client),
        selectinload(WorkOrder.technician).selectinload(Technician.user),
        selectinload(WorkOrder.magic_links),
        selectinload(WorkOrder.status_history).selectinload(OrderStatusHistory.changed_by_user),
        selectinload(WorkOrder.items).selectinload(WorkOrderItem.sim_card),
        selectinload(WorkOrder.items).selectinload(WorkOrderItem.equipment),
        selectinload(WorkOrder.evidences),
        selectinload(WorkOrder.auditor),
    )

    conditions = []
    if status_filter:
        conditions.append(WorkOrder.status == status_filter)
    if priority_filter:
        conditions.append(WorkOrder.priority == priority_filter)
    if service_type_filter:
        conditions.append(WorkOrder.service_type == service_type_filter)
    if technician_id:
        conditions.append(WorkOrder.technician_id == technician_id)
    if client_id:
        conditions.append(WorkOrder.client_id == client_id)
    if search:
        search_term = f"%{search.strip()}%"
        conditions.append(
            or_(
                WorkOrder.order_number.ilike(search_term),
                WorkOrder.title.ilike(search_term),
                WorkOrder.tag.ilike(search_term),
                WorkOrder.address_override.ilike(search_term),
                WorkOrder.comuna_override.ilike(search_term),
            )
        )

    if conditions:
        query = query.where(and_(*conditions))

    # Conteo total para paginación
    count_query = select(func.count(WorkOrder.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Ordenación cronológica descendente y paginación
    query = query.order_by(desc(WorkOrder.created_at))
    query = query.offset((page - 1) * size).limit(size)

    result = await db.execute(query)
    orders = result.scalars().all()
    return list(orders), total


async def get_order_by_id(
    db: AsyncSession, order_id: uuid.UUID, for_update: bool = False
) -> Optional[WorkOrder]:
    """Obtiene la ficha técnica completa de una orden con todas sus relaciones."""
    query = (
        select(WorkOrder)
        .options(
            selectinload(WorkOrder.client),
            selectinload(WorkOrder.technician).selectinload(Technician.user),
            selectinload(WorkOrder.magic_links),
            selectinload(WorkOrder.status_history).selectinload(OrderStatusHistory.changed_by_user),
            selectinload(WorkOrder.items).selectinload(WorkOrderItem.sim_card),
            selectinload(WorkOrder.items).selectinload(WorkOrderItem.equipment),
            selectinload(WorkOrder.evidences),
            selectinload(WorkOrder.auditor),
        )
        .where(WorkOrder.id == order_id)
    )
    if for_update:
        query = query.with_for_update()
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_order(
    db: AsyncSession, order_in: WorkOrderCreate, creator_user: User
) -> WorkOrder:
    """
    Crea una orden técnica con validación de cliente, correlativo e inicialización de estados (RF-BO-01).
    Dispara automáticamente la generación de un Magic Link seguro (14-DocArq §3.3).
    """
    # 1. Resolver o crear cliente
    client: Optional[Client] = None
    if order_in.client_name and order_in.client_name.strip():
        clean_name = order_in.client_name.strip()
        existing_client_res = await db.execute(
            select(Client).where(Client.business_name.ilike(clean_name)).limit(1)
        )
        client = existing_client_res.scalar_one_or_none()
        if not client:
            client = Client(
                business_name=clean_name,
                contact_person=clean_name,
                contact_phone="+56 9 8000 0000",
                contact_email="contacto@cliente-atlas.cl",
                address=order_in.address_override or "Santiago, RM",
                comuna=order_in.comuna_override or "Santiago",
                region="Metropolitana",
                lat=order_in.lat,
                lng=order_in.lng,
            )
            db.add(client)
            await db.flush()

    if not client and order_in.client_id:
        client_res = await db.execute(select(Client).where(Client.id == order_in.client_id))
        client = client_res.scalar_one_or_none()

    if not client:
        # Fallback al primer cliente existente en base de datos
        first_res = await db.execute(select(Client).limit(1))
        client = first_res.scalar_one_or_none()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró un cliente válido para asociar la orden"
        )

    # 2. Generar correlativo único si no viene provisto (ej: #OT-08501)
    if not order_in.order_number:
        count_res = await db.execute(select(func.count(WorkOrder.id)))
        current_count = (count_res.scalar() or 0) + 8491
        order_number = f"#OT-{current_count:05d}"
        existing_num = await db.execute(
            select(WorkOrder.id).where(WorkOrder.order_number == order_number)
        )
        while existing_num.scalar_one_or_none() is not None:
            current_count += 1
            order_number = f"#OT-{current_count:05d}"
            existing_num = await db.execute(
                select(WorkOrder.id).where(WorkOrder.order_number == order_number)
            )
    else:
        order_number = order_in.order_number

    # 3. Validar técnico si viene provisto
    resolved_tech_id = None
    if order_in.technician_id:
        tech_res = await db.execute(
            select(Technician.id).where(Technician.id == order_in.technician_id)
        )
        if tech_res.scalar_one_or_none() is not None:
            resolved_tech_id = order_in.technician_id

    # 4. Determinar estado inicial
    initial_status = OrderStatusEnum.CONFIRMADA if resolved_tech_id else OrderStatusEnum.IDLE

    now_utc = datetime.now(timezone.utc)
    new_order = WorkOrder(
        order_number=order_number,
        title=order_in.title,
        description=order_in.description,
        service_type=order_in.service_type,
        priority=order_in.priority,
        status=initial_status,
        client_id=client.id,
        technician_id=resolved_tech_id,
        scheduled_date=order_in.scheduled_date,
        eta=order_in.eta,
        address_override=order_in.address_override or client.address,
        comuna_override=order_in.comuna_override or client.comuna,
        lat=order_in.lat if order_in.lat is not None else client.lat,
        lng=order_in.lng if order_in.lng is not None else client.lng,
        tag=order_in.tag,
        created_by=creator_user.id,
        created_at=now_utc,
    )

    db.add(new_order)
    await db.flush()  # Obtiene el UUID de la orden antes de registrar historial

    # 5. Registrar auditoría inicial inmutable (RF-BO-12)
    history_entry = OrderStatusHistory(
        work_order_id=new_order.id,
        old_status=None,
        new_status=initial_status,
        changed_by_user_id=creator_user.id,
        lat=new_order.lat,
        lng=new_order.lng,
        comment="Creación de orden de servicio",
        created_at=now_utc,
    )
    db.add(history_entry)

    await db.commit()
    await db.refresh(new_order)

    # 6. Generar Magic Link seguro para el portal cliente
    try:
        await generate_magic_link_for_order(db=db, work_order_id=new_order.id, expire_hours=48)
    except Exception:
        pass  # Si falla la emisión automática, se puede generar manualmente

    return await get_order_by_id(db, new_order.id)


async def update_order(
    db: AsyncSession,
    order_id: uuid.UUID,
    order_update: WorkOrderUpdate,
    current_user: User,
) -> WorkOrder:
    """
    Actualiza datos técnicos o de geolocalización de una orden de trabajo.
    Permite fijar o corregir dirección y coordenadas reales (lat/lng).
    """
    order = await get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden de trabajo con ID {order_id} no encontrada",
        )

    if order.is_audited:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pueden modificar datos de una orden que ya cuenta con auditoría aprobada y cerrada.",
        )

    update_dict = order_update.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(order, key, value)

    order.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return await get_order_by_id(db, order_id)


async def update_order_status(
    db: AsyncSession,
    order_id: uuid.UUID,
    status_update: WorkOrderStatusUpdate,
    current_user: User,
) -> WorkOrder:
    """
    Ejecuta una transición de estado operativa bajo transacción atómica (RNF-DIS-05).
    Registra coordenadas en order_status_history e invalida Magic Links al completarse.
    """
    order = await get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden de trabajo con ID {order_id} no encontrada"
        )

    old_status = order.status
    new_status = status_update.new_status

    # Proteger contra modificaciones en órdenes ya auditadas y cerradas
    if order.is_audited:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede modificar el estado de una orden que ya cuenta con auditoría aprobada y cerrada.",
        )

    # Validar permisos específicos de técnico en terreno
    if current_user.role == UserRoleEnum.TECNICO and order.technician_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El técnico solo puede actualizar el estado de órdenes asignadas a su perfil.",
        )

    if old_status == new_status:
        return order

    # Regla de Auditoría y Cierre: No se puede aprobar auditoría ni completar sin técnico o desde estado pendiente
    if new_status == OrderStatusEnum.COMPLETADA:
        if not order.technician_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede aprobar la auditoría ni completar la orden: no cuenta con un técnico responsable asignado."
            )
        if old_status == OrderStatusEnum.IDLE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede aprobar la auditoría de una orden que figura en estado Pendiente. Debe registrarse la atención en terreno previamente."
            )

    now_utc = datetime.now(timezone.utc)
    order.status = new_status
    order.updated_at = now_utc

    # Marcar hitos temporales
    if new_status == OrderStatusEnum.EN_SITIO and not order.started_at:
        order.started_at = now_utc
    elif new_status == OrderStatusEnum.COMPLETADA:
        order.completed_at = now_utc

    # Inactivar Magic Links si la orden culmina o se cancela (RNF-SEG-03)
    if new_status in (OrderStatusEnum.COMPLETADA, OrderStatusEnum.CANCELADA):
        for link in order.magic_links:
            link.is_active = False

    # Bitácora inmutable en order_status_history
    history = OrderStatusHistory(
        work_order_id=order.id,
        old_status=old_status,
        new_status=new_status,
        changed_by_user_id=current_user.id,
        lat=status_update.lat or order.lat,
        lng=status_update.lng or order.lng,
        comment=status_update.comment or f"Cambio de estado de {old_status.value} a {new_status.value}",
        created_at=now_utc,
    )
    db.add(history)

    await db.commit()
    await db.refresh(order)
    return await get_order_by_id(db, order.id)


async def assign_technician(
    db: AsyncSession,
    order_id: uuid.UUID,
    assign_data: WorkOrderAssign,
    current_user: User,
) -> WorkOrder:
    """Asigna o reasigna un técnico a la orden de trabajo (RF-BO-03 / RF-BO-04)."""
    order = await get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden con ID {order_id} no encontrada"
        )

    # Validar existencia del técnico
    tech_res = await db.execute(
        select(Technician).where(Technician.id == assign_data.technician_id)
    )
    technician = tech_res.scalar_one_or_none()
    if not technician:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Técnico con ID {assign_data.technician_id} no encontrado"
        )

    now_utc = datetime.now(timezone.utc)
    order.technician_id = assign_data.technician_id
    if assign_data.eta:
        order.eta = assign_data.eta

    # Si estaba en IDLE, avanza automáticamente a CONFIRMADA
    if order.status == OrderStatusEnum.IDLE:
        order.status = OrderStatusEnum.CONFIRMADA

    history = OrderStatusHistory(
        work_order_id=order.id,
        old_status=order.status,
        new_status=order.status,
        changed_by_user_id=current_user.id,
        lat=order.lat,
        lng=order.lng,
        comment=f"Asignación de técnico responsable: {technician.rut}",
        created_at=now_utc,
    )
    db.add(history)

    await db.commit()
    await db.refresh(order)
    return await get_order_by_id(db, order.id)


async def process_offline_sync_batch(
    db: AsyncSession,
    batch_request: SyncBatchRequest,
    technician_user: User,
) -> SyncBatchResponse:
    """
    Ingesta transaccional por lotes (batch sync) para la PWA de terreno (RF-API-11 / RNF-REN-05).
    Garantiza procesamiento en tiempo inferior a 1,5 segundos y consistencia ACID.
    """
    start_time = time.perf_counter()
    synced_order_ids: List[uuid.UUID] = []
    failed_count = 0

    try:
        # Bloque transaccional ACID
        for mutation in batch_request.mutations:
            # 1. Obtener la orden
            order_res = await db.execute(
                select(WorkOrder).where(WorkOrder.id == mutation.work_order_id)
            )
            order = order_res.scalar_one_or_none()
            if not order:
                failed_count += 1
                continue

            old_status = order.status
            new_status = mutation.status
            mutation_time = mutation.timestamp

            order.status = new_status
            order.updated_at = mutation_time

            if new_status == OrderStatusEnum.EN_SITIO and not order.started_at:
                order.started_at = mutation_time
            elif new_status == OrderStatusEnum.COMPLETADA:
                order.completed_at = mutation_time

            # 2. Registrar en historial inmutable
            history = OrderStatusHistory(
                work_order_id=order.id,
                old_status=old_status,
                new_status=new_status,
                changed_by_user_id=technician_user.id,
                lat=mutation.lat or order.lat,
                lng=mutation.lng or order.lng,
                comment=mutation.comment or f"Sincronización batch diferida: {new_status.value}",
                created_at=mutation_time,
            )
            db.add(history)

            # 3. Si incluye evidencias técnicas del checklist, persistirlas
            if mutation.evidence_storage_url or mutation.signal_dbm is not None:
                evidence = WorkOrderEvidence(
                    work_order_id=order.id,
                    technician_id=technician_user.id,
                    evidence_type=EvidenceTypeEnum.DIAGNOSTICO_DBM if mutation.signal_dbm else EvidenceTypeEnum.FOTO_DESPUES,
                    storage_url=mutation.evidence_storage_url or "https://storage.googleapis.com/atlas-evidences/placeholder.webp",
                    signal_dbm=mutation.signal_dbm,
                    speed_download_mbps=mutation.speed_download_mbps,
                    speed_upload_mbps=mutation.speed_upload_mbps,
                    validated_iccid=mutation.validated_iccid,
                    validated_imsi=mutation.validated_imsi,
                    notes=mutation.comment,
                    lat=mutation.lat,
                    lng=mutation.lng,
                    captured_at=mutation_time,
                )
                db.add(evidence)

            synced_order_ids.append(order.id)

        await db.commit()

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo en la persistencia del lote batch: {str(e)}"
        )

    processing_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return SyncBatchResponse(
        success=True,
        processed_count=len(synced_order_ids),
        failed_count=failed_count,
        synced_order_ids=synced_order_ids,
        processing_time_ms=processing_time_ms,
        message=f"Sincronización batch completada exitosamente en {processing_time_ms} ms (Límite RNF-REN-05: 1500 ms)."
    )


async def get_dispatch_kpis(db: AsyncSession) -> DispatchKPIsResponse:
    """Calcula las métricas agregadas en tiempo real para el Dispatch Board (RNF-REN-02)."""
    now = datetime.now(timezone.utc)

    # 1. Total órdenes activas (no completadas ni canceladas)
    active_res = await db.execute(
        select(func.count(WorkOrder.id)).where(
            WorkOrder.status.notin_([OrderStatusEnum.COMPLETADA, OrderStatusEnum.CANCELADA])
        )
    )
    active_orders = active_res.scalar() or 0

    # 2. Técnicos en campo (disponibles en plataforma)
    tech_res = await db.execute(
        select(func.count(Technician.id)).where(Technician.is_available == True)
    )
    technicians_in_field = tech_res.scalar() or 0

    # 3. Tasa de SIMs disponibles
    total_sims_res = await db.execute(select(func.count(SimCard.id)))
    total_sims = total_sims_res.scalar() or 1
    avail_sims_res = await db.execute(
        select(func.count(SimCard.id)).where(SimCard.status == SimStatusEnum.DISPONIBLE)
    )
    avail_sims = avail_sims_res.scalar() or 0
    available_sims_rate = round((avail_sims / total_sims) * 100, 1)

    # 4. Distribución por estados (mismo período y criterio para KPI y Donut Chart)
    dist_res = await db.execute(
        select(WorkOrder.status, func.count(WorkOrder.id)).group_by(WorkOrder.status)
    )
    status_distribution: Dict[str, int] = {s.value: 0 for s in OrderStatusEnum}
    for row in dist_res.all():
        status_distribution[row[0].value] = row[1]

    # Completadas usa el mismo criterio que el gráfico de estado de visitas
    completed_today = status_distribution.get(OrderStatusEnum.COMPLETADA.value, 0)

    # 5. Órdenes con retraso potencial
    delayed_res = await db.execute(
        select(func.count(WorkOrder.id)).where(
            WorkOrder.status.notin_([OrderStatusEnum.COMPLETADA, OrderStatusEnum.CANCELADA]),
            WorkOrder.scheduled_date < now
        )
    )
    delayed_orders = delayed_res.scalar() or 0

    return DispatchKPIsResponse(
        active_orders=active_orders,
        technicians_in_field=technicians_in_field,
        available_sims_rate=available_sims_rate,
        completed_today=completed_today,
        delayed_orders=delayed_orders,
        status_distribution=status_distribution,
    )


async def list_technicians(db: AsyncSession) -> List[TechnicianSummary]:
    """Retorna el listado de técnicos activos consultando la base de datos con su estado operativo y ubicación."""
    result = await db.execute(
        select(Technician).options(selectinload(Technician.user))
    )
    technicians = result.scalars().all()

    active_orders_res = await db.execute(
        select(WorkOrder).where(
            WorkOrder.status.in_([OrderStatusEnum.EN_RUTA, OrderStatusEnum.EN_SITIO])
        )
    )
    active_orders = active_orders_res.scalars().all()
    active_by_tech = {o.technician_id: o for o in active_orders if o.technician_id}

    items = []
    for t in technicians:
        active_order = active_by_tech.get(t.id)
        # Privacidad estricta: sólo exponer coordenadas en tiempo real durante órdenes EN_RUTA autorizadas
        is_en_ruta = active_order is not None and active_order.status == OrderStatusEnum.EN_RUTA
        has_fresh_location = is_en_ruta and t.last_location_at is not None

        items.append(
            TechnicianSummary(
                id=t.id,
                full_name=t.user.full_name if t.user else "Técnico",
                rut=t.rut,
                initials=t.initials,
                phone=t.user.phone if t.user else None,
                vehicle_plate=t.vehicle_plate,
                is_available=t.is_available,
                current_lat=t.current_lat if has_fresh_location else None,
                current_lng=t.current_lng if has_fresh_location else None,
                last_location_at=t.last_location_at if has_fresh_location else None,
                active_order_id=active_order.id if active_order else None,
                active_order_number=active_order.order_number if active_order else None,
                active_order_status=active_order.status.value if active_order else None,
            )
        )
    return items


async def list_technicians_locations(db: AsyncSession) -> List[TechnicianLocationSummary]:
    """Retorna telemetría consolidada de técnicos para representación cartográfica en tiempo real."""
    result = await db.execute(
        select(Technician).options(selectinload(Technician.user))
    )
    technicians = result.scalars().all()

    active_orders_res = await db.execute(
        select(WorkOrder).where(
            WorkOrder.status.in_([OrderStatusEnum.EN_RUTA, OrderStatusEnum.EN_SITIO])
        )
    )
    active_orders = active_orders_res.scalars().all()
    active_by_tech = {o.technician_id: o for o in active_orders if o.technician_id}

    items = []
    for t in technicians:
        active_order = active_by_tech.get(t.id)
        # Privacidad estricta: sólo exponer coordenadas en tiempo real durante órdenes EN_RUTA autorizadas
        is_en_ruta = active_order is not None and active_order.status == OrderStatusEnum.EN_RUTA
        has_fresh_location = is_en_ruta and t.last_location_at is not None

        items.append(
            TechnicianLocationSummary(
                technician_id=t.id,
                full_name=t.user.full_name if t.user else "Técnico",
                initials=t.initials,
                vehicle_plate=t.vehicle_plate,
                current_lat=t.current_lat if has_fresh_location else None,
                current_lng=t.current_lng if has_fresh_location else None,
                last_location_at=t.last_location_at if has_fresh_location else None,
                active_order_id=active_order.id if active_order else None,
                active_order_number=active_order.order_number if active_order else None,
                active_order_status=active_order.status.value if active_order else None,
                is_available=t.is_available,
            )
        )
    return items


async def update_technician_order_location(
    db: AsyncSession,
    order_id: uuid.UUID,
    location_data: WorkOrderLocationUpdate,
    current_user: User,
) -> WorkOrderLocationResponse:
    """
    Registra coordenadas GPS en tiempo real enviadas por la app móvil del técnico asignado.
    Restringido estrictamente a órdenes en estado EN_RUTA para salvaguardar privacidad.
    """
    order = await get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden de trabajo con ID {order_id} no encontrada"
        )

    # Validar asignación del técnico
    if current_user.role == UserRoleEnum.TECNICO:
        if order.technician_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El técnico autenticado no está asignado a esta orden de trabajo."
            )
    elif current_user.role not in [UserRoleEnum.ADMIN, UserRoleEnum.COORDINADOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rol de usuario no autorizado para reportar telemetría."
        )

    # Validar que la orden se encuentre en trayecto (EN_RUTA)
    if order.status != OrderStatusEnum.EN_RUTA:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Solo se admiten actualizaciones de ubicación mientras la orden está en estado EN_RUTA. Estado actual: {order.status.value}"
        )

    target_tech_id = order.technician_id or current_user.id
    technician = order.technician
    if not technician:
        tech_res = await db.execute(select(Technician).where(Technician.id == target_tech_id))
        technician = tech_res.scalar_one_or_none()

    if not technician:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil del técnico asignado no encontrado."
        )

    now_utc = datetime.now(timezone.utc)
    technician.current_lat = location_data.lat
    technician.current_lng = location_data.lng
    technician.last_location_at = now_utc
    technician.updated_at = now_utc

    await db.commit()

    return WorkOrderLocationResponse(
        success=True,
        order_id=order.id,
        technician_id=technician.id,
        current_lat=technician.current_lat,
        current_lng=technician.current_lng,
        last_location_at=technician.last_location_at,
        status=order.status.value,
    )


async def list_clients(db: AsyncSession) -> List[ClientSummary]:
    """Retorna el listado de clientes empresariales registrados."""
    result = await db.execute(select(Client).order_by(Client.business_name))
    clients = result.scalars().all()
    return [ClientSummary.model_validate(c) for c in clients]


async def create_technician(db: AsyncSession, tech_in: TechnicianCreate) -> TechnicianSummary:
    """
    Registra un nuevo técnico en el sistema creando su cuenta de usuario
    y perfil de técnico en terreno con contraseña encriptada (bcrypt).
    """
    # 1. Validar que email no exista
    existing_user = await db.execute(select(User).where(User.email == tech_in.email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El correo electrónico '{tech_in.email}' ya está registrado en el sistema."
        )

    # 2. Validar que RUT no exista
    existing_rut = await db.execute(select(Technician).where(Technician.rut == tech_in.rut))
    if existing_rut.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El RUT '{tech_in.rut}' ya está registrado con otro técnico."
        )

    # 3. Calcular iniciales si no vienen
    initials = tech_in.initials
    if not initials:
        words = tech_in.full_name.strip().split()
        initials = "".join(w[0].upper() for w in words[:2])

    # 4. Crear usuario con rol TECNICO
    new_user = User(
        email=tech_in.email,
        password_hash=get_password_hash(tech_in.password),
        full_name=tech_in.full_name,
        phone=tech_in.phone,
        role=UserRoleEnum.TECNICO,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()

    # 5. Crear perfil de técnico
    new_tech = Technician(
        id=new_user.id,
        rut=tech_in.rut,
        initials=initials,
        vehicle_plate=tech_in.vehicle_plate.upper() if tech_in.vehicle_plate else None,
        is_available=True,
    )
    db.add(new_tech)
    await db.commit()
    await db.refresh(new_tech)
    await db.refresh(new_user)

    return TechnicianSummary(
        id=new_tech.id,
        full_name=new_user.full_name,
        rut=new_tech.rut,
        initials=new_tech.initials,
        phone=new_user.phone,
        vehicle_plate=new_tech.vehicle_plate,
        is_available=new_tech.is_available,
    )


async def toggle_technician_availability(db: AsyncSession, technician_id: uuid.UUID) -> TechnicianSummary:
    """Alterna el estado de disponibilidad en campo de un técnico."""
    result = await db.execute(
        select(Technician).options(selectinload(Technician.user)).where(Technician.id == technician_id)
    )
    tech = result.scalar_one_or_none()
    if not tech:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Técnico no encontrado")

    tech.is_available = not tech.is_available
    await db.commit()
    await db.refresh(tech)

    return TechnicianSummary(
        id=tech.id,
        full_name=tech.user.full_name if tech.user else "Técnico",
        rut=tech.rut,
        initials=tech.initials,
        phone=tech.user.phone if tech.user else None,
        vehicle_plate=tech.vehicle_plate,
        is_available=tech.is_available,
    )


async def get_recent_activity_log(
    db: AsyncSession, limit: int = 50
) -> List[OrderActivityLogItem]:
    """Retorna la bitácora cronológica inmutable de transiciones de estado reales (RF-BO-12)."""
    query = (
        select(OrderStatusHistory)
        .options(
            selectinload(OrderStatusHistory.work_order).selectinload(WorkOrder.client),
            selectinload(OrderStatusHistory.work_order).selectinload(WorkOrder.technician).selectinload(Technician.user),
            selectinload(OrderStatusHistory.changed_by_user),
        )
        .order_by(desc(OrderStatusHistory.created_at))
        .limit(limit)
    )
    result = await db.execute(query)
    entries = result.scalars().all()

    items = []
    for h in entries:
        order = h.work_order
        order_num = order.order_number if order else "Desconocida"
        client = order.client.business_name if (order and order.client) else None

        user_name = None
        user_role = None
        if h.changed_by_user:
            user_name = h.changed_by_user.full_name
            user_role = (
                h.changed_by_user.role.value
                if hasattr(h.changed_by_user.role, "value")
                else str(h.changed_by_user.role)
            )
        elif order and order.technician and order.technician.user:
            user_name = order.technician.user.full_name
            user_role = "TECNICO"
        else:
            user_name = "Sistema / Coordinación"
            user_role = "SISTEMA"

        action_text = h.comment
        if not action_text:
            if h.old_status:
                action_text = f"Transición de estado: {h.old_status.value} → {h.new_status.value}"
            else:
                action_text = f"Orden creada en estado {h.new_status.value}"

        items.append(
            OrderActivityLogItem(
                id=h.id,
                order_id=h.work_order_id,
                order_number=order_num,
                client_name=client,
                technician_name=user_name,
                performer_role=user_role,
                action=action_text,
                old_status=h.old_status,
                new_status=h.new_status,
                service_type=order.service_type if order else None,
                created_at=h.created_at,
                comment=h.comment,
                lat=h.lat,
                lng=h.lng,
            )
        )
    return items

async def approve_order_audit(
    db: AsyncSession,
    order_id: uuid.UUID,
    notes: Optional[str],
    current_user: User,
) -> WorkOrder:
    """
    Aprueba administrativamente y cierra la auditoría de una orden de trabajo (P2 / P3).
    Requisitos:
    - Rol: COORDINADOR o ADMIN (exigido por dependencia del router).
    - La orden debe existir (404).
    - La orden no debe haber sido auditada previamente (409 Conflict).
    - La orden debe estar en estado COMPLETADA (400 Bad Request).
    - Evidencias obligatorias: FOTO_DESPUES y FIRMA_CLIENTE (400 Bad Request).
    - Persiste is_audited=True, audited_at, audited_by_user_id, audit_notes.
    - Registra evento trazable en order_status_history.
    """
    # 1. Bloqueo transaccional de fila en PostgreSQL (SELECT FOR UPDATE)
    # Serializa solicitudes concurrentes y garantiza atomicidad estricta frente a dos coordinadores simultáneos
    order = await get_order_by_id(db, order_id, for_update=True)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden de trabajo con ID {order_id} no encontrada",
        )

    # 2. Proteger contra aprobaciones duplicadas y concurrencia (409 Conflict)
    if order.is_audited:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La orden ya cuenta con una auditoría aprobada y cerrada previamente.",
        )

    # 3. Validar que la orden esté en estado COMPLETADA
    if order.status != OrderStatusEnum.COMPLETADA:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La orden de trabajo debe estar en estado COMPLETADA para realizar el cierre de auditoría.",
        )

    # 4. Validar evidencias obligatorias (FOTO_DESPUES y FIRMA_CLIENTE)
    evidences = order.evidences or []
    has_photo_after = any(e.evidence_type == EvidenceTypeEnum.FOTO_DESPUES for e in evidences)
    has_signature = any(e.evidence_type == EvidenceTypeEnum.FIRMA_CLIENTE for e in evidences)

    missing_evidences = []
    if not has_photo_after:
        missing_evidences.append("evidencia fotográfica de término (FOTO_DESPUES)")
    if not has_signature:
        missing_evidences.append("firma digital de conformidad del cliente (FIRMA_CLIENTE)")

    if missing_evidences:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede aprobar la auditoría: falta {' y '.join(missing_evidences)}.",
        )

    # 5. Persistir cierre de auditoría
    now_utc = datetime.now(timezone.utc)
    order.is_audited = True
    order.audited_at = now_utc
    order.audited_by_user_id = current_user.id
    order.audit_notes = notes.strip() if notes and notes.strip() else None
    order.updated_at = now_utc

    # 6. Registrar evento en bitácora inmutable (order_status_history)
    role_str = (
        current_user.role.value
        if hasattr(current_user.role, "value")
        else str(current_user.role)
    )
    audit_comment = f"Auditoría administrativa aprobada y cerrada por {current_user.full_name} ({role_str})"
    if order.audit_notes:
        audit_comment += f": {order.audit_notes}"

    history = OrderStatusHistory(
        work_order_id=order.id,
        old_status=order.status,
        new_status=order.status,
        changed_by_user_id=current_user.id,
        lat=order.lat,
        lng=order.lng,
        comment=audit_comment,
        created_at=now_utc,
    )
    db.add(history)

    await db.commit()
    await db.refresh(order)
    return await get_order_by_id(db, order.id)
