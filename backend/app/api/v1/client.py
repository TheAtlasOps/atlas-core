from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.client_portal import (
    ClientOrderSummaryResponse,
    ConfirmVisitRequest,
    ConfirmVisitResponse,
    SignConformityRequest,
    SignConformityResponse,
)
from app.services.client_service import (
    get_client_order_summary,
    confirm_client_visit,
    submit_client_signature,
)

router = APIRouter()


@router.get(
    "/order-summary",
    response_model=ClientOrderSummaryResponse,
    summary="Resumen de la orden para Portal Cliente (Magic Link)",
    description="Permite al cliente final consultar el estado en tiempo real, ventana de atención, credencial del técnico asignado y timeline sin usar contraseñas (14-DocArq §3.2 / RF-CLI-04).",
)
async def get_summary(
    token: str = Query(..., description="Token criptográfico emitido en el Magic Link (32 bytes base64url)"),
    db: AsyncSession = Depends(get_db),
):
    """Consulta pública asegurada por token dinámico efímero."""
    return await get_client_order_summary(db=db, token=token)


@router.post(
    "/confirm-visit",
    response_model=ConfirmVisitResponse,
    summary="Confirmar cita y actualizar contacto en sitio",
    description="Permite al cliente ratificar su disponibilidad horaria o corregir el nombre y teléfono de quien recibirá al técnico en las instalaciones (RF-CLI-06 / RF-CLI-07).",
)
async def confirm_visit(
    confirm_data: ConfirmVisitRequest,
    token: str = Query(..., description="Token del Magic Link"),
    db: AsyncSession = Depends(get_db),
):
    """Ratificación de cita por el cliente receptor."""
    return await confirm_client_visit(db=db, token=token, confirm_data=confirm_data)


@router.post(
    "/sign",
    response_model=SignConformityResponse,
    summary="Firma de conformidad de servicio digital",
    description="Registra la firma digital capturada en pantalla táctil por el cliente al finalizar la intervención técnica en terreno (RF-CLI-08 / RF-APP-09).",
)
async def sign_service(
    sign_data: SignConformityRequest,
    token: str = Query(..., description="Token del Magic Link"),
    db: AsyncSession = Depends(get_db),
):
    """Recepción y resguardo de firma digital."""
    return await submit_client_signature(db=db, token=token, sign_data=sign_data)
