import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_active_user, require_role
from app.models.user import User
from app.models.enums import UserRoleEnum, SimStatusEnum, EquipmentStatusEnum, EquipmentTypeEnum
from app.schemas.inventory import (
    SimCardCreate,
    SimCardUpdate,
    SimCardResponse,
    SimCardListResponse,
    EquipmentCreate,
    EquipmentUpdate,
    EquipmentResponse,
    EquipmentListResponse,
    DevicePairRequest,
    DevicePairResponse,
)
from app.services.inventory_service import (
    list_sim_cards,
    get_sim_by_id,
    create_sim_card,
    update_sim_card,
    list_equipment,
    get_equipment_by_id,
    create_equipment,
    update_equipment,
    pair_devices,
    build_sim_response,
    build_equipment_response,
)

router = APIRouter()


# ─── Endpoints de Tarjetas SIM (RF-API-01) ───────────────────────────────────
@router.get(
    "/sims",
    response_model=SimCardListResponse,
    summary="Listar inventario de tarjetas SIM",
    description="Retorna listado paginado y filtrable por estado, operador, técnico asignado o búsqueda por ICCID/MSISDN (RF-API-01).",
)
async def get_sims(
    status: Optional[SimStatusEnum] = Query(None, description="Filtrar por estado (DISPONIBLE, ASIGNADA_TECNICO, INSTALADA, DEFECTUOSA)"),
    operator: Optional[str] = Query(None, description="Filtrar por operador (ej: Entel)"),
    technician_id: Optional[uuid.UUID] = Query(None, description="Filtrar por técnico custodio"),
    client_id: Optional[uuid.UUID] = Query(None, description="Filtrar por cliente donde está instalada"),
    search: Optional[str] = Query(None, description="Búsqueda por ICCID o MSISDN"),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(20, ge=1, le=100, description="Elementos por página"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Consulta de inventario de SIMs para Backoffice y App Móvil."""
    sims, total = await list_sim_cards(
        db=db,
        status_filter=status,
        operator_filter=operator,
        technician_id=technician_id,
        client_id=client_id,
        search=search,
        page=page,
        size=size,
    )
    items = [build_sim_response(s) for s in sims]
    pages = (total + size - 1) // size if total > 0 else 1

    return SimCardListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.post(
    "/sims",
    response_model=SimCardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nueva tarjeta SIM",
    description="Alta de chip SIM validando unicidad estricta del código ICCID (RF-API-01). Solo Coordinadores y Administradores.",
)
async def create_sim(
    sim_in: SimCardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Alta de tarjeta SIM."""
    created = await create_sim_card(db, sim_in)
    return build_sim_response(created)


@router.get(
    "/sims/{sim_id}",
    response_model=SimCardResponse,
    summary="Detalle de una tarjeta SIM",
    description="Consulta la ficha técnica completa de la SIM, técnico custodio y cliente asociado.",
)
async def get_sim(
    sim_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Ficha técnica de SIM Card."""
    sim = await get_sim_by_id(db, sim_id)
    if not sim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tarjeta SIM con ID {sim_id} no encontrada"
        )
    return build_sim_response(sim)


@router.patch(
    "/sims/{sim_id}",
    response_model=SimCardResponse,
    summary="Actualizar tarjeta SIM",
    description="Permite cambiar estado (ej: marcar como Defectuosa o Disponible), técnico custodio o notas técnicas.",
)
async def patch_sim(
    sim_id: uuid.UUID,
    sim_in: SimCardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN, UserRoleEnum.TECNICO])),
):
    """Actualización de atributos de la SIM."""
    updated = await update_sim_card(db, sim_id, sim_in)
    return build_sim_response(updated)


# ─── Endpoints de Routers y Equipamiento (RF-API-02) ─────────────────────────
@router.get(
    "/routers",
    response_model=EquipmentListResponse,
    summary="Listar inventario de Routers y Hardware",
    description="Retorna listado paginado y filtrable por tipo de equipo (ROUTER_4G, ROUTER_5G), estado, marca o serie (RF-API-02).",
)
async def get_routers(
    type: Optional[EquipmentTypeEnum] = Query(None, description="Filtrar por tipología (ROUTER_4G, ROUTER_5G, MODEM_ADSL, etc.)"),
    status: Optional[EquipmentStatusEnum] = Query(None, description="Filtrar por estado (DISPONIBLE, ASIGNADO_TECNICO, INSTALADO)"),
    brand: Optional[str] = Query(None, description="Filtrar por marca (Huawei, Teltonika, etc.)"),
    technician_id: Optional[uuid.UUID] = Query(None, description="Filtrar por técnico custodio"),
    client_id: Optional[uuid.UUID] = Query(None, description="Filtrar por cliente instalado"),
    search: Optional[str] = Query(None, description="Búsqueda por número de serie, MAC o modelo"),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(20, ge=1, le=100, description="Elementos por página"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Consulta de parque de Routers."""
    equipment, total = await list_equipment(
        db=db,
        type_filter=type,
        status_filter=status,
        brand_filter=brand,
        technician_id=technician_id,
        client_id=client_id,
        search=search,
        page=page,
        size=size,
    )
    items = [build_equipment_response(e) for e in equipment]
    pages = (total + size - 1) // size if total > 0 else 1

    return EquipmentListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.post(
    "/routers",
    response_model=EquipmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo Router",
    description="Alta de Router en inventario validando unicidad de número de serie físico (RF-API-02). Solo Coordinadores y Administradores.",
)
async def create_router(
    equip_in: EquipmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Alta de equipamiento Router."""
    created = await create_equipment(db, equip_in)
    return build_equipment_response(created)


@router.get(
    "/routers/{equip_id}",
    response_model=EquipmentResponse,
    summary="Detalle de un Router",
    description="Consulta la ficha técnica completa del Router (marca, modelo, serie, MAC, estado y custodio).",
)
async def get_router(
    equip_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Ficha técnica de Router."""
    equip = await get_equipment_by_id(db, equip_id)
    if not equip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipo con ID {equip_id} no encontrado"
        )
    return build_equipment_response(equip)


@router.patch(
    "/routers/{equip_id}",
    response_model=EquipmentResponse,
    summary="Actualizar Router",
    description="Permite modificar atributos físicos, estado operativo o técnico/cliente asignado.",
)
async def patch_router(
    equip_id: uuid.UUID,
    equip_in: EquipmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN, UserRoleEnum.TECNICO])),
):
    """Actualización de equipo."""
    updated = await update_equipment(db, equip_id, equip_in)
    return build_equipment_response(updated)


# ─── Emparejamiento Lógico 1:1 (RF-API-03 / 14-DocArq §3.2) ──────────────────
@router.post(
    "/pair",
    response_model=DevicePairResponse,
    summary="Emparejamiento lógico Router-SIM (Exclusividad 1:1)",
    description="Realiza el emparejamiento lógico y control de exclusividad entre un Router y una tarjeta SIM específica, garantizando que un chip activo no quede duplicado simultáneamente en múltiples equipos (RF-API-03 / 14-DocArq §3.2).",
)
async def pair(
    pair_req: DevicePairRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN, UserRoleEnum.TECNICO])),
):
    """Emparejamiento exclusivo de Router y SIM."""
    return await pair_devices(db, pair_req, current_user=current_user)
