"""
backend/tests/test_order_geolocation.py

Pruebas automatizadas para el endpoint de geocodificación abierta y
actualización de ubicación geográfica (lat/lng) en órdenes de trabajo.
"""

import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import patch, MagicMock, AsyncMock
import pytest
from fastapi import status

from app.core.security import create_access_token
from app.models.enums import UserRoleEnum, OrderStatusEnum, OrderPriorityEnum, ServiceTypeEnum
from app.models.user import User
from app.models.client import Client
from app.models.work_order import WorkOrder
from app.schemas.work_order import WorkOrderUpdate


@pytest.fixture
def coordinator_user():
    return User(
        id=uuid.uuid4(),
        email="coordinador@atlasfsm.cl",
        full_name="Constanza Coordinadora",
        role=UserRoleEnum.COORDINADOR,
        is_active=True,
        auth_version=0,
    )


@pytest.fixture
def coord_auth_headers(coordinator_user):
    token = create_access_token(
        subject=str(coordinator_user.id),
        role=coordinator_user.role.value,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_client():
    return Client(
        id=uuid.uuid4(),
        business_name="Entel B2B Soluciones",
        contact_person="Juan Pérez",
        contact_phone="+56 9 8888 7777",
        contact_email="juan.perez@entel.cl",
        address="Av. Apoquindo 3000",
        comuna="Las Condes",
        region="Metropolitana",
        lat=None,
        lng=None,
    )


@pytest.fixture
def sample_order(sample_client, coordinator_user):
    order = WorkOrder(
        id=uuid.uuid4(),
        order_number="#OT-08492",
        title="Instalación Router - Prueba ATLAS 02",
        description="Instalación de equipamiento router 4G/5G",
        service_type=ServiceTypeEnum.DIAGNOSTICO_ROUTER,
        priority=OrderPriorityEnum.MEDIA,
        status=OrderStatusEnum.COMPLETADA,
        client_id=sample_client.id,
        client=sample_client,
        address_override="Av. Apoquindo 3000, Las Condes",
        comuna_override="Las Condes",
        lat=None,
        lng=None,
        is_audited=False,
        created_by=coordinator_user.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    order.technician = None
    order.auditor = None
    order.magic_links = []
    order.status_history = []
    order.items = []
    order.evidences = []
    return order


# ─── 1. Validación de esquemas WorkOrderUpdate ───────────────────────────────

def test_work_order_update_schema_accepts_coordinates():
    update_data = WorkOrderUpdate(
        lat=Decimal("-33.416821"),
        lng=Decimal("-70.598912"),
        address_override="Av. Apoquindo 3000, Las Condes",
    )
    dumped = update_data.model_dump(exclude_unset=True)
    assert dumped["lat"] == Decimal("-33.416821")
    assert dumped["lng"] == Decimal("-70.598912")
    assert dumped["address_override"] == "Av. Apoquindo 3000, Las Condes"


def test_work_order_update_allows_nullable_coordinates():
    update_data = WorkOrderUpdate(
        lat=None,
        lng=None,
    )
    dumped = update_data.model_dump(exclude_unset=True)
    assert dumped["lat"] is None
    assert dumped["lng"] is None


# ─── 2. Endpoint GET /api/v1/orders/geocode ─────────────────────────────────

def test_geocode_endpoint_success(client, db, coordinator_user, coord_auth_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user
    db.execute.return_value = user_res

    mock_nominatim_data = [
        {
            "lat": "-33.42905",
            "lon": "-70.62114",
            "display_name": "Avenida Providencia 1234, Providencia, Santiago, Chile",
        }
    ]

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps(mock_nominatim_data).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        res = client.get(
            "/api/v1/orders/geocode?query=Av.+Providencia+1234",
            headers=coord_auth_headers,
        )

    assert res.status_code == status.HTTP_200_OK
    body = res.json()
    assert body["success"] is True
    assert body["lat"] == pytest.approx(-33.42905, rel=1e-4)
    assert body["lng"] == pytest.approx(-70.62114, rel=1e-4)


def test_geocode_endpoint_not_found(client, db, coordinator_user, coord_auth_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user
    db.execute.return_value = user_res

    mock_resp = MagicMock()
    mock_resp.read.return_value = b"[]"
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        res = client.get(
            "/api/v1/orders/geocode?query=DireccionInexistente123456789",
            headers=coord_auth_headers,
        )

    assert res.status_code == status.HTTP_200_OK
    body = res.json()
    assert body["success"] is False
    assert body["lat"] is None
    assert body["lng"] is None
    assert "No se pudo localizar" in body["error"]


# ─── 3. Endpoint PATCH /api/v1/orders/{order_id} ─────────────────────────────

def test_patch_work_order_endpoint(client, db, coordinator_user, coord_auth_headers, sample_order):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user
    db.execute.return_value = user_res

    sample_order.lat = Decimal("-33.416821")
    sample_order.lng = Decimal("-70.598912")

    with patch("app.api.v1.orders.update_order", new_callable=AsyncMock) as mock_update:
        mock_update.return_value = sample_order
        res = client.patch(
            f"/api/v1/orders/{sample_order.id}",
            json={
                "lat": -33.416821,
                "lng": -70.598912,
                "address_override": "Av. Apoquindo 3000, Las Condes",
            },
            headers=coord_auth_headers,
        )

    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["order_number"] == "#OT-08492"
    assert float(data["lat"]) == pytest.approx(-33.416821, rel=1e-5)
    assert float(data["lng"]) == pytest.approx(-70.598912, rel=1e-5)
