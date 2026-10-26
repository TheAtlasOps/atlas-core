import uuid
from typing import AsyncGenerator, Callable, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.enums import UserRoleEnum

# Esquema OAuth2 con Bearer Token para integración interactiva en Swagger UI (/docs)
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login-form",
    description="Ingrese sus credenciales en el endpoint de login para obtener el Bearer Token."
)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    Dependencia de seguridad: extrae, valida y decodifica el token JWT Bearer.
    Carga la entidad User desde PostgreSQL con su perfil de técnico si existe.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales de acceso no válidas o token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    user_id_str: str = payload.get("sub")
    if not user_id_str:
        raise credentials_exception

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    # Consulta asíncrona con carga anticipada del perfil de técnico (selectinload)
    result = await db.execute(
        select(User)
        .options(selectinload(User.technician_profile))
        .where(User.id == user_uuid)
    )
    user = result.scalar_one_or_none()

    if user is None or payload.get("ver", 0) != (user.auth_version or 0):
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Valida que el usuario autenticado se encuentre activo en el sistema."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta de usuario inactiva o suspendida"
        )
    return current_user


def require_role(allowed_roles: List[UserRoleEnum]) -> Callable:
    """
    Fábrica de dependencias RBAC (Control de Acceso Basado en Roles - RNF-SEG-02).
    Verifica que el rol del usuario autenticado coincida con los permitidos.
    """
    async def role_checker(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permisos insuficientes. Requiere uno de los siguientes roles: {[r.value for r in allowed_roles]}"
            )
        return current_user

    return role_checker
