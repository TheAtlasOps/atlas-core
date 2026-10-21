import uuid
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.inventory import SimCard, Equipment
from app.models.work_order import WorkOrderItem, WorkOrder
from app.models.user import User, Technician
from app.models.client import Client
from app.models.enums import SimStatusEnum, EquipmentStatusEnum, EquipmentTypeEnum
from app.schemas.inventory import (
    SimCardCreate,
    SimCardUpdate,
    SimCardResponse,
    EquipmentCreate,
    EquipmentUpdate,
    EquipmentResponse,
    DevicePairRequest,
    DevicePairResponse,
)


# ─── Formateadores de Respuesta ─────────────────────────────────────────────
def build_sim_response(sim: SimCard) -> SimCardResponse:
    tech_name = None
    if sim.assigned_technician and sim.assigned_technician.user:
        tech_name = sim.assigned_technician.user.full_name

    client_name = None
    if sim.installed_client:
        client_name = sim.installed_client.business_name

    return SimCardResponse(
        id=sim.id,
        iccid=sim.iccid,
        imsi=sim.imsi,
        msisdn=sim.msisdn,
        operator=sim.operator or "Entel",
        status=sim.status,
        notes=sim.notes,
        assigned_technician_id=sim.assigned_technician_id,
        installed_client_id=sim.installed_client_id,
        assigned_technician_name=tech_name,
        installed_client_name=client_name,
        created_at=sim.created_at,
        updated_at=sim.updated_at,
    )


def build_equipment_response(equip: Equipment) -> EquipmentResponse:
    tech_name = None
    if equip.assigned_technician and equip.assigned_technician.user:
        tech_name = equip.assigned_technician.user.full_name

    client_name = None
    if equip.installed_client:
        client_name = equip.installed_client.business_name

    return EquipmentResponse(
        id=equip.id,
        serial_number=equip.serial_number,
        mac_address=equip.mac_address,
        brand=equip.brand,
        model=equip.model,
        type=equip.type,
        status=equip.status,
        notes=equip.notes,
        assigned_technician_id=equip.assigned_technician_id,
        installed_client_id=equip.installed_client_id,
        assigned_technician_name=tech_name,
        installed_client_name=client_name,
        created_at=equip.created_at,
        updated_at=equip.updated_at,
    )


# ─── Servicios para Tarjetas SIM ────────────────────────────────────────────
async def list_sim_cards(
    db: AsyncSession,
    status_filter: Optional[SimStatusEnum] = None,
    operator_filter: Optional[str] = None,
    technician_id: Optional[uuid.UUID] = None,
    client_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    page: int = 1,
    size: int = 20,
) -> Tuple[List[SimCard], int]:
    """Retorna listado filtrable y paginado de SIM cards (RF-API-01)."""
    query = select(SimCard).options(
        selectinload(SimCard.assigned_technician).selectinload(Technician.user),
        selectinload(SimCard.installed_client),
    )

    conditions = []
    if status_filter:
        conditions.append(SimCard.status == status_filter)
    if operator_filter:
        conditions.append(SimCard.operator.ilike(f"%{operator_filter}%"))
    if technician_id:
        conditions.append(SimCard.assigned_technician_id == technician_id)
    if client_id:
        conditions.append(SimCard.installed_client_id == client_id)
    if search:
        term = f"%{search.strip()}%"
        conditions.append(or_(SimCard.iccid.ilike(term), SimCard.msisdn.ilike(term)))

    if conditions:
        query = query.where(and_(*conditions))

    count_query = select(func.count(SimCard.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(desc(SimCard.created_at)).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_sim_by_id(db: AsyncSession, sim_id: uuid.UUID) -> Optional[SimCard]:
    result = await db.execute(
        select(SimCard)
        .options(
            selectinload(SimCard.assigned_technician).selectinload(Technician.user),
            selectinload(SimCard.installed_client),
        )
        .where(SimCard.id == sim_id)
    )
    return result.scalar_one_or_none()


async def create_sim_card(db: AsyncSession, sim_in: SimCardCreate) -> SimCard:
    """Registra una nueva tarjeta SIM validando unicidad de ICCID (RF-API-01)."""
    existing_res = await db.execute(select(SimCard).where(SimCard.iccid == sim_in.iccid.strip()))
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una tarjeta SIM registrada con el ICCID {sim_in.iccid}"
        )

    sim = SimCard(
        iccid=sim_in.iccid.strip(),
        imsi=sim_in.imsi,
        msisdn=sim_in.msisdn,
        operator=sim_in.operator or "Entel",
        status=sim_in.status or SimStatusEnum.DISPONIBLE,
        assigned_technician_id=sim_in.assigned_technician_id,
        installed_client_id=sim_in.installed_client_id,
        notes=sim_in.notes,
    )
    db.add(sim)
    await db.commit()
    await db.refresh(sim)
    return await get_sim_by_id(db, sim.id)


async def update_sim_card(db: AsyncSession, sim_id: uuid.UUID, sim_in: SimCardUpdate) -> SimCard:
    sim = await get_sim_by_id(db, sim_id)
    if not sim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tarjeta SIM con ID {sim_id} no encontrada"
        )

    update_data = sim_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(sim, field, val)

    await db.commit()
    await db.refresh(sim)
    return await get_sim_by_id(db, sim.id)


