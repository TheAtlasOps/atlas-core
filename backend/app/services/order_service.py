import uuid
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.work_order import WorkOrder, OrderStatusHistory
from app.models.client import Client
from app.models.user import User, Technician
from app.models.magic_link import MagicLink
from app.models.evidence import WorkOrderEvidence
from app.models.inventory import SimCard
from app.models.enums import OrderStatusEnum, OrderPriorityEnum, ServiceTypeEnum, EvidenceTypeEnum, SimStatusEnum, UserRoleEnum
from app.schemas.work_order import (
    WorkOrderCreate,
    WorkOrderStatusUpdate,
    WorkOrderAssign,
    SyncBatchRequest,
    SyncBatchResponse,
    DispatchKPIsResponse,
    TechnicianSummary,
    TechnicianCreate,
    ClientSummary,
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
        selectinload(WorkOrder.status_history),
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


async def get_order_by_id(db: AsyncSession, order_id: uuid.UUID) -> Optional[WorkOrder]:
    """Obtiene la ficha técnica completa de una orden con todas sus relaciones."""
    result = await db.execute(
        select(WorkOrder)
        .options(
            selectinload(WorkOrder.client),
            selectinload(WorkOrder.technician).selectinload(Technician.user),
            selectinload(WorkOrder.magic_links),
            selectinload(WorkOrder.status_history),
            selectinload(WorkOrder.items),
            selectinload(WorkOrder.evidences),
        )
        .where(WorkOrder.id == order_id)
    )
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
                lat=order_in.lat or Decimal("-33.4372"),
                lng=order_in.lng or Decimal("-70.6506"),
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
        lat=order_in.lat or client.lat,
        lng=order_in.lng or client.lng,
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

    if old_status == new_status:
        return order

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
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    # 1. Total órdenes activas (no completadas ni canceladas)
    active_res = await db.execute(
        select(func.count(WorkOrder.id)).where(
            WorkOrder.status.notin_([OrderStatusEnum.COMPLETADA, OrderStatusEnum.CANCELADA])
        )
    )
    active_orders = active_res.scalar() or 0

    # 2. Técnicos en campo (disponibles o asignados)
    tech_res = await db.execute(select(func.count(Technician.id)))
    technicians_in_field = tech_res.scalar() or 0

    # 3. Tasa de SIMs disponibles
    total_sims_res = await db.execute(select(func.count(SimCard.id)))
    total_sims = total_sims_res.scalar() or 1
    avail_sims_res = await db.execute(
        select(func.count(SimCard.id)).where(SimCard.status == SimStatusEnum.DISPONIBLE)
    )
    avail_sims = avail_sims_res.scalar() or 0
    available_sims_rate = round((avail_sims / total_sims) * 100, 1)

    # 4. Completadas hoy
    completed_res = await db.execute(
        select(func.count(WorkOrder.id)).where(
            WorkOrder.status == OrderStatusEnum.COMPLETADA,
            WorkOrder.completed_at >= today_start
        )
    )
    completed_today = completed_res.scalar() or 0

    # 5. Órdenes con retraso potencial
    delayed_res = await db.execute(
        select(func.count(WorkOrder.id)).where(
            WorkOrder.status.notin_([OrderStatusEnum.COMPLETADA, OrderStatusEnum.CANCELADA]),
            WorkOrder.scheduled_date < now
        )
    )
    delayed_orders = delayed_res.scalar() or 0

    # 6. Distribución por estados (para el Donut Chart del frontend)
    dist_res = await db.execute(
        select(WorkOrder.status, func.count(WorkOrder.id)).group_by(WorkOrder.status)
    )
    status_distribution: Dict[str, int] = {s.value: 0 for s in OrderStatusEnum}
    for row in dist_res.all():
        status_distribution[row[0].value] = row[1]

    return DispatchKPIsResponse(
        active_orders=active_orders,
        technicians_in_field=technicians_in_field,
        available_sims_rate=available_sims_rate,
        completed_today=completed_today,
        delayed_orders=delayed_orders,
        status_distribution=status_distribution,
    )


async def list_technicians(db: AsyncSession) -> List[TechnicianSummary]:
    """Retorna el listado de técnicos activos consultando la base de datos."""
    result = await db.execute(
        select(Technician).options(selectinload(Technician.user))
    )
    technicians = result.scalars().all()
    return [
        TechnicianSummary(
            id=t.id,
            full_name=t.user.full_name if t.user else "Técnico",
            rut=t.rut,
            initials=t.initials,
            phone=t.user.phone if t.user else None,
            vehicle_plate=t.vehicle_plate,
            is_available=t.is_available,
        )
        for t in technicians
    ]


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


