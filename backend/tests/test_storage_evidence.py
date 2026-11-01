import base64
import io
import struct
import uuid
import zlib
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from botocore.exceptions import ClientError
from fastapi import HTTPException, UploadFile

from app.models.magic_link import MagicLink
from app.models.enums import EvidenceTypeEnum, OrderStatusEnum, UserRoleEnum
from app.models.evidence import WorkOrderEvidence
from app.models.user import User
from app.models.work_order import WorkOrder
from app.schemas.client_portal import SignConformityRequest
from app.schemas.evidence import EvidenceCreateRequest
from app.services.client_service import (
    DISALLOWED_SIGNATURE_SUBSTRINGS,
    submit_client_signature,
    validate_and_decode_signature_image,
)
from app.services.evidence_service import (
    MAX_IMAGE_SIZE_BYTES,
    create_evidence_record,
    get_order_evidences_audit,
    inspect_image_magic_bytes,
    process_and_save_evidence_file,
    verify_user_order_permission,
)
from app.services.storage_service import (
    generate_presigned_download_url,
    get_s3_client,
    upload_file_to_storage,
)


def make_valid_png_bytes(width=200, height=80) -> bytes:
    """Genera bytes de una imagen PNG válida con dimensiones IHDR reales para simular trazos del canvas."""
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr_crc = struct.pack(">I", zlib.crc32(b"IHDR" + ihdr_data))
    ihdr_chunk = struct.pack(">I", len(ihdr_data)) + b"IHDR" + ihdr_data + ihdr_crc

    raw_scanlines = b"".join(b"\x00" + b"\x10\x10\x10" * width for _ in range(height))
    compressed = zlib.compress(raw_scanlines)
    idat_crc = struct.pack(">I", zlib.crc32(b"IDAT" + compressed))
    idat_chunk = struct.pack(">I", len(compressed)) + b"IDAT" + compressed + idat_crc

    iend_crc = struct.pack(">I", zlib.crc32(b"IEND"))
    iend_chunk = struct.pack(">I", 0) + b"IEND" + iend_crc
    return sig + ihdr_chunk + idat_chunk + iend_chunk


# ─── 1. Pruebas de Seguridad: Magic Bytes y Tamaño de Archivo (RNF-SEG-05) ────

def test_inspect_jpeg_magic_bytes_success():
    valid_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01"
    ext, mime = inspect_image_magic_bytes(valid_jpeg)
    assert ext == "jpg"
    assert mime == "image/jpeg"


def test_inspect_png_magic_bytes_success():
    valid_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    ext, mime = inspect_image_magic_bytes(valid_png)
    assert ext == "png"
    assert mime == "image/png"


def test_inspect_webp_magic_bytes_success():
    valid_webp = b"RIFF\x24\x00\x00\x00WEBPVP8 "
    ext, mime = inspect_image_magic_bytes(valid_webp)
    assert ext == "webp"
    assert mime == "image/webp"


def test_reject_executable_disguised_as_image():
    fake_image = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00"
    with pytest.raises(HTTPException) as exc:
        inspect_image_magic_bytes(fake_image)
    assert exc.value.status_code == 400
    assert "Formato de archivo no permitido" in exc.value.detail


def test_reject_shell_script():
    script_bytes = b"#!/bin/bash\nrm -rf /atlas"
    with pytest.raises(HTTPException) as exc:
        inspect_image_magic_bytes(script_bytes)
    assert exc.value.status_code == 400
    assert "Formato de archivo no permitido" in exc.value.detail


def test_reject_corrupt_or_truncated_header():
    too_short = b"\xff\xd8\xff"
    with pytest.raises(HTTPException) as exc:
        inspect_image_magic_bytes(too_short)
    assert exc.value.status_code == 400
    assert "Archivo corrupto o demasiado pequeño" in exc.value.detail


@pytest.mark.asyncio
async def test_reject_empty_upload_file():
    empty_upload = UploadFile(filename="vacio.jpg", file=io.BytesIO(b""))
    with pytest.raises(HTTPException) as exc:
        await process_and_save_evidence_file(empty_upload)
    assert exc.value.status_code == 400
    assert "está vacío" in exc.value.detail


@pytest.mark.asyncio
async def test_reject_file_exceeding_2mb():
    too_large = b"\xff\xd8\xff\xe0" + b"\x00" * (MAX_IMAGE_SIZE_BYTES + 1)
    upload = UploadFile(filename="foto_gigante.jpg", file=io.BytesIO(too_large))
    with pytest.raises(HTTPException) as exc:
        await process_and_save_evidence_file(upload)
    assert exc.value.status_code == 400
    assert "excede el tamaño máximo permitido de 2 MB" in exc.value.detail