# ─── Servicios para Routers y Equipamiento ──────────────────────────────────
async def list_equipment(
    db: AsyncSession,
    type_filter: Optional[EquipmentTypeEnum] = None,
    status_filter: Optional[EquipmentStatusEnum] = None,
    brand_filter: Optional[str] = None,
    technician_id: Optional[uuid.UUID] = None,
    client_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    page: int = 1,
    size: int = 20,
) -> Tuple[List[Equipment], int]:
    """Retorna listado filtrable y paginado de Routers y hardware (RF-API-02)."""
    query = select(Equipment).options(
        selectinload(Equipment.assigned_technician).selectinload(Technician.user),
        selectinload(Equipment.installed_client),
    )

    conditions = []
    if type_filter:
        conditions.append(Equipment.type == type_filter)
    if status_filter:
        conditions.append(Equipment.status == status_filter)
    if brand_filter:
        conditions.append(Equipment.brand.ilike(f"%{brand_filter}%"))
    if technician_id:
        conditions.append(Equipment.assigned_technician_id == technician_id)
    if client_id:
        conditions.append(Equipment.installed_client_id == client_id)
    if search:
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Equipment.serial_number.ilike(term),
                Equipment.mac_address.ilike(term),
                Equipment.model.ilike(term),
            )
        )

    if conditions:
        query = query.where(and_(*conditions))

    count_query = select(func.count(Equipment.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(desc(Equipment.created_at)).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_equipment_by_id(db: AsyncSession, equip_id: uuid.UUID) -> Optional[Equipment]:
    result = await db.execute(
        select(Equipment)
        .options(
            selectinload(Equipment.assigned_technician).selectinload(Technician.user),
            selectinload(Equipment.installed_client),
        )
        .where(Equipment.id == equip_id)
    )
    return result.scalar_one_or_none()


async def create_equipment(db: AsyncSession, equip_in: EquipmentCreate) -> Equipment:
    """Registra un nuevo Router validando unicidad de Serial Number (RF-API-02)."""
    existing_res = await db.execute(
        select(Equipment).where(Equipment.serial_number == equip_in.serial_number.strip())
    )
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un equipo registrado con el número de serie {equip_in.serial_number}"
        )

    equip = Equipment(
        serial_number=equip_in.serial_number.strip(),
        mac_address=equip_in.mac_address,
        brand=equip_in.brand,
        model=equip_in.model,
        type=equip_in.type,
        status=equip_in.status or EquipmentStatusEnum.DISPONIBLE,
        assigned_technician_id=equip_in.assigned_technician_id,
        installed_client_id=equip_in.installed_client_id,
        notes=equip_in.notes,
    )
    db.add(equip)
    await db.commit()
    await db.refresh(equip)
    return await get_equipment_by_id(db, equip.id)


async def update_equipment(
    db: AsyncSession, equip_id: uuid.UUID, equip_in: EquipmentUpdate
) -> Equipment:
    equip = await get_equipment_by_id(db, equip_id)
    if not equip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipo con ID {equip_id} no encontrado"
        )

    update_data = equip_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(equip, field, val)

    await db.commit()
    await db.refresh(equip)
    return await get_equipment_by_id(db, equip.id)


