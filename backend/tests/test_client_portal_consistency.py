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
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import generate_magic_link_token
from app.models.enums import EvidenceTypeEnum, OrderPriorityEnum, OrderStatusEnum, ServiceTypeEnum
from app.api.v1.orders import build_order_response
from app.schemas.client_portal import (
    ConfirmVisitRequest,
    SignConformityRequest,
)
from app.services.auth_service import generate_magic_link_for_order
from app.services.client_service import (
    _build_summary_response,
    compute_timeline_steps,
    confirm_client_visit,
    get_client_live_tracking,
    submit_client_signature,
    validate_magic_link_token,
)
from app.services.order_service import sync_order_tracking_simulation


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
    client_id = uuid.uuid4()
    order = SimpleNamespace(
        id=order_id,
        order_number="#OT-08492",
        title="Instalación Router 5G de prueba",
        description="Ficha de prueba para validación de firma",
        priority=OrderPriorityEnum.MEDIA,
        status=status,
        service_type=ServiceTypeEnum.DIAGNOSTICO_ROUTER,
        scheduled_date=now,
        completed_at=now if status == OrderStatusEnum.COMPLETADA else None,
        started_at=None,
        eta=None,
        address_override="Av. Apoquindo 4500",
        comuna_override="Las Condes",
        client_id=client_id,
        created_by=None,
        created_at=now,
        updated_at=now,
        tag=None,
        items=[],
        client=SimpleNamespace(
            id=client_id,
            business_name="Entel Corporaciones",
            address="Av. Apoquindo 4500",
            comuna="Las Condes",
            contact_person="Carlos Receptor",
            contact_phone="+56 2 2345 6789",
            contact_email="carlos.receptor@entel.cl",
        ),
        technician=SimpleNamespace(
            id=uuid.uuid4(),
            rut="16.555.444-2",
            initials="JP",
            credential_id="ENTEL-TECH-4401",
            vehicle_plate=None,
            is_available=True,
            current_lat=None,
            current_lng=None,
            last_location_at=None,
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


# ─── 6. Trazabilidad de Firma en Respuestas de Órdenes y Magic Links ───────────

def test_build_order_response_persisted_signature_traceability():
    """Confirma que build_order_response marca has_signature=True tanto en la orden como en magic_link_detail."""
    now_utc = datetime.now(timezone.utc)
    order = make_test_order(
        status=OrderStatusEnum.COMPLETADA,
        has_signature=True,
        signature_url="signatures/order_test_sig.png",
        signed_by_name="Pedro Receptor",
        signed_at=now_utc,
    )
    link = make_test_link(order, is_active=True)
    order.magic_links = [link]

    resp = build_order_response(order, include_token=True)

    assert resp.has_signature is True
    assert resp.is_signed is True
    assert resp.signed_by_name == "Pedro Receptor"
    assert resp.signed_at is not None
    assert resp.signed_at.tzinfo is not None
    assert resp.magic_link_detail is not None
    assert resp.magic_link_detail.has_signature is True
    assert resp.magic_link_detail.signed_by_name == "Pedro Receptor"
    assert resp.magic_link_detail.signed_at is not None
    assert resp.magic_link_detail.signed_at.tzinfo is not None


def test_build_order_response_unsigned_order():
    """Confirma que build_order_response marca has_signature=False cuando la orden no posee firma."""
    order = make_test_order(
        status=OrderStatusEnum.COMPLETADA,
        has_signature=False,
    )
    link = make_test_link(order, is_active=True)
    order.magic_links = [link]

    resp = build_order_response(order, include_token=True)

    assert resp.has_signature is False
    assert resp.is_signed is False
    assert resp.signature_url is None
    assert resp.magic_link_detail is not None
    assert resp.magic_link_detail.has_signature is False


def test_order_signed_at_preserves_utc_timezone_when_naive():
    """Verifica que marcas de tiempo de firma sin tzinfo se anclen explícitamente a UTC para evitar desfases."""
    naive_dt = datetime(2026, 11, 9, 23, 17, 0)  # Timestamp sin tzinfo simulando DB naive
    order = make_test_order(
        status=OrderStatusEnum.COMPLETADA,
        has_signature=True,
        signature_url="signatures/naive_sig.png",
        signed_by_name="Receptor QA",
        signed_at=naive_dt,
    )
    link = make_test_link(order, is_active=True)
    order.magic_links = [link]

    resp = build_order_response(order, include_token=True)

    assert resp.has_signature is True
    assert resp.signed_at is not None
    assert resp.signed_at.tzinfo == timezone.utc
    assert resp.signed_at.hour == 23
    assert resp.signed_at.minute == 17


# ─── 7. Sincronización de Inicio de Ruta (Seguimiento V2 Portal Cliente) ───────

@pytest.mark.asyncio
async def test_route_started_at_synced_across_summary_and_tracking():
    """Confirma que EN_RUTA exponga el último route_started_at en UTC sin usar endpoints admin."""
    first_en_ruta = datetime(2026, 11, 26, 10, 0, 0, tzinfo=timezone.utc)
    latest_en_ruta = datetime(2026, 11, 26, 10, 15, 0)  # naive para validar normalización UTC

    order = make_test_order(status=OrderStatusEnum.EN_RUTA)
    order.status_history = [
        SimpleNamespace(new_status=OrderStatusEnum.CONFIRMADA, created_at=first_en_ruta - timedelta(minutes=20), comment=None),
        SimpleNamespace(new_status=OrderStatusEnum.EN_RUTA, created_at=first_en_ruta, comment=None),
        SimpleNamespace(new_status=OrderStatusEnum.EN_RUTA, created_at=latest_en_ruta, comment=None),
    ]
    link = make_test_link(order, is_active=True)

    summary = _build_summary_response(order, link)
    assert summary.route_started_at is not None
    assert summary.route_started_at.tzinfo == timezone.utc
    assert summary.route_started_at.minute == 15

    db = MagicMock(spec=AsyncSession)
    res_mock = MagicMock()
    res_mock.scalar_one_or_none.return_value = link
    db.execute = AsyncMock(return_value=res_mock)

    tracking = await get_client_live_tracking(db, link.token)
    assert tracking.order_id == order.id
    assert tracking.route_started_at == summary.route_started_at
    assert tracking.is_live is False

    # Cuando no está EN_RUTA y tracking_mode es AUTO, no debe exponerse simulación
    confirm_order = make_test_order(status=OrderStatusEnum.CONFIRMADA)
    confirm_order.status_history = order.status_history
    confirm_link = make_test_link(confirm_order, is_active=True)
    confirm_summary = _build_summary_response(confirm_order, confirm_link)
    assert confirm_summary.route_started_at is None
    assert confirm_summary.active_tracking_mode == "NONE"


@pytest.mark.asyncio
async def test_admin_simulation_start_and_restart_syncs_portal_without_mixing_gps(monkeypatch):
    """
    Valida sincronización entre sesión Admin y Portal Cliente:
    - Al iniciar o presionar Repetir en Admin, simulation_started_at y tracking_mode='SIMULATION'
      se comparten con el Portal Cliente incluso si existe GPS reciente (sin mezclar coordenadas reales).
    - Al devolver modo a AUTO con GPS reciente en EN_RUTA, el cliente vuelve a LIVE_GPS.
    """
    now = datetime.now(timezone.utc)
    order = make_test_order(status=OrderStatusEnum.EN_RUTA)
    order.tracking_mode = "AUTO"
    order.simulation_started_at = None
    order.technician.current_lat = Decimal("-33.4105")
    order.technician.current_lng = Decimal("-70.5702")
    order.technician.last_location_at = now - timedelta(seconds=30)
    link = make_test_link(order, is_active=True)

    db = MagicMock(spec=AsyncSession)
    db.commit = AsyncMock()
    res_mock = MagicMock()
    res_mock.scalar_one_or_none.return_value = link
    db.execute = AsyncMock(return_value=res_mock)

    async def fake_get_order_by_id(_db, _order_id):
        return order

    monkeypatch.setattr("app.services.order_service.get_order_by_id", fake_get_order_by_id)

    # 1. Con tracking_mode=AUTO y GPS reciente, el cliente ve LIVE_GPS sin datos simulados
    gps_tracking = await get_client_live_tracking(db, link.token)
    assert gps_tracking.active_tracking_mode == "LIVE_GPS"
    assert gps_tracking.is_live is True
    assert gps_tracking.lat == order.technician.current_lat
    assert gps_tracking.route_started_at is None

    # 2. Admin inicia simulación V2 -> Portal Cliente cambia automáticamente a SIMULATION sin GPS mezclado
    started_order = await sync_order_tracking_simulation(db, order.id, action="start", mode="SIMULATION")
    assert started_order.tracking_mode == "SIMULATION"
    assert started_order.simulation_started_at is not None

    sim_tracking = await get_client_live_tracking(db, link.token)
    sim_summary = _build_summary_response(order, link)
    assert sim_tracking.active_tracking_mode == "SIMULATION"
    assert sim_tracking.route_started_at == started_order.simulation_started_at
    assert sim_tracking.lat is None
    assert sim_tracking.lng is None
    assert sim_tracking.is_live is False
    assert sim_summary.active_tracking_mode == "SIMULATION"
    assert sim_summary.technician_location is None

    # 3. Admin presiona Repetir -> nuevo simulation_started_at compartido automáticamente
    first_ts = started_order.simulation_started_at - timedelta(seconds=120)
    order.simulation_started_at = first_ts
    restarted_order = await sync_order_tracking_simulation(db, order.id, action="restart", mode="SIMULATION")
    assert restarted_order.simulation_started_at > first_ts

    replayed_tracking = await get_client_live_tracking(db, link.token)
    assert replayed_tracking.active_tracking_mode == "SIMULATION"
    assert replayed_tracking.route_started_at == restarted_order.simulation_started_at

    # 4. Admin devuelve modo a AUTO -> Portal Cliente retoma LIVE_GPS limpio
    await sync_order_tracking_simulation(db, order.id, action="set_mode", mode="AUTO")
    restored_gps = await get_client_live_tracking(db, link.token)
    assert restored_gps.active_tracking_mode == "LIVE_GPS"
    assert restored_gps.is_live is True
    assert restored_gps.route_started_at is None


@pytest.mark.asyncio
async def test_sync_simulation_blocks_terminal_orders_and_refreshes_expired_start(monkeypatch):
    """
    Valida que:
    - Órdenes COMPLETADA o CANCELADA rechacen simulaciones con HTTP 409.
    - Un nuevo start desde AUTO o tras expirar (>180s) genere timestamp fresco, mientras una simulación activa (<180s) lo conserve.
    """
    db = MagicMock(spec=AsyncSession)
    db.commit = AsyncMock()

    for terminal_status in (OrderStatusEnum.COMPLETADA, OrderStatusEnum.CANCELADA):
        term_order = make_test_order(status=terminal_status)

        async def fake_term(_db, _order_id, current=term_order):
            return current

        monkeypatch.setattr("app.services.order_service.get_order_by_id", fake_term)
        with pytest.raises(HTTPException) as exc_info:
            await sync_order_tracking_simulation(db, term_order.id, action="start", mode="SIMULATION")
        assert exc_info.value.status_code == 409

    active_order = make_test_order(status=OrderStatusEnum.EN_RUTA)
    active_order.tracking_mode = "SIMULATION"
    ongoing_ts = datetime.now(timezone.utc) - timedelta(seconds=45)
    active_order.simulation_started_at = ongoing_ts

    async def fake_active(_db, _order_id):
        return active_order

    monkeypatch.setattr("app.services.order_service.get_order_by_id", fake_active)

    # Simulación activa (<180s) conserva su timestamp si otro visor abre start
    res_active = await sync_order_tracking_simulation(db, active_order.id, action="start", mode="SIMULATION")
    assert res_active.simulation_started_at == ongoing_ts

    # Simulación expirada (>=180s) genera timestamp nuevo al iniciar
    expired_ts = datetime.now(timezone.utc) - timedelta(seconds=220)
    active_order.simulation_started_at = expired_ts
    res_refreshed = await sync_order_tracking_simulation(db, active_order.id, action="start", mode="SIMULATION")
    assert res_refreshed.simulation_started_at > expired_ts
