import base64
import io
import uuid
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
from app.services.client_service import submit_client_signature
from app.services.evidence_service import (
    MAX_IMAGE_SIZE_BYTES,
    get_order_evidences_audit,
    inspect_image_magic_bytes,
    process_and_save_evidence_file,
)
from app.services.storage_service import (
    generate_presigned_download_url,
    get_s3_client,
    upload_file_to_storage,
)


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
    # Binario PE/Windows (MZ) con supuesta extensión de imagen
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


# ─── 2. Carga Segura a Neon Object Storage S3 ─────────────────────────────────

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


# ─── 3. Generación de URLs Prefirmadas y Verificación de Permisos ──────────────

def test_generate_presigned_download_url():
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = "https://neon-storage.test/evidences/test.jpg?token=abc"

    with patch("app.services.storage_service.is_neon_storage_configured", return_value=True):
        with patch("app.services.storage_service.get_s3_client", return_value=mock_s3):
            url = generate_presigned_download_url("evidences/test.jpg", expires_in=1800)

            assert "https://neon-storage.test" in url
            mock_s3.generate_presigned_url.assert_called_once_with(
                "get_object",
                Params={"Bucket": "atlas-evidences-dev", "Key": "evidences/test.jpg"},
                ExpiresIn=1800,
            )


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
async def test_get_order_evidences_audit_allows_assigned_technician():
    order_id = uuid.uuid4()
    tech_id = uuid.uuid4()
    order = WorkOrder(
        id=order_id,
        order_number="#OT-08492",
        status=OrderStatusEnum.EN_SITIO,
        technician_id=tech_id,
    )
    tech_user = User(id=tech_id, email="tech@atlas.cl", role=UserRoleEnum.TECNICO)

    db = MagicMock()
    r_order = MagicMock()
    r_order.scalar_one_or_none.return_value = order
    r_evs = MagicMock()
    r_evs.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(side_effect=[r_order, r_evs])

    result = await get_order_evidences_audit(db, order_id, tech_user)
    assert result.total_evidences == 0


@pytest.mark.asyncio
async def test_get_order_evidences_audit_rejects_unassigned_technician():
    order_id = uuid.uuid4()
    order = WorkOrder(
        id=order_id,
        order_number="#OT-08492",
        status=OrderStatusEnum.EN_SITIO,
        technician_id=uuid.uuid4(),  # Otro técnico
    )
    other_tech = User(id=uuid.uuid4(), email="other@atlas.cl", role=UserRoleEnum.TECNICO)

    db = MagicMock()
    r_order = MagicMock()
    r_order.scalar_one_or_none.return_value = order
    db.execute = AsyncMock(return_value=r_order)

    with pytest.raises(HTTPException) as exc:
        await get_order_evidences_audit(db, order_id, other_tech)

    assert exc.value.status_code == 403
    assert "No tienes permisos para consultar evidencias" in exc.value.detail


# ─── 4. Firma Digital de Cliente y Almacenamiento en Neon Storage ─────────────

@pytest.mark.asyncio
async def test_submit_client_signature_persists_png_to_neon_storage():
    raw_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 30
    b64_sig = "data:image/png;base64," + base64.b64encode(raw_png).decode("utf-8")

    magic_link = MagicLink(
        id=uuid.uuid4(),
        work_order_id=uuid.uuid4(),
        token="valid_token_xyz",
        is_active=True,
        expires_at=datetime.max.replace(tzinfo=timezone.utc),
    )
    order = WorkOrder(
        id=magic_link.work_order_id,
        order_number="#OT-08492",
        status=OrderStatusEnum.EN_SITIO,
        technician_id=None,
    )
    magic_link.work_order = order

    db = MagicMock()
    db.add = MagicMock()
    db.commit = AsyncMock()

    mock_s3 = MagicMock()
    mock_s3.put_object.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}
    mock_s3.generate_presigned_url.return_value = "https://neon-storage.test/presigned-sig.png"

    with patch("app.services.client_service.validate_magic_link_token", return_value=magic_link):
        with patch("app.services.storage_service.get_s3_client", return_value=mock_s3):
            with patch(
                "app.services.client_service.generate_presigned_download_url",
                return_value="https://neon-storage.test/presigned-sig.png",
            ):
                res = await submit_client_signature(
                    db=db,
                    token="valid_token_xyz",
                    sign_data=SignConformityRequest(
                        signature_base64=b64_sig,
                        signed_by_name="Juan Perez",
                    ),
                )

                assert res.success is True
                assert res.signature_url == "https://neon-storage.test/presigned-sig.png"
                assert magic_link.signature_url.startswith("signatures/")
                assert magic_link.signature_url.endswith(".png")
                assert db.commit.called
