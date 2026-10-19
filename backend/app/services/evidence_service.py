import uuid
import os
from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import UploadFile, HTTPException, status

from app.core.config import settings
from app.models.evidence import WorkOrderEvidence
from app.models.work_order import WorkOrder
from app.models.user import User, Technician
from app.models.enums import EvidenceTypeEnum, UserRoleEnum
from app.schemas.evidence import (
    EvidenceCreateRequest,
    EvidenceResponse,
    FileUploadResponse,
    OrderEvidencesAuditResponse,
)

MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB (RNF-SEG-05)


def inspect_image_magic_bytes(header: bytes) -> Tuple[str, str]:
    """
    Inspecciona los primeros bytes del archivo (magic bytes) para verificar el tipo MIME real (RNF-SEG-05).
    Rechaza archivos falsificados o ejecutables con extensiones de imagen modificadas.
    """
    if len(header) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archivo corrupto o demasiado pequeño para validar su encabezado."
        )

    # 1. JPEG: Comienza con FF D8 FF
    if header.startswith(b"\xff\xd8\xff"):
        return "jpg", "image/jpeg"

    # 2. PNG: Comienza con 89 50 4E 47 0D 0A 1A 0A
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png", "image/png"

    # 3. WebP: Comienza con 'RIFF' y en offset 8-12 contiene 'WEBP'
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "webp", "image/webp"

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Formato de archivo no permitido. Solo se aceptan imágenes JPEG, PNG o WebP verificadas por su estructura binaria (RNF-SEG-05)."
    )


async def process_and_save_evidence_file(
    file: UploadFile, folder: str = "evidences"
) -> FileUploadResponse:
    """
    Lee, valida magic bytes, restringe tamaño (< 2MB) y asigna un UUID criptográfico nuevo (RNF-SEG-05).
    """
    # Leer contenido del archivo
    content = await file.read()
    size_bytes = len(content)

    if size_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo transmitido está vacío."
        )

    if size_bytes > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El archivo excede el tamaño máximo permitido de 2 MB (tamaño recibido: {size_bytes / (1024*1024):.2f} MB)."
        )

    # Validar magic bytes binarios
    ext, mime_type = inspect_image_magic_bytes(content[:16])

    # Asignar nuevo identificador UUIDv4 para impedir ataques de sobrescritura
    secure_filename = f"{uuid.uuid4().hex}.{ext}"

    # Guardar localmente en backend/uploads/{folder}/
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", folder)
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, secure_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # URL pública (o referenciada en Google Cloud Storage)
    storage_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{folder}/{secure_filename}"

    return FileUploadResponse(
        success=True,
        filename=secure_filename,
        mime_type=mime_type,
        size_bytes=size_bytes,
        storage_url=storage_url,
        message="Archivo validado por magic bytes y almacenado de forma segura.",
    )


async def create_evidence_record(
    db: AsyncSession, evidence_in: EvidenceCreateRequest, current_user: User
) -> EvidenceResponse:
    """Registra una evidencia o medición técnica vinculada a una OT (RF-API-07)."""
    # Validar existencia de la orden
    order_res = await db.execute(select(WorkOrder).where(WorkOrder.id == evidence_in.work_order_id))
    order = order_res.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden de trabajo con ID {evidence_in.work_order_id} no encontrada"
        )

    # Obtener ID del técnico responsable
    technician_id = current_user.id
    if current_user.role != UserRoleEnum.TECNICO and order.technician_id:
        technician_id = order.technician_id

    evidence = WorkOrderEvidence(
        work_order_id=evidence_in.work_order_id,
        technician_id=technician_id,
        evidence_type=evidence_in.evidence_type,
        storage_url=evidence_in.storage_url,
        signal_dbm=evidence_in.signal_dbm,
        speed_download_mbps=evidence_in.speed_download_mbps,
        speed_upload_mbps=evidence_in.speed_upload_mbps,
        validated_iccid=evidence_in.validated_iccid,
        validated_imsi=evidence_in.validated_imsi,
        notes=evidence_in.notes,
        lat=evidence_in.lat or order.lat,
        lng=evidence_in.lng or order.lng,
    )
    db.add(evidence)
    await db.commit()
    await db.refresh(evidence)

    return EvidenceResponse(
        id=evidence.id,
        work_order_id=evidence.work_order_id,
        technician_id=evidence.technician_id,
        technician_name=current_user.full_name,
        evidence_type=evidence.evidence_type,
        storage_url=evidence.storage_url,
        signal_dbm=evidence.signal_dbm,
        speed_download_mbps=evidence.speed_download_mbps,
        speed_upload_mbps=evidence.speed_upload_mbps,
        validated_iccid=evidence.validated_iccid,
        validated_imsi=evidence.validated_imsi,
        notes=evidence.notes,
        lat=evidence.lat,
        lng=evidence.lng,
        captured_at=evidence.captured_at,
    )


async def get_order_evidences_audit(
    db: AsyncSession, work_order_id: uuid.UUID
) -> OrderEvidencesAuditResponse:
    """
    Auditoría exhaustiva de evidencias para el cierre de la orden (RF-BO-09 / RF-APP-13).
    Verifica que se cumplan las fotos de rigor, potencia de señal y firma de conformidad.
    """
    order_res = await db.execute(select(WorkOrder).where(WorkOrder.id == work_order_id))
    order = order_res.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden de trabajo con ID {work_order_id} no encontrada"
        )

    evidences_res = await db.execute(
        select(WorkOrderEvidence)
        .options(selectinload(WorkOrderEvidence.technician).selectinload(Technician.user))
        .where(WorkOrderEvidence.work_order_id == work_order_id)
        .order_by(WorkOrderEvidence.captured_at.asc())
    )
    evidences = evidences_res.scalars().all()

    # Cálculo de banderas de cumplimiento (RF-APP-13)
    has_photo_before = any(e.evidence_type == EvidenceTypeEnum.FOTO_ANTES for e in evidences)
    has_photo_after = any(e.evidence_type == EvidenceTypeEnum.FOTO_DESPUES for e in evidences)
    has_signature = any(e.evidence_type == EvidenceTypeEnum.FIRMA_CLIENTE for e in evidences)
    has_signal_check = any(
        e.evidence_type in (EvidenceTypeEnum.DIAGNOSTICO_DBM, EvidenceTypeEnum.TEST_VELOCIDAD)
        for e in evidences
    )

    # Criterio de validación integral de cierre: foto posterior y firma requeridas como mínimo
    is_ready = has_photo_after and has_signature

    items = []
    for e in evidences:
        tech_name = e.technician.user.full_name if e.technician and e.technician.user else None
        items.append(
            EvidenceResponse(
                id=e.id,
                work_order_id=e.work_order_id,
                technician_id=e.technician_id,
                technician_name=tech_name,
                evidence_type=e.evidence_type,
                storage_url=e.storage_url,
                signal_dbm=e.signal_dbm,
                speed_download_mbps=e.speed_download_mbps,
                speed_upload_mbps=e.speed_upload_mbps,
                validated_iccid=e.validated_iccid,
                validated_imsi=e.validated_imsi,
                notes=e.notes,
                lat=e.lat,
                lng=e.lng,
                captured_at=e.captured_at,
            )
        )

    return OrderEvidencesAuditResponse(
        work_order_id=order.id,
        order_number=order.order_number,
        total_evidences=len(items),
        has_photo_before=has_photo_before,
        has_photo_after=has_photo_after,
        has_signature=has_signature,
        has_signal_check=has_signal_check,
        is_ready_for_closing=is_ready,
        items=items,
    )
