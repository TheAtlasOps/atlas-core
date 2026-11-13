import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_active_user, require_role
from app.models.enums import UserRoleEnum
from app.models.user import User
from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientDetailResponse,
)
from app.services.client_management_service import (
    list_clients as service_list_clients,
    get_client_detail as service_get_client_detail,
    create_client as service_create_client,
    update_client as service_update_client,
    delete_client as service_delete_client,
)

router = APIRouter()


@router.get(
    "",
    response_model=List[ClientResponse],
    summary="Listar clientes registrados",
    description="Retorna el listado de clientes en Neon con conteo de órdenes activas y totales. Soporta búsqueda por nombre, email, RUT o comuna.",
)
async def get_clients(
    search: Optional[str] = Query(None, description="Término de búsqueda (empresa, contacto, correo, rut o comuna)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Consulta de clientes registrados para roles autorizados."""
    return await service_list_clients(db=db, search=search)


@router.post(
    "",
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo cliente",
    description="Permite a Coordinadores y Administradores registrar un nuevo cliente corporativo o residencial en Neon.",
)
async def create_new_client(
    payload: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Creación de cliente en Neon con validación de RUT y nombre de empresa."""
    return await service_create_client(db=db, client_in=payload)


@router.get(
    "/{client_id}",
    response_model=ClientDetailResponse,
    summary="Ficha técnica de cliente y órdenes asociadas",
    description="Retorna la información completa de contacto, ubicación e historial de órdenes de trabajo del cliente.",
)
async def get_client_by_id(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Consulta de detalle de un cliente particular."""
    return await service_get_client_detail(db=db, client_id=client_id)


@router.patch(
    "/{client_id}",
    response_model=ClientResponse,
    summary="Actualizar datos de cliente",
    description="Permite modificar razón social, persona de contacto, teléfono, correo o dirección de un cliente registrado. Restringido a Coordinadores y Administradores.",
)
async def update_existing_client(
    client_id: uuid.UUID,
    payload: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN])),
):
    """Actualización de datos comerciales y de contacto de un cliente."""
    return await service_update_client(db=db, client_id=client_id, client_in=payload)


@router.delete(
    "/{client_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar cliente sin historial",
    description="Permite eliminar un cliente solo si no tiene órdenes de trabajo vinculadas. Restringido a Administradores.",
)
async def delete_existing_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.ADMIN])),
):
    """Eliminación de cliente sin órdenes asociadas."""
    await service_delete_client(db=db, client_id=client_id)
    return None
