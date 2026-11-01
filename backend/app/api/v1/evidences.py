import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.user import User
from app.schemas.evidence import (
    EvidenceCreateRequest,
    EvidenceResponse,
    FileUploadResponse,
    OrderEvidencesAuditResponse,
)
from app.services.evidence_service import (
    process_and_save_evidence_file,
    create_evidence_record,
    get_order_evidences_audit,
)

router = APIRouter()


@router.post(
    "/upload",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Subida segura de archivos (Inspección Magic Bytes & Neon Object Storage)",
    description="Recibe archivos de evidencias fotográficas, valida su encabezado binario (JPEG, PNG, WebP), restringe el peso a < 2 MB, almacena en Neon Object Storage y asigna un identificador único persistente (RNF-SEG-05 / 14-DocArq §3.2).",
)
async def upload_file(
    file: UploadFile = File(..., description="Archivo de imagen capturado en terreno"),
    folder: str = Form("evidences", description="Subcarpeta de destino (evidences, signatures)"),
    current_user: User = Depends(get_current_active_user),
):
    """Subida sanitizada de archivos binarios a Neon Object Storage."""
    return await process_and_save_evidence_file(file=file, folder=folder)


@router.post(
    "",
    response_model=EvidenceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar evidencia o medición técnica",
    description="Persiste de forma vinculada a la OT una evidencia fotográfica, medición de potencia dBm, test de velocidad o validación de chip SIM (RF-API-07).",
)
async def create_evidence(
    evidence_in: EvidenceCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Registro de evidencia o checklist técnico de terreno."""
    return await create_evidence_record(db=db, evidence_in=evidence_in, current_user=current_user)


@router.get(
    "/order/{work_order_id}",
    response_model=OrderEvidencesAuditResponse,
    summary="Auditoría de evidencias para cierre de orden",
    description="Permite a los coordinadores y supervisores auditar las actas de visita en terreno, verificando que se cumplan las fotos obligatorias, el diagnóstico de señal y la firma del cliente con URLs temporales de lectura (RF-BO-09 / RF-APP-13).",
)
async def get_order_evidences(
    work_order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Consulta de evidencias y validación de cierre con control de permisos."""
    return await get_order_evidences_audit(db=db, work_order_id=work_order_id, current_user=current_user)
