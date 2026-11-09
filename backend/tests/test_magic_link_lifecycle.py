import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.core.security import generate_magic_link_token
from app.models.enums import OrderStatusEnum, ServiceTypeEnum
from app.services.client_service import (
    validate_magic_link_token,
    compute_timeline_steps,
    _build_summary_response,
)
from app.services.auth_service import (
    revoke_magic_link_for_order,
)


@pytest.fixture
def sample_order():
    now_utc = datetime(2026, 11, 9, 20, 17, 0, tzinfo=timezone.utc)
    order = SimpleNamespace(
        id=uuid.uuid4(),
        order_number="#OT-08494",
        title="Prueba GPS Android 1.0.3",
        status=OrderStatusEnum.EN_SITIO,
        service_type=ServiceTypeEnum.DIAGNOSTICO_ROUTER,
        scheduled_date=now_utc,
        eta=now_utc,
        address_override="Av. Providencia 1234",
        comuna_override="Providencia",
        client=None,
        technician=None,
        technician_id=None,
        status_history=[
            SimpleNamespace(
                new_status=OrderStatusEnum.CONFIRMADA,
                created_at=datetime(2026, 11, 9, 18, 0, 0, tzinfo=timezone.utc),
                comment=None,
            ),
            SimpleNamespace(
                new_status=OrderStatusEnum.EN_RUTA,
                created_at=datetime(2026, 11, 9, 19, 0, 0, tzinfo=timezone.utc),
                comment=None,
            ),
            SimpleNamespace(
                new_status=OrderStatusEnum.EN_SITIO,
                created_at=datetime(2026, 11, 9, 20, 6, 0, tzinfo=timezone.utc),
                comment=None,
            ),
        ],
        evidences=[],
        magic_links=[],
        lat=None,
        lng=None,
        completed_at=None,
    )
    return order


@pytest.mark.asyncio
async def test_validate_magic_link_token_success(sample_order):
    db = MagicMock()
    token = generate_magic_link_token()
    ml = SimpleNamespace(
        id=uuid.uuid4(),
        token=token,
        work_order_id=sample_order.id,
        work_order=sample_order,
        is_active=True,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        client_confirmed_at=None,
        signature_url=None,
    )

    result = MagicMock()
    result.scalar_one_or_none.return_value = ml
    db.execute = AsyncMock(return_value=result)

    validated = await validate_magic_link_token(db, token)
    assert validated.id == ml.id
    assert validated.is_active is True


@pytest.mark.asyncio
async def test_validate_magic_link_token_expired(sample_order):
    db = MagicMock()
    token = generate_magic_link_token()
    ml = SimpleNamespace(
        id=uuid.uuid4(),
        token=token,
        work_order_id=sample_order.id,
        work_order=sample_order,
        is_active=True,
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        client_confirmed_at=None,
        signature_url=None,
    )

    result = MagicMock()
    result.scalar_one_or_none.return_value = ml
    db.execute = AsyncMock(return_value=result)

    with pytest.raises(HTTPException) as exc_info:
        await validate_magic_link_token(db, token)
    assert exc_info.value.status_code == 410


@pytest.mark.asyncio
async def test_validate_magic_link_token_revoked(sample_order):
    db = MagicMock()
    token = generate_magic_link_token()
    ml = SimpleNamespace(
        id=uuid.uuid4(),
        token=token,
        work_order_id=sample_order.id,
        work_order=sample_order,
        is_active=False,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        client_confirmed_at=None,
        signature_url=None,
    )

    result = MagicMock()
    result.scalar_one_or_none.return_value = ml
    db.execute = AsyncMock(return_value=result)

    with pytest.raises(HTTPException) as exc_info:
        await validate_magic_link_token(db, token)
    assert exc_info.value.status_code == 410


@pytest.mark.asyncio
async def test_validate_magic_link_token_not_found():
    db = MagicMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)

    with pytest.raises(HTTPException) as exc_info:
        await validate_magic_link_token(db, "nonexistent-token")
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_revoke_magic_link_for_order(sample_order):
    db = MagicMock()
    ml1 = SimpleNamespace(
        id=uuid.uuid4(),
        token="token-1",
        work_order_id=sample_order.id,
        is_active=True,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    ml2 = SimpleNamespace(
        id=uuid.uuid4(),
        token="token-2",
        work_order_id=sample_order.id,
        is_active=True,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    sample_order.magic_links = [ml1, ml2]

    result = MagicMock()
    result.scalar_one_or_none.return_value = sample_order
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()

    res = await revoke_magic_link_for_order(db, sample_order.id)
    assert res["success"] is True
    assert res["revoked_count"] == 2
    assert ml1.is_active is False
    assert ml2.is_active is False
    db.commit.assert_awaited_once()


def test_compute_timeline_steps_chile_timezone(sample_order):
    """Verifica que 20:06 UTC se formatee como 17:06 en horario de Chile (UTC-3)."""
    steps = compute_timeline_steps(sample_order)
    assert len(steps) == 4

    confirmada = next(s for s in steps if s.key == "confirmada")
    assert confirmada.completed is True
    assert confirmada.timestamp == "15:00"  # 18:00 UTC - 3h = 15:00

    en_ruta = next(s for s in steps if s.key == "en_ruta")
    assert en_ruta.completed is True
    assert en_ruta.timestamp == "16:00"  # 19:00 UTC - 3h = 16:00

    en_sitio = next(s for s in steps if s.key == "en_sitio")
    assert en_sitio.current is True
    assert en_sitio.timestamp == "17:06"  # 20:06 UTC - 3h = 17:06
    assert en_sitio.raw_timestamp is not None


def test_summary_privacy_no_gps_on_site(sample_order):
    """En EN_SITIO o posterior, la ubicación del técnico debe ser estrictamente None."""
    tech = SimpleNamespace(
        id=uuid.uuid4(),
        user=SimpleNamespace(full_name="Técnico Prueba", phone="+56911112222"),
        initials="TP",
        vehicle_plate="JJ-1234",
        rut="12.345.678-9",
        current_lat=-33.4372,
        current_lng=-70.6506,
        last_location_at=datetime.now(timezone.utc),
    )
    sample_order.technician = tech
    sample_order.status = OrderStatusEnum.EN_SITIO

    summary = _build_summary_response(sample_order)
    assert summary.technician_location is None
    assert summary.is_completed is False


def test_summary_completed_state(sample_order):
    """En COMPLETADA, is_completed es True y eta_label es 'Servicio finalizado'."""
    sample_order.status = OrderStatusEnum.COMPLETADA
    sample_order.completed_at = datetime(2026, 11, 9, 20, 17, 0, tzinfo=timezone.utc)

    summary = _build_summary_response(sample_order)
    assert summary.is_completed is True
    assert summary.eta is None
    assert summary.eta_label == "Servicio finalizado"
    assert summary.technician_location is None


def test_summary_cancelled_state(sample_order):
    """En CANCELADA, status_key es cancelada, eta es None y eta_label es 'Servicio cancelado'."""
    sample_order.status = OrderStatusEnum.CANCELADA

    summary = _build_summary_response(sample_order)
    assert summary.status_key == "cancelada"
    assert summary.is_completed is False
    assert summary.eta is None
    assert summary.eta_label == "Servicio cancelado"
    assert summary.technician_location is None
