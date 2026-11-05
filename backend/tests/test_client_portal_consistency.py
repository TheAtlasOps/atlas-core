"""
Pruebas de consistencia del Portal Cliente y Magic Links (Fase 2 / v0.3.0).
Valida que:
1. Órdenes con firma previa (en evidencias o enlaces anteriores) muestren `is_signed=True`, URL y datos de firma.
2. Órdenes con auditoría aprobada (`is_audited=True`) muestren estado auditado y bloqueen modificaciones.
3. Se impida el duplicado o reemplazo de firmas (HTTP 409).
4. Se bloquee confirmación o firma sobre órdenes auditadas (HTTP 409).
5. Se reutilicen Magic Links activos y se preserve la firma digital al generar nuevos enlaces.
6. La línea de tiempo no marque hitos no ocurridos como completados.
"""

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import generate_magic_link_token
from app.models.enums import EvidenceTypeEnum, OrderStatusEnum, ServiceTypeEnum
from app.schemas.client_portal import (
    ConfirmVisitRequest,
    SignConformityRequest,
)
from app.services.auth_service import generate_magic_link_for_order
from app.services.client_service import (
    _build_summary_response,
    compute_timeline_steps,
    confirm_client_visit,
    submit_client_signature,
    validate_magic_link_token,
)


def make_test_order(
    status=OrderStatusEnum.COMPLETADA,
    is_audited=False,
    audited_at=None,
    audit_notes=None,
    has_photo=True,
    has_signature=False,
    signature_url=None,
    signed_by_name=None,
    signed_at=None,
):
    now = datetime.now(timezone.utc)
    order_id = uuid.uuid4()
    order = SimpleNamespace(
        id=order_id,
        order_number="#OT-08492",
        title="Instalación Router 5G de prueba",
        status=status,
        service_type=ServiceTypeEnum.DIAGNOSTICO_ROUTER,
        scheduled_date=now,
        completed_at=now if status == OrderStatusEnum.COMPLETADA else None,
        eta=None,
        address_override="Av. Apoquindo 4500",
        comuna_override="Las Condes",
        client=SimpleNamespace(
            id=uuid.uuid4(),
            business_name="Entel Corporaciones",
            address="Av. Apoquindo 4500",
            comuna="Las Condes",
            contact_person="Carlos Receptor",
            contact_phone="+56 2 2345 6789",
        ),
        technician=SimpleNamespace(
            id=uuid.uuid4(),
            rut="16.555.444-2",
            initials="JP",
            credential_id="ENTEL-TECH-4401",
            vehicle_plate=None,
            user=SimpleNamespace(
                full_name="Juan Pérez Técnico",
                phone=None,
            ),
        ),
        technician_id=uuid.uuid4(),
        is_audited=is_audited,
        audited_at=audited_at or (now if is_audited else None),
        audit_notes=audit_notes or ("Auditoría aprobada conforme" if is_audited else None),
        status_history=[],
        evidences=[],
        magic_links=[],
        lat=None,
        lng=None,
    )

    evidences = []
    if has_photo:
        evidences.append(
            SimpleNamespace(
                id=uuid.uuid4(),
                work_order_id=order_id,
                evidence_type=EvidenceTypeEnum.FOTO_DESPUES,
                storage_url="https://storage.neon.tech/foto.jpg",
                notes="Foto de equipo instalado",
                captured_at=now,
            )
        )
    if has_signature:
        sig_url = signature_url or "https://storage.neon.tech/firma_cliente_08492.png"
        sig_date = signed_at or now
        evidences.append(
            SimpleNamespace(
                id=uuid.uuid4(),
                work_order_id=order_id,
                evidence_type=EvidenceTypeEnum.FIRMA_CLIENTE,
                storage_url=sig_url,
                notes=f"Firma conforme otorgada por: {signed_by_name or 'Receptor Autorizado OT-08492'}",
                captured_at=sig_date,
            )
        )
    order.evidences = evidences
    return order


def make_test_link(order, is_active=True, expired=False, signature_url=None):
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=uuid.uuid4(),
        token=generate_magic_link_token(),
        work_order=order,
        work_order_id=order.id,
        is_active=is_active,
        expires_at=now - timedelta(hours=1) if expired else now + timedelta(hours=48),
        client_confirmed_at=None,
        signature_url=signature_url,
        created_at=now,
        used_at=now if signature_url else None,
    )


# ─── 1. Pruebas de Lectura del Resumen (Order Summary) ──────────────────────────

def test_order_without_signature_shows_pending():
    """Una orden no firmada debe reflejar is_signed=False y datos de firma nulos."""
    order = make_test_order(status=OrderStatusEnum.EN_SITIO, has_signature=False)
    link = make_test_link(order)

    summary = _build_summary_response(order, link)
    assert summary.is_signed is False
    assert summary.signature_url is None
    assert summary.signed_at is None
    assert summary.signed_by_name is None
    assert summary.is_audited is False


