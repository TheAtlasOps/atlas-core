import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.client import Client
from app.models.work_order import WorkOrder
from app.models.user import Technician
from app.models.enums import OrderStatusEnum, ClientTypeEnum
from app.utils.rut import normalize_rut_key
from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientDetailResponse,
    ClientOrderItem,
)

ACTIVE_ORDER_STATUSES = [
    OrderStatusEnum.IDLE,
    OrderStatusEnum.CONFIRMADA,
    OrderStatusEnum.EN_RUTA,
    OrderStatusEnum.EN_SITIO,
]


def _normalized_db_rut_expr():
    return func.replace(
        func.replace(func.upper(func.coalesce(Client.rut, "")), ".", ""),
        "-",
        "",
    )


def _effective_client_type(client_obj: Client) -> str:
    raw = getattr(client_obj, "client_type", None)
    if hasattr(raw, "value"):
        return raw.value
    return str(raw or ClientTypeEnum.EMPRESARIAL.value)


def _to_client_response(client_obj: Client, orders: Optional[List[WorkOrder]] = None) -> ClientResponse:
    linked_orders = orders if orders is not None else (client_obj.work_orders or [])
    active_orders = sum(1 for o in linked_orders if o.status in ACTIVE_ORDER_STATUSES)
    return ClientResponse(
        id=client_obj.id,
        client_type=_effective_client_type(client_obj),
        rut=client_obj.rut,
        business_name=client_obj.business_name,
        contact_person=client_obj.contact_person,
        contact_phone=client_obj.contact_phone,
        secondary_phone=getattr(client_obj, "secondary_phone", None),
        contact_email=client_obj.contact_email,
        address=client_obj.address,
        comuna=client_obj.comuna,
        region=client_obj.region or "Metropolitana",
        lat=client_obj.lat,
        lng=client_obj.lng,
        created_at=client_obj.created_at,
        updated_at=client_obj.updated_at,
        active_orders_count=active_orders,
        total_orders_count=len(linked_orders),
    )


async def list_clients(
    db: AsyncSession,
    search: Optional[str] = None,
    client_type: Optional[ClientTypeEnum] = None,
) -> List[ClientResponse]:
    """
    Retorna el listado de clientes registrados en Neon con el conteo de órdenes activas y totales.
    Permite filtrar por tipo de cliente y buscar por nombre/razón social, contacto, correo, teléfonos, rut o comuna.
    """
    query = select(Client).options(selectinload(Client.work_orders))

    if client_type is not None:
        query = query.where(Client.client_type == client_type.value)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Client.business_name).like(term),
                func.lower(Client.contact_email).like(term),
                func.lower(func.coalesce(Client.contact_person, "")).like(term),
                func.lower(func.coalesce(Client.rut, "")).like(term),
                func.lower(Client.contact_phone).like(term),
                func.lower(func.coalesce(Client.secondary_phone, "")).like(term),
                func.lower(Client.address).like(term),
                func.lower(Client.comuna).like(term),
            )
        )

    query = query.order_by(Client.business_name.asc())
    result = await db.execute(query)
    clients = result.scalars().all()

    return [_to_client_response(c) for c in clients]


