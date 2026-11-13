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
from app.models.enums import OrderStatusEnum
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


async def list_clients(
    db: AsyncSession, search: Optional[str] = None
) -> List[ClientResponse]:
    """
    Retorna el listado de clientes registrados en Neon con el conteo de órdenes activas y totales.
    Permite filtrar por nombre/razón social, contacto, correo, rut o comuna.
    """
    query = select(Client).options(selectinload(Client.work_orders))

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Client.business_name).like(term),
                func.lower(Client.contact_email).like(term),
                func.lower(func.coalesce(Client.contact_person, "")).like(term),
                func.lower(func.coalesce(Client.rut, "")).like(term),
                func.lower(Client.address).like(term),
                func.lower(Client.comuna).like(term),
            )
        )

    query = query.order_by(Client.business_name.asc())
    result = await db.execute(query)
    clients = result.scalars().all()

    response_items = []
    for c in clients:
        orders = c.work_orders or []
        total_orders = len(orders)
        active_orders = sum(1 for o in orders if o.status in ACTIVE_ORDER_STATUSES)

        item = ClientResponse(
            id=c.id,
            rut=c.rut,
            business_name=c.business_name,
            contact_person=c.contact_person,
            contact_phone=c.contact_phone,
            contact_email=c.contact_email,
            address=c.address,
            comuna=c.comuna,
            region=c.region or "Metropolitana",
            lat=c.lat,
            lng=c.lng,
            created_at=c.created_at,
            updated_at=c.updated_at,
            active_orders_count=active_orders,
            total_orders_count=total_orders,
        )
        response_items.append(item)

    return response_items


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
    # Ordenar órdenes por fecha más reciente primero
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
        rut=client_obj.rut,
        business_name=client_obj.business_name,
        contact_person=client_obj.contact_person,
        contact_phone=client_obj.contact_phone,
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
    Registra un nuevo cliente corporativo o residencial en PostgreSQL/Neon.
    Valida unicidad de RUT y nombre comercial.
    """
    clean_business_name = client_in.business_name.strip()
    clean_email = str(client_in.contact_email).strip().lower()
    clean_rut = client_in.rut.strip() if client_in.rut else None

    # Validar duplicados de RUT si viene provisto
    if clean_rut:
        rut_check = await db.execute(
            select(Client).where(func.lower(Client.rut) == clean_rut.lower())
        )
        if rut_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un cliente registrado con el RUT '{clean_rut}'",
            )

    # Validar duplicados de nombre de empresa exacto
    name_check = await db.execute(
        select(Client).where(func.lower(Client.business_name) == clean_business_name.lower())
    )
    if name_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un cliente registrado con la razón social '{clean_business_name}'",
        )

    new_client = Client(
        id=uuid.uuid4(),
        business_name=clean_business_name,
        contact_email=clean_email,
        contact_phone=client_in.contact_phone.strip(),
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

    return ClientResponse(
        id=new_client.id,
        rut=new_client.rut,
        business_name=new_client.business_name,
        contact_person=new_client.contact_person,
        contact_phone=new_client.contact_phone,
        contact_email=new_client.contact_email,
        address=new_client.address,
        comuna=new_client.comuna,
        region=new_client.region or "Metropolitana",
        lat=new_client.lat,
        lng=new_client.lng,
        created_at=new_client.created_at,
        updated_at=new_client.updated_at,
        active_orders_count=0,
        total_orders_count=0,
    )


async def update_client(
    db: AsyncSession, client_id: uuid.UUID, client_in: ClientUpdate
) -> ClientResponse:
    """
    Actualiza los datos comerciales y de contacto de un cliente existente.
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

    # Validar RUT si se intenta modificar
    if client_in.rut is not None:
        clean_rut = client_in.rut.strip() if client_in.rut else None
        if clean_rut and (not client_obj.rut or clean_rut.lower() != client_obj.rut.lower()):
            rut_check = await db.execute(
                select(Client).where(
                    func.lower(Client.rut) == clean_rut.lower(),
                    Client.id != client_id,
                )
            )
            if rut_check.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ya existe otro cliente registrado con el RUT '{clean_rut}'",
                )
        client_obj.rut = clean_rut

    # Validar business_name si se intenta modificar
    if client_in.business_name is not None:
        clean_name = client_in.business_name.strip()
        if clean_name.lower() != client_obj.business_name.lower():
            name_check = await db.execute(
                select(Client).where(
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

    if client_in.contact_email is not None:
        client_obj.contact_email = str(client_in.contact_email).strip().lower()
    if client_in.contact_phone is not None:
        client_obj.contact_phone = client_in.contact_phone.strip()
    if client_in.contact_person is not None:
        client_obj.contact_person = client_in.contact_person.strip() if client_in.contact_person else None
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

    orders = client_obj.work_orders or []
    active_count = sum(1 for o in orders if o.status in ACTIVE_ORDER_STATUSES)

    return ClientResponse(
        id=client_obj.id,
        rut=client_obj.rut,
        business_name=client_obj.business_name,
        contact_person=client_obj.contact_person,
        contact_phone=client_obj.contact_phone,
        contact_email=client_obj.contact_email,
        address=client_obj.address,
        comuna=client_obj.comuna,
        region=client_obj.region or "Metropolitana",
        lat=client_obj.lat,
        lng=client_obj.lng,
        created_at=client_obj.created_at,
        updated_at=client_obj.updated_at,
        active_orders_count=active_count,
        total_orders_count=len(orders),
    )


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