def test_order_with_existing_evidence_shows_signed_and_metadata():
    """Una orden con evidencia FIRMA_CLIENTE debe reflejar is_signed=True y sus metadatos reales."""
    now = datetime.now(timezone.utc)
    order = make_test_order(
        status=OrderStatusEnum.COMPLETADA,
        has_signature=True,
        signature_url="https://storage.neon.tech/firmas/ot08492.png",
        signed_by_name="Roberto Gómez",
        signed_at=now,
    )
    link = make_test_link(order)

    summary = _build_summary_response(order, link)
    assert summary.is_signed is True
    assert summary.signature_url == "https://storage.neon.tech/firmas/ot08492.png"
    assert summary.signed_by_name == "Roberto Gómez"
    assert summary.signed_at == now


def test_order_with_prior_magic_link_signature_shows_signed():
    """Si una orden tiene la firma en un Magic Link previo, debe reflejarse como firmada."""
    order = make_test_order(status=OrderStatusEnum.COMPLETADA, has_signature=False)
    prior_link = make_test_link(order, is_active=False, signature_url="https://storage.neon.tech/firma_prev.png")
    order.magic_links = [prior_link]

    new_link = make_test_link(order, is_active=True, signature_url=None)

    summary = _build_summary_response(order, new_link)
    assert summary.is_signed is True
    assert summary.signature_url == "https://storage.neon.tech/firma_prev.png"


def test_order_audited_shows_audited_metadata():
    """Una orden con auditoría aprobada refleja is_audited=True, audited_at y audit_notes."""
    now = datetime.now(timezone.utc)
    order = make_test_order(
        status=OrderStatusEnum.COMPLETADA,
        is_audited=True,
        audited_at=now,
        audit_notes="Cierre administrativo conforme en terreno",
        has_signature=True,
    )
    link = make_test_link(order)

    summary = _build_summary_response(order, link)
    assert summary.is_audited is True
    assert summary.audited_at == now
    assert summary.audit_notes == "Cierre administrativo conforme en terreno"
    assert summary.is_signed is True


# ─── 2. Pruebas de Bloqueo frente a Modificaciones (HTTP 409) ───────────────────

@pytest.mark.asyncio
async def test_submit_signature_blocked_on_already_signed_order_409():
    """Rechaza un segundo intento de firma con HTTP 409 si la orden ya tiene firma válida."""
    order = make_test_order(
        status=OrderStatusEnum.COMPLETADA,
        has_signature=True,
        signature_url="https://storage.neon.tech/firma_existente.png",
    )
    link = make_test_link(order, signature_url="https://storage.neon.tech/firma_existente.png")

    db = MagicMock(spec=AsyncSession)
    res_link = MagicMock()
    res_link.scalar_one_or_none.return_value = link

    res_lock = MagicMock()
    res_lock.scalar_one_or_none.return_value = order

    db.execute = AsyncMock(side_effect=[res_link, res_lock])
    db.commit = AsyncMock()

    payload = SignConformityRequest(
        signature_base64="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAA...",
        signed_by_name="Nuevo Firmante No Autorizado",
    )

    with pytest.raises(HTTPException) as exc_info:
        await submit_client_signature(
            db=db,
            token=link.token,
            sign_data=payload,
        )

    assert exc_info.value.status_code == 409
    assert "recepción conforme firmada" in exc_info.value.detail
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_submit_signature_blocked_on_audited_order_409():
    """Rechaza la firma con HTTP 409 si la orden ya cuenta con auditoría cerrada."""
    order = make_test_order(
        status=OrderStatusEnum.COMPLETADA,
        is_audited=True,
        has_signature=False,
    )
    link = make_test_link(order)

    db = MagicMock(spec=AsyncSession)
    res_link = MagicMock()
    res_link.scalar_one_or_none.return_value = link

    res_lock = MagicMock()
    res_lock.scalar_one_or_none.return_value = order

    db.execute = AsyncMock(side_effect=[res_link, res_lock])
    db.commit = AsyncMock()

    payload = SignConformityRequest(
        signature_base64="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAA...",
        signed_by_name="Firmante Posterior",
    )

    with pytest.raises(HTTPException) as exc_info:
        await submit_client_signature(
            db=db,
            token=link.token,
            sign_data=payload,
        )

    assert exc_info.value.status_code == 409
    assert "auditoría administrativa aprobada" in exc_info.value.detail
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_confirm_visit_blocked_on_audited_order_409():
    """Rechaza la confirmación de visita con HTTP 409 si la orden ya fue auditada."""
    order = make_test_order(status=OrderStatusEnum.COMPLETADA, is_audited=True)
    link = make_test_link(order)

    db = MagicMock(spec=AsyncSession)
    res_mock = MagicMock()
    res_mock.scalar_one_or_none.return_value = link
    db.execute = AsyncMock(return_value=res_mock)
    db.commit = AsyncMock()

    payload = ConfirmVisitRequest(notes="Intento de reconfirmación")

    with pytest.raises(HTTPException) as exc_info:
        await confirm_client_visit(
            db=db,
            token=link.token,
            confirm_data=payload,
        )

    assert exc_info.value.status_code == 409
    assert "auditoría administrativa aprobada" in exc_info.value.detail
    db.commit.assert_not_awaited()