# ─── 2. Carga Segura y Control de Permisos en Upload (CORRECCIÓN 1) ───────────

@pytest.mark.asyncio
async def test_process_and_save_evidence_file_uploads_to_s3_and_returns_persistent_key():
    valid_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01" + b"\x00" * 50
    upload = UploadFile(filename="antena_instalada.jpg", file=io.BytesIO(valid_jpeg))

    mock_s3 = MagicMock()
    mock_s3.put_object.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}

    with patch("app.services.storage_service.get_s3_client", return_value=mock_s3):
        res = await process_and_save_evidence_file(upload, folder="evidences")

        assert res.success is True
        assert res.mime_type == "image/jpeg"
        assert res.storage_url.startswith("evidences/")
        assert res.storage_url.endswith(".jpg")
        assert mock_s3.put_object.called
        kwargs = mock_s3.put_object.call_args[1]
        assert kwargs["Bucket"] == "atlas-evidences-dev"
        assert kwargs["ContentType"] == "image/jpeg"
        assert kwargs["Body"] == valid_jpeg


@pytest.mark.asyncio
async def test_upload_failure_raises_502_and_does_not_save():
    valid_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 50
    upload = UploadFile(filename="router.png", file=io.BytesIO(valid_png))

    mock_s3 = MagicMock()
    mock_s3.put_object.side_effect = ClientError(
        {"Error": {"Code": "AccessDenied", "Message": "Access Denied"}},
        "PutObject",
    )

    with patch("app.services.storage_service.get_s3_client", return_value=mock_s3):
        with pytest.raises(HTTPException) as exc:
            await process_and_save_evidence_file(upload)

        assert exc.value.status_code == 502
        assert "almacenar el archivo en Neon Object Storage" in exc.value.detail


@pytest.mark.asyncio
async def test_upload_file_technician_without_order_rejected_400():
    valid_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01" + b"\x00" * 20
    upload = UploadFile(filename="foto.jpg", file=io.BytesIO(valid_jpeg))
    tech_user = User(id=uuid.uuid4(), email="tech@atlas.cl", role=UserRoleEnum.TECNICO)

    with pytest.raises(HTTPException) as exc:
        await process_and_save_evidence_file(
            file=upload,
            folder="evidences",
            work_order_id=None,
            db=MagicMock(),
            current_user=tech_user,
        )
    assert exc.value.status_code == 400
    assert "Se requiere el ID de la orden de trabajo" in exc.value.detail


@pytest.mark.asyncio
async def test_upload_file_technician_unassigned_order_rejected_403():
    valid_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01" + b"\x00" * 20
    upload = UploadFile(filename="foto.jpg", file=io.BytesIO(valid_jpeg))
    order_id = uuid.uuid4()
    order = WorkOrder(id=order_id, order_number="#OT-08492", technician_id=uuid.uuid4())
    tech_user = User(id=uuid.uuid4(), email="other_tech@atlas.cl", role=UserRoleEnum.TECNICO)

    db = MagicMock()
    r_order = MagicMock()
    r_order.scalar_one_or_none.return_value = order
    db.execute = AsyncMock(return_value=r_order)

    with pytest.raises(HTTPException) as exc:
        await process_and_save_evidence_file(
            file=upload,
            folder="evidences",
            work_order_id=order_id,
            db=db,
            current_user=tech_user,
        )
    assert exc.value.status_code == 403
    assert "No tienes autorización" in exc.value.detail


# ─── 3. Autorización en Creación y Consulta de Evidencias (CORRECCIÓN 1) ──────

@pytest.mark.asyncio
async def test_create_evidence_record_technician_assigned_success():
    order_id = uuid.uuid4()
    tech_id = uuid.uuid4()
    order = WorkOrder(id=order_id, order_number="#OT-08492", technician_id=tech_id, lat=Decimal("-33.4"), lng=Decimal("-70.6"))
    tech_user = User(id=tech_id, full_name="Carlos Mendoza", role=UserRoleEnum.TECNICO)

    req = EvidenceCreateRequest(
        work_order_id=order_id,
        evidence_type=EvidenceTypeEnum.FOTO_DESPUES,
        storage_url="evidences/real_router.jpg",
        notes="Instalación completada",
    )

    db = MagicMock()
    r_order = MagicMock()
    r_order.scalar_one_or_none.return_value = order
    db.execute = AsyncMock(return_value=r_order)
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    with patch("app.services.evidence_service.generate_presigned_download_url", return_value="https://presigned.test/photo.jpg"):
        res = await create_evidence_record(db, req, tech_user)
        assert res.work_order_id == order_id
        assert res.technician_id == tech_id
        assert res.storage_url == "https://presigned.test/photo.jpg"
        assert db.add.called
        assert db.commit.called


