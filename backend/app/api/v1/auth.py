from collections import OrderedDict, deque
from time import monotonic

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_active_user, require_role
from app.models.user import User
from app.models.enums import UserRoleEnum
from app.schemas.auth import LoginRequest, Token, MagicLinkGenerateRequest, MagicLinkResponse
from app.schemas.user import UserResponse
from app.schemas.password_reset import PasswordResetRequest, PasswordResetConfirm, PasswordResetMessage
from app.services.password_reset_service import REQUEST_MESSAGE, request_password_reset, confirm_password_reset
from app.services.auth_service import (
    authenticate_user,
    create_user_token_response,
    generate_magic_link_for_order,
)

router = APIRouter()
_recovery_requests = OrderedDict()


def allow_recovery_request(client_host: str) -> bool:
    now = monotonic()
    while _recovery_requests and (len(_recovery_requests) >= 10000 or next(iter(_recovery_requests.values()))[-1] < now - 300):
        _recovery_requests.popitem(last=False)
    attempts = _recovery_requests.setdefault(client_host, deque())
    _recovery_requests.move_to_end(client_host)
    while attempts and attempts[0] <= now - 300:
        attempts.popleft()
    allowed = len(attempts) < 20
    if allowed:
        attempts.append(now)
    return allowed


@router.post("/password-reset/request", response_model=PasswordResetMessage, status_code=202)
async def request_recovery(payload: PasswordResetRequest, background_tasks: BackgroundTasks, request: Request):
    if allow_recovery_request(request.client.host if request.client else "unknown"):
        background_tasks.add_task(request_password_reset, str(payload.email))
    return PasswordResetMessage(message=REQUEST_MESSAGE)


@router.post("/password-reset/confirm", response_model=PasswordResetMessage)
async def confirm_recovery(payload: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    await confirm_password_reset(
        db, payload.token.get_secret_value(), payload.password.get_secret_value(),
        payload.password_confirmation.get_secret_value(),
    )
    return PasswordResetMessage(message="Contraseña actualizada. Inicia sesión con tu nueva contraseña.")


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