# ─── 3. Pruebas de Generación y Reutilización de Magic Links ─────────────────────

@pytest.mark.asyncio
async def test_generate_magic_link_reuses_active_link():
    """Al solicitar Magic Link para una orden con enlace activo vigente, se reutiliza."""
    order = make_test_order(status=OrderStatusEnum.COMPLETADA, has_signature=False)
    active_link = make_test_link(order, is_active=True, expired=False)
    order.magic_links = [active_link]

    db = MagicMock(spec=AsyncSession)
    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = order
    db.execute = AsyncMock(return_value=order_res)
    db.commit = AsyncMock()

    res = await generate_magic_link_for_order(db, order.id)
    assert res.token == active_link.token
    assert res.is_active is True
    assert res.portal_url == f"{settings.FRONTEND_PORTAL_URL}/{active_link.token}"


@pytest.mark.asyncio
async def test_generate_magic_link_preserves_signature_on_new_link():
    """Al generar un nuevo enlace para orden ya firmada (ej. si el anterior expiró), conserva signature_url."""
    order = make_test_order(
        status=OrderStatusEnum.COMPLETADA,
        has_signature=True,
        signature_url="https://storage.neon.tech/firma_08492.png",
    )
    expired_link = make_test_link(order, is_active=True, expired=True)
    order.magic_links = [expired_link]

    db = MagicMock(spec=AsyncSession)
    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = order
    db.execute = AsyncMock(return_value=order_res)
    db.commit = AsyncMock()

    created_link = None
    def mock_add(obj):
        nonlocal created_link
        created_link = obj
    db.add = MagicMock(side_effect=mock_add)

    async def mock_refresh(obj):
        obj.id = uuid.uuid4()
    db.refresh = AsyncMock(side_effect=mock_refresh)

    res = await generate_magic_link_for_order(db, order.id)
    assert res.token != expired_link.token
    assert expired_link.is_active is False
    assert created_link is not None
    assert created_link.signature_url == "https://storage.neon.tech/firma_08492.png"
    assert created_link.is_active is True


# ─── 4. Línea de Tiempo y Saltos de Estados ──────────────────────────────────────

def test_timeline_steps_unrecorded_stage_not_completed():
    """Hitos intermedios saltados (ej. EN_RUTA en #OT-08492) no deben figurar como completed."""
    now = datetime.now(timezone.utc)
    order = make_test_order(status=OrderStatusEnum.COMPLETADA)
    order.status_history = [
        SimpleNamespace(new_status=OrderStatusEnum.CONFIRMADA, created_at=now - timedelta(hours=2)),
        SimpleNamespace(new_status=OrderStatusEnum.EN_SITIO, created_at=now - timedelta(hours=1)),
        SimpleNamespace(new_status=OrderStatusEnum.COMPLETADA, created_at=now),
    ]

    steps = compute_timeline_steps(order)
    steps_dict = {s.key: s for s in steps}

    assert steps_dict["confirmada"].completed is True
    assert steps_dict["en_ruta"].completed is False
    assert steps_dict["en_ruta"].timestamp is None
    assert "no registrada" in steps_dict["en_ruta"].description.lower()
    assert steps_dict["en_sitio"].completed is True
    assert steps_dict["completada"].completed is True


# ─── 5. Validación de Enlace Expirado (HTTP 410) ────────────────────────────────

@pytest.mark.asyncio
async def test_validate_token_expired_returns_410():
    """Tokens con fecha de expiración superada deben responder con HTTP 410 Gone."""
    order = make_test_order()
    expired_link = make_test_link(order, is_active=True, expired=True)

    db = MagicMock(spec=AsyncSession)
    res_mock = MagicMock()
    res_mock.scalar_one_or_none.return_value = expired_link
    db.execute = AsyncMock(return_value=res_mock)

    with pytest.raises(HTTPException) as exc_info:
        await validate_magic_link_token(db, expired_link.token)

    assert exc_info.value.status_code == 410
    assert "ha expirado" in exc_info.value.detail