@pytest.mark.asyncio
async def test_create_evidence_record_technician_unassigned_rejected_403():
    order_id = uuid.uuid4()
    order = WorkOrder(id=order_id, order_number="#OT-08492", technician_id=uuid.uuid4())
    other_tech = User(id=uuid.uuid4(), full_name="Juan Rojas", role=UserRoleEnum.TECNICO)

    req = EvidenceCreateRequest(
        work_order_id=order_id,
        evidence_type=EvidenceTypeEnum.FOTO_DESPUES,
        storage_url="evidences/router.jpg",
    )

    db = MagicMock()
    r_order = MagicMock()
    r_order.scalar_one_or_none.return_value = order
    db.execute = AsyncMock(return_value=r_order)

    with pytest.raises(HTTPException) as exc:
        await create_evidence_record(db, req, other_tech)
    assert exc.value.status_code == 403
    assert "No tienes autorización" in exc.value.detail


@pytest.mark.asyncio
async def test_create_evidence_record_coordinador_allowed():
    order_id = uuid.uuid4()
    order = WorkOrder(id=order_id, order_number="#OT-08492", technician_id=uuid.uuid4())
    coord_user = User(id=uuid.uuid4(), full_name="Supervisora", role=UserRoleEnum.COORDINADOR)

    req = EvidenceCreateRequest(
        work_order_id=order_id,
        evidence_type=EvidenceTypeEnum.DIAGNOSTICO_DBM,
        storage_url="evidences/dbm.jpg",
        signal_dbm=Decimal("-75.0"),
    )

    db = MagicMock()
    r_order = MagicMock()
    r_order.scalar_one_or_none.return_value = order
    db.execute = AsyncMock(return_value=r_order)
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    with patch("app.services.evidence_service.generate_presigned_download_url", return_value="https://presigned.test/dbm.jpg"):
        res = await create_evidence_record(db, req, coord_user)
        assert res.work_order_id == order_id
        assert db.add.called


@pytest.mark.asyncio
async def test_get_order_evidences_audit_presigns_urls_for_admin():
    order_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    order = WorkOrder(id=order_id, order_number="#OT-08492", status=OrderStatusEnum.CONFIRMADA)
    ev = WorkOrderEvidence(
        id=uuid.uuid4(),
        work_order_id=order_id,
        technician_id=uuid.uuid4(),
        evidence_type=EvidenceTypeEnum.FOTO_DESPUES,
        storage_url="evidences/router_real.jpg",
        captured_at=now,
    )
    admin_user = User(id=uuid.uuid4(), email="admin@atlas.cl", role=UserRoleEnum.ADMIN)

    db = MagicMock()
    r_order = MagicMock()
    r_order.scalar_one_or_none.return_value = order
    r_evs = MagicMock()
    r_evs.scalars.return_value.all.return_value = [ev]
    db.execute = AsyncMock(side_effect=[r_order, r_evs])

    with patch(
        "app.services.evidence_service.generate_presigned_download_url",
        return_value="https://storage.neon.tech/presigned-router.jpg",
    ):
        result = await get_order_evidences_audit(db, order_id, admin_user)

        assert result.total_evidences == 1
        assert result.has_photo_after is True
        assert result.items[0].storage_url == "https://storage.neon.tech/presigned-router.jpg"


@pytest.mark.asyncio
async def test_get_order_evidences_audit_rejects_unassigned_technician():
    order_id = uuid.uuid4()
    order = WorkOrder(
        id=order_id,
        order_number="#OT-08492",
        status=OrderStatusEnum.EN_SITIO,
        technician_id=uuid.uuid4(),
    )
    other_tech = User(id=uuid.uuid4(), email="other@atlas.cl", role=UserRoleEnum.TECNICO)

    db = MagicMock()
    r_order = MagicMock()
    r_order.scalar_one_or_none.return_value = order
    db.execute = AsyncMock(return_value=r_order)

    with pytest.raises(HTTPException) as exc:
        await get_order_evidences_audit(db, order_id, other_tech)

    assert exc.value.status_code == 403
    assert "No tienes autorización" in exc.value.detail


# ─── 4. Validación Rigurosa de Firma Digital y Persistencia (CORRECCIONES 2 y 3)

def test_validate_and_decode_signature_rejects_dummy_1x1_pixel():
    dummy_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    with pytest.raises(HTTPException) as exc:
        validate_and_decode_signature_image(dummy_b64)
    assert exc.value.status_code == 400
    assert "no se aceptan firmas simuladas ni píxeles transparentes" in exc.value.detail


