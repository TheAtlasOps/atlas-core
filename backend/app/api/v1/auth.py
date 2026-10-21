from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_active_user, require_role
from app.models.user import User
from app.models.enums import UserRoleEnum
from app.schemas.auth import LoginRequest, Token, MagicLinkGenerateRequest, MagicLinkResponse
from app.schemas.user import UserResponse
from app.services.auth_service import (
    authenticate_user,
    create_user_token_response,
    generate_magic_link_for_order,
)

router = APIRouter()


@router.post(
    "/login",
    response_model=Token,
    summary="Inicio de sesión (JSON)",
    description="Autenticación con email y contraseña para coordinadores y técnicos. Emite un token JWT (RNF-SEG-02 / RF-API-08).",
)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Valida credenciales y genera token de acceso JWT con rol incorporado."""
    user = await authenticate_user(db, email=login_data.email, password=login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo electrónico o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario suspendido o inactivo",
        )
    return create_user_token_response(user)


@router.post(
    "/login-form",
    response_model=Token,
    summary="Inicio de sesión para Swagger UI",
    description="Endpoint compatible con OAuth2PasswordRequestForm para habilitar el botón 'Authorize 🔓' en Swagger UI.",
    include_in_schema=True,
)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Inicio de sesión compatible con la especificación de Swagger UI."""
    user = await authenticate_user(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo",
        )
    return create_user_token_response(user)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Perfil del usuario autenticado",
    description="Retorna la información del usuario autenticado actual, incluyendo el perfil de técnico si aplica.",
)
async def get_me(
    current_user: User = Depends(get_current_active_user)
):
    """Consulta los datos del token JWT del usuario conectado."""
    return current_user


@router.post(
    "/magic-link/generate",
    response_model=MagicLinkResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generar Magic Link para cliente",
    description="Genera un enlace efímero con token criptográfico de alta entropía (32 bytes) para acceso sin contraseña del cliente (RNF-SEG-03 / RF-API-09). Solo Coordinadores y Administradores.",
)
async def generate_magic_link(
    request: MagicLinkGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.COORDINADOR, UserRoleEnum.ADMIN]))
):
    """Emite un token de Magic Link asociado a la orden especificada."""
    return await generate_magic_link_for_order(
        db=db,
        work_order_id=request.work_order_id,
        expire_hours=request.expire_hours or 48
    )