async def get_client_detail(
    db: AsyncSession, client_id: uuid.UUID
) -> ClientDetailResponse:
    """
    Obtiene la ficha técnica completa de un cliente, incluyendo su información de contacto
    y el historial de órdenes de trabajo asociadas.
    """
    query = (
        select(Client)
        .options(
            selectinload(Client.work_orders).selectinload(WorkOrder.technician).selectinload(Technician.user)
        )
        .where(Client.id == client_id)
    )
    result = await db.execute(query)
    client_obj = result.scalar_one_or_none()

    if not client_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cliente con ID {client_id} no encontrado en Neon",
        )

    raw_orders = client_obj.work_orders or []
    sorted_orders = sorted(
        raw_orders,
        key=lambda o: o.created_at or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )

    order_items: List[ClientOrderItem] = []
    active_count = 0

    for o in sorted_orders:
        if o.status in ACTIVE_ORDER_STATUSES:
            active_count += 1

        tech_name = None
        if o.technician and o.technician.user:
            tech_name = o.technician.user.full_name

        order_items.append(
            ClientOrderItem(
                id=o.id,
                order_number=o.order_number,
                title=o.title,
                service_type=o.service_type.value if hasattr(o.service_type, "value") else str(o.service_type),
                status=o.status.value if hasattr(o.status, "value") else str(o.status),
                priority=o.priority.value if hasattr(o.priority, "value") else str(o.priority),
                scheduled_date=o.scheduled_date,
                completed_at=o.completed_at,
                technician_name=tech_name,
                tag=o.tag,
            )
        )

    return ClientDetailResponse(
        id=client_obj.id,
        client_type=_effective_client_type(client_obj),
        rut=client_obj.rut,
        business_name=client_obj.business_name,
        contact_person=client_obj.contact_person,
        contact_phone=client_obj.contact_phone,
        secondary_phone=getattr(client_obj, "secondary_phone", None),
        contact_email=client_obj.contact_email,
        address=client_obj.address,
        comuna=client_obj.comuna,
        region=client_obj.region or "Metropolitana",
        lat=client_obj.lat,
        lng=client_obj.lng,
        created_at=client_obj.created_at,
        updated_at=client_obj.updated_at,
        active_orders_count=active_count,
        total_orders_count=len(order_items),
        orders=order_items,
    )