def test_validate_and_decode_signature_rejects_empty_data():
    with pytest.raises(HTTPException) as exc:
        validate_and_decode_signature_image("")
    assert exc.value.status_code == 400
    assert "es obligatoria y no puede estar vacía" in exc.value.detail


def test_validate_and_decode_signature_rejects_tiny_dimensions():
    # PNG con ancho=2, alto=2
    tiny_png = make_valid_png_bytes(width=2, height=2)
    tiny_b64 = "data:image/png;base64," + base64.b64encode(tiny_png).decode("utf-8")

    with pytest.raises(HTTPException) as exc:
        validate_and_decode_signature_image(tiny_b64)
    assert exc.value.status_code == 400
    assert "Dimensiones de firma insuficientes" in exc.value.detail


def test_validate_and_decode_signature_accepts_valid_canvas_stroke():
    canvas_png = make_valid_png_bytes(width=300, height=120)
    canvas_b64 = "data:image/png;base64," + base64.b64encode(canvas_png).decode("utf-8")

    decoded = validate_and_decode_signature_image(canvas_b64)
    assert decoded.startswith(b"\x89PNG\r\n\x1a\n")
    assert len(decoded) > 120


@pytest.mark.asyncio
async def test_submit_client_signature_s3_failure_aborts_and_does_not_save_to_db():
    canvas_png = make_valid_png_bytes(width=300, height=120)
    canvas_b64 = "data:image/png;base64," + base64.b64encode(canvas_png).decode("utf-8")

    magic_link = MagicLink(
        id=uuid.uuid4(),
        work_order_id=uuid.uuid4(),
        token="valid_token_xyz",
        is_active=True,
        expires_at=datetime.max.replace(tzinfo=timezone.utc),
        signature_url=None,
    )
    order = WorkOrder(
        id=magic_link.work_order_id,
        order_number="#OT-08492",
        status=OrderStatusEnum.EN_SITIO,
        technician_id=uuid.uuid4(),
    )
    magic_link.work_order = order

    db = MagicMock()
    db.add = MagicMock()
    db.commit = AsyncMock()

    mock_s3 = MagicMock()
    mock_s3.put_object.side_effect = ClientError(
        {"Error": {"Code": "InternalError", "Message": "Neon S3 Down"}},
        "PutObject"
    )

    with patch("app.services.client_service.validate_magic_link_token", return_value=magic_link):
        with patch("app.services.storage_service.get_s3_client", return_value=mock_s3):
            with pytest.raises(HTTPException) as exc:
                await submit_client_signature(
                    db=db,
                    token="valid_token_xyz",
                    sign_data=SignConformityRequest(
                        signature_base64=canvas_b64,
                        signed_by_name="Juan Perez",
                    ),
                )

            assert exc.value.status_code == 502
            # Verificar que NO se modificó signature_url en magic_link y NO se hizo commit en DB
            assert magic_link.signature_url is None
            assert not db.commit.called
            assert not db.add.called


@pytest.mark.asyncio
async def test_submit_client_signature_success_persists_png_and_commits():
    canvas_png = make_valid_png_bytes(width=300, height=120)
    canvas_b64 = "data:image/png;base64," + base64.b64encode(canvas_png).decode("utf-8")

    magic_link = MagicLink(
        id=uuid.uuid4(),
        work_order_id=uuid.uuid4(),
        token="valid_token_xyz",
        is_active=True,
        expires_at=datetime.max.replace(tzinfo=timezone.utc),
        signature_url=None,
    )
    order = WorkOrder(
        id=magic_link.work_order_id,
        order_number="#OT-08492",
        status=OrderStatusEnum.EN_SITIO,
        technician_id=uuid.uuid4(),
    )
    magic_link.work_order = order

    db = MagicMock()
    db.add = MagicMock()
    db.commit = AsyncMock()

    mock_s3 = MagicMock()
    mock_s3.put_object.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}

    with patch("app.services.client_service.validate_magic_link_token", return_value=magic_link):
        with patch("app.services.storage_service.get_s3_client", return_value=mock_s3):
            with patch("app.services.client_service.generate_presigned_download_url", return_value="https://neon-storage.test/presigned-sig.png"):
                res = await submit_client_signature(
                    db=db,
                    token="valid_token_xyz",
                    sign_data=SignConformityRequest(
                        signature_base64=canvas_b64,
                        signed_by_name="Juan Perez",
                    ),
                )

                assert res.success is True
                assert res.signature_url == "https://neon-storage.test/presigned-sig.png"
                assert magic_link.signature_url.startswith("signatures/")
                assert magic_link.signature_url.endswith(".png")
                assert db.commit.called
                assert db.add.called