# ─── Emparejamiento Lógico Router-SIM con Exclusividad 1:1 ───────────────────
async def pair_devices(
    db: AsyncSession, pair_req: DevicePairRequest, current_user: User
) -> DevicePairResponse:
    """
    Empareja lógicamente un Router con una SIM Card garantizando control de exclusividad (RF-API-03).
    Asegura que una SIM activa no quede duplicada en múltiples routers ni sedes simultáneas.
    """
    # 1. Validar existencia del Router
    equip = await get_equipment_by_id(db, pair_req.equipment_id)
    if not equip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Router con ID {pair_req.equipment_id} no encontrado"
        )

    # 2. Validar existencia de la SIM Card
    sim = await get_sim_by_id(db, pair_req.sim_card_id)
    if not sim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tarjeta SIM con ID {pair_req.sim_card_id} no encontrada"
        )

    # 3. Control de Exclusividad Estricto (RF-API-03 / 14-DocArq §3.2)
    if (
        sim.status == SimStatusEnum.INSTALADA
        and pair_req.client_id
        and sim.installed_client_id != pair_req.client_id
        and pair_req.action_type != "REEMPLAZO"
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Conflicto de exclusividad: La SIM {sim.iccid} ya está instalada activamente en otra sede/cliente."
        )

    # 4. Actualizar asignación de sede o técnico
    if pair_req.client_id:
        client_res = await db.execute(select(Client).where(Client.id == pair_req.client_id))
        if not client_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cliente con ID {pair_req.client_id} no encontrado"
            )
        equip.installed_client_id = pair_req.client_id
        equip.status = EquipmentStatusEnum.INSTALADO
        sim.installed_client_id = pair_req.client_id
        sim.status = SimStatusEnum.INSTALADA
    elif pair_req.technician_id:
        tech_res = await db.execute(select(Technician).where(Technician.id == pair_req.technician_id))
        if not tech_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Técnico con ID {pair_req.technician_id} no encontrado"
            )
        equip.assigned_technician_id = pair_req.technician_id
        equip.status = EquipmentStatusEnum.ASIGNADO_TECNICO
        sim.assigned_technician_id = pair_req.technician_id
        sim.status = SimStatusEnum.ASIGNADA_TECNICO
    else:
        equip.status = EquipmentStatusEnum.INSTALADO
        sim.status = SimStatusEnum.INSTALADA

    # 5. Si está vinculado a una orden de trabajo, crear registro en work_order_items (RF-API-05)
    order_item_id = None
    if pair_req.work_order_id:
        order_res = await db.execute(select(WorkOrder).where(WorkOrder.id == pair_req.work_order_id))
        if not order_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Orden de trabajo con ID {pair_req.work_order_id} no encontrada"
            )
        order_item = WorkOrderItem(
            work_order_id=pair_req.work_order_id,
            sim_card_id=sim.id,
            equipment_id=equip.id,
            action_type=pair_req.action_type,
        )
        db.add(order_item)
        await db.flush()
        order_item_id = order_item.id

    await db.commit()
    await db.refresh(equip)
    await db.refresh(sim)

    updated_equip = await get_equipment_by_id(db, equip.id)
    updated_sim = await get_sim_by_id(db, sim.id)

    return DevicePairResponse(
        success=True,
        message=f"Emparejamiento exitoso entre Router ({equip.serial_number}) y SIM ({sim.iccid}) con control de exclusividad 1:1.",
        equipment=build_equipment_response(updated_equip),
        sim_card=build_sim_response(updated_sim),
        work_order_item_id=order_item_id,
    )
