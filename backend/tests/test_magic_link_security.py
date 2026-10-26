import logging
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from uvicorn.logging import AccessFormatter

from app.core.database import engine
from app.core.config import settings
from app.core.logging import RedactAccessTokenFilter
from app.core.security import generate_magic_link_token
from app.models.enums import OrderStatusEnum, ServiceTypeEnum
from app.services import client_service
from app.services.auth_service import generate_magic_link_for_order


@pytest.fixture
def link():
    now = datetime.now(timezone.utc)
    order = SimpleNamespace(
        id=uuid.uuid4(), order_number="#OT-TEST-001", title="Visita sintética",
        status=OrderStatusEnum.EN_SITIO,
        service_type=ServiceTypeEnum.INSTALACION_FIBRA,
        scheduled_date=now, eta=None, address_override="Dirección de prueba",
        comuna_override="Comuna de prueba", client=None, technician=None,
        technician_id=None, status_history=[], lat=None, lng=None,
    )
    return SimpleNamespace(
        id=uuid.uuid4(), token=generate_magic_link_token(), work_order=order,
        is_active=True, expires_at=now + timedelta(hours=1),
        client_confirmed_at=None, signature_url=None,
    )


def return_link(db, link):
    result = MagicMock()
    result.scalar_one_or_none.return_value = link
    db.execute.return_value = result


@pytest.mark.parametrize("endpoint", ["summary", "confirm", "sign"])
@pytest.mark.parametrize("state,expected", [("missing", 404), ("expired", 410), ("revoked", 410)])
def test_invalid_links_rejected_on_all_public_operations(client, db, link, endpoint, state, expected):
    if state == "expired":
        link.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    elif state == "revoked":
        link.is_active = False
    return_link(db, None if state == "missing" else link)
    params = {"token": link.token}
    if endpoint == "summary":
        response = client.get("/api/v1/client/order-summary", params=params)
    elif endpoint == "confirm":
        response = client.post("/api/v1/client/confirm-visit", params=params, json={"notes": "Prueba"})
    else:
        response = client.post("/api/v1/client/sign", params=params, json={
            "signature_base64": "synthetic-signature", "signed_by_name": "Persona de prueba",
        })
    assert response.status_code == expected
    assert link.token not in response.text
    assert "order_id" not in response.json()
    db.commit.assert_not_awaited()
    db.add.assert_not_called()


def test_valid_registered_link_preserves_summary_contract(client, db, link):
    return_link(db, link)
    response = client.get("/api/v1/client/order-summary", params={"token": link.token})
    assert response.status_code == 200
    data = response.json()
    assert data["order_id"] == str(link.work_order.id)
    assert data["order_number"] == link.work_order.order_number
    assert data["status_key"] == "en_sitio"
    assert len(data["timeline_steps"]) == 4
    assert not data["is_expired"]
    assert link.token not in response.text
    db.commit.assert_not_awaited()


def test_predictable_identifier_does_not_fall_back_to_order_lookup(client, db, link):
    # La segunda consulta resolvería la OT en la implementación vulnerable.
    missing_link = MagicMock()
    missing_link.scalar_one_or_none.return_value = None
    matching_order = MagicMock()
    matching_order.scalar_one_or_none.return_value = link.work_order
    link.work_order.id = uuid.UUID("00000000-0000-4000-8000-000000abcdef")
    link.work_order.order_number = "#OT-99999"
    db.execute.side_effect = [missing_link, matching_order]
    response = client.get("/api/v1/client/order-summary", params={"token": "atlas_ot-99999_abcdef"})
    assert response.status_code == 404
    assert db.execute.await_count == 1
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_link_expires_at_exact_deadline(db, link, monkeypatch):
    deadline = datetime(2026, 1, 1, tzinfo=timezone.utc)
    link.expires_at = deadline
    return_link(db, link)

    class FixedDateTime:
        @staticmethod
        def now(tz):
            return deadline

    monkeypatch.setattr(client_service, "datetime", FixedDateTime)
    with pytest.raises(HTTPException) as exc:
        await client_service.validate_magic_link_token(db, link.token)
    assert exc.value.status_code == 410


def test_missing_query_token_is_rejected_without_database_access(client, db):
    response = client.get("/api/v1/client/order-summary")
    assert response.status_code == 422
    db.execute.assert_not_awaited()


def test_sql_parameters_are_hidden():
    assert engine.sync_engine.hide_parameters is True


@pytest.mark.parametrize("query", ["token=synthetic-private-token", "TOKEN=synthetic-private-token", "%74oken=synthetic-private-token", "access_token=synthetic-private-token"])
def test_uvicorn_access_log_redacts_tokens_and_preserves_format(query):
    record = logging.LogRecord("uvicorn.access", logging.INFO, "", 0,
        '%s - "%s %s HTTP/%s" %d',
        ("127.0.0.1:1234", "GET", f"/api/v1/client/order-summary?{query}&other=ok", "1.1", 200), None)
    assert RedactAccessTokenFilter().filter(record)
    formatted = AccessFormatter('%(request_line)s %(status_code)s', use_colors=False).format(record)
    assert "synthetic-private-token" not in formatted
    assert "[REDACTED]" in formatted
    assert "other=ok" in formatted


def test_magic_link_generator_uses_random_32_byte_tokens():
    first, second = generate_magic_link_token(), generate_magic_link_token()
    assert first != second
    assert len(first) == len(second) == 43


@pytest.mark.asyncio
async def test_issuing_replacement_revokes_previous_link_and_preserves_url(db, link):
    order_result = MagicMock()
    order_result.scalar_one_or_none.return_value = link.work_order
    previous_result = MagicMock()
    previous_result.scalars.return_value.all.return_value = [link]
    db.execute.side_effect = [order_result, previous_result]

    async def refresh_generated(generated):
        generated.id = uuid.uuid4()

    db.refresh.side_effect = refresh_generated
    response = await generate_magic_link_for_order(db, link.work_order.id)
    assert not link.is_active
    assert response.is_active
    assert response.work_order_id == link.work_order.id
    assert response.token != link.token
    assert len(response.token) == 43
    assert response.portal_url == f"{settings.FRONTEND_PORTAL_URL}/{response.token}"
    db.commit.assert_awaited_once()