async def create_client(
    db: AsyncSession, client_in: ClientCreate
) -> ClientResponse:
    """
    Registra un nuevo cliente empresarial o residencial en PostgreSQL/Neon.
    Valida unicidad de RUT cuando se proporciona; permite personas residenciales con nombres iguales.
    """
    target_type = client_in.client_type.value if hasattr(client_in.client_type, "value") else str(client_in.client_type)
    clean_business_name = client_in.business_name.strip()
    clean_email = str(client_in.contact_email).strip().lower()
    clean_rut = client_in.rut.strip() if client_in.rut else None
    rut_key = normalize_rut_key(clean_rut)

    # Validar duplicados de RUT normalizado si viene provisto (aplica a todo tipo de cliente)
    if rut_key:
        rut_check = await db.execute(
            select(Client).where(_normalized_db_rut_expr() == rut_key)
        )
        if rut_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un cliente registrado con el RUT '{clean_rut}'",
            )

    # Validar duplicados de razón social solo para clientes empresariales;
    # en clientes residenciales se permiten personas con nombres iguales.
    if target_type == ClientTypeEnum.EMPRESARIAL.value:
        name_check = await db.execute(
            select(Client).where(
                Client.client_type == ClientTypeEnum.EMPRESARIAL.value,
                func.lower(Client.business_name) == clean_business_name.lower(),
            )
        )
        if name_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un cliente registrado con la razón social '{clean_business_name}'",
            )

    new_client = Client(
        id=uuid.uuid4(),
        client_type=target_type,
        business_name=clean_business_name,
        contact_email=clean_email,
        contact_phone=client_in.contact_phone.strip(),
        secondary_phone=client_in.secondary_phone.strip() if client_in.secondary_phone else None,
        address=client_in.address.strip(),
        comuna=client_in.comuna.strip() if client_in.comuna else "Santiago",
        region=client_in.region.strip() if client_in.region else "Metropolitana",
        rut=clean_rut,
        contact_person=client_in.contact_person.strip() if client_in.contact_person else None,
        lat=client_in.lat,
        lng=client_in.lng,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(new_client)
    await db.commit()
    await db.refresh(new_client)

    return _to_client_response(new_client, orders=[])


async def update_client(
    db: AsyncSession, client_id: uuid.UUID, client_in: ClientUpdate
) -> ClientResponse:
    """
    Actualiza los datos comerciales, residenciales y de contacto de un cliente existente.
    """
    result = await db.execute(
        select(Client).options(selectinload(Client.work_orders)).where(Client.id == client_id)
    )
    client_obj = result.scalar_one_or_none()

    if not client_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cliente con ID {client_id} no encontrado",
        )

    target_type = (
        client_in.client_type.value
        if client_in.client_type is not None
        else _effective_client_type(client_obj)
    )

    # Validar RUT si se intenta modificar o limpiar
    if "rut" in client_in.model_fields_set:
        clean_rut = client_in.rut.strip() if client_in.rut else None
        new_rut_key = normalize_rut_key(clean_rut)
        current_rut_key = normalize_rut_key(client_obj.rut)
        if new_rut_key and new_rut_key != current_rut_key:
            rut_check = await db.execute(
                select(Client).where(
                    _normalized_db_rut_expr() == new_rut_key,
                    Client.id != client_id,
                )
            )
            if rut_check.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ya existe otro cliente registrado con el RUT '{clean_rut}'",
                )
        client_obj.rut = clean_rut

    # Validar business_name si corresponde a un cliente empresarial
    if client_in.business_name is not None:
        clean_name = client_in.business_name.strip()
        type_switched_to_business = (
            client_in.client_type is not None
            and target_type == ClientTypeEnum.EMPRESARIAL.value
            and _effective_client_type(client_obj) != ClientTypeEnum.EMPRESARIAL.value
        )
        if target_type == ClientTypeEnum.EMPRESARIAL.value and (
            clean_name.lower() != client_obj.business_name.lower() or type_switched_to_business
        ):
            name_check = await db.execute(
                select(Client).where(
                    Client.client_type == ClientTypeEnum.EMPRESARIAL.value,
                    func.lower(Client.business_name) == clean_name.lower(),
                    Client.id != client_id,
                )
            )
            if name_check.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ya existe otro cliente con la razón social '{clean_name}'",
                )
        client_obj.business_name = clean_name

    if client_in.client_type is not None:
        client_obj.client_type = target_type
    if client_in.contact_email is not None:
        client_obj.contact_email = str(client_in.contact_email).strip().lower()
    if client_in.contact_phone is not None:
        client_obj.contact_phone = client_in.contact_phone.strip()
    if "secondary_phone" in client_in.model_fields_set:
        client_obj.secondary_phone = (
            client_in.secondary_phone.strip() if client_in.secondary_phone else None
        )
    if "contact_person" in client_in.model_fields_set:
        client_obj.contact_person = (
            client_in.contact_person.strip() if client_in.contact_person else None
        )
    if client_in.address is not None:
        client_obj.address = client_in.address.strip()
    if client_in.comuna is not None:
        client_obj.comuna = client_in.comuna.strip()
    if client_in.region is not None:
        client_obj.region = client_in.region.strip()
    if client_in.lat is not None:
        client_obj.lat = client_in.lat
    if client_in.lng is not None:
        client_obj.lng = client_in.lng

    client_obj.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(client_obj)

    return _to_client_response(client_obj)


async def delete_client(db: AsyncSession, client_id: uuid.UUID) -> None:
    """
    Elimina un cliente registrado solo si no posee órdenes de trabajo asociadas.
    Cumple con la restricción de integridad referencial RESTRICT de Neon.
    """
    result = await db.execute(
        select(Client).options(selectinload(Client.work_orders)).where(Client.id == client_id)
    )
    client_obj = result.scalar_one_or_none()

    if not client_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cliente con ID {client_id} no encontrado",
        )

    orders_count = len(client_obj.work_orders or [])
    if orders_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el cliente '{client_obj.business_name}' porque tiene {orders_count} orden(es) de trabajo asociada(s). Conserve el cliente para preservar el historial técnico.",
        )

    await db.delete(client_obj)
    await db.commit()
