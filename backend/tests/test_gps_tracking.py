"""
Pruebas integrales de seguimiento GPS y telemetría (Fase GPS ATLAS).
Valida mediante TestClient:
1. Recepción y persistencia de coordenadas válidas de técnicos autenticados.
2. Validación de asignación: solo el técnico asignado (o coordinador/admin) puede reportar GPS.
3. Validación de estado: actualizaciones admitidas ÚNICAMENTE durante estado EN_RUTA (HTTP 409).
4. Validación Pydantic de rango WGS84 (latitud [-90, 90], longitud [-180, 180]).
5. Exposición en Portal Cliente (Magic Link):
   - Coordenadas visibles en resumen y tracking exclusivamente mientras la orden está EN_RUTA.
   - Ocultamiento estricto de coordenadas cuando la orden pasa a EN_SITIO, COMPLETADA o CANCELADA.
6. Consulta de telemetría consolidada para el Tablero de Despacho (/technicians/locations).
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock, AsyncMock, patch

import pytest
from pydantic import ValidationError

from app.core.security import create_access_token
from app.models.enums import OrderStatusEnum, ServiceTypeEnum, UserRoleEnum
from app.models.user import User, Technician
from app.models.work_order import WorkOrder
from app.models.client import Client
from app.models.magic_link import MagicLink
from app.schemas.work_order import WorkOrderLocationUpdate


def make_technician(t_id=None, full_name="Carlos Técnico"):
    uid = t_id or uuid.uuid4()
    u = User(
        id=uid,
        email="tecnico@atlasfsm.cl",
        full_name=full_name,
        role=UserRoleEnum.TECNICO,
        is_active=True,
    )
    t = Technician(
        id=uid,
        user=u,
        rut="15.111.222-3",
        initials="CT",
        vehicle_plate="ABCD-12",
        current_lat=Decimal("-33.4489000"),
        current_lng=Decimal("-70.6693000"),
        is_available=True,
    )
    u.technician_profile = t
    return u, t


def make_order(order_id=None, technician_id=None, status=OrderStatusEnum.EN_RUTA):
    oid = order_id or uuid.uuid4()
    now = datetime.now(timezone.utc)
    c = Client(
        id=uuid.uuid4(),
        business_name="Entel Test Corp",
        contact_phone="+56911223344",
        contact_email="test@entel.cl",
        address="Amunategui 20",
        comuna="Santiago",
        lat=Decimal("-33.4489000"),
        lng=Decimal("-70.6693000"),
    )
    return WorkOrder(
        id=oid,
        order_number="#OT-08500",
        title="Instalación Router 5G",
        service_type=ServiceTypeEnum.DIAGNOSTICO_ROUTER,
        status=status,
        client=c,
        client_id=c.id,
        technician_id=technician_id,
        lat=Decimal("-33.4489000"),
        lng=Decimal("-70.6693000"),
        created_at=now,
        updated_at=now,
        is_audited=False,
    )


# ─── 1. Pruebas de Validación Pydantic ──────────────────────────────────────

def test_work_order_location_update_valid_coords():
    payload = WorkOrderLocationUpdate(
        lat=Decimal("-33.4489000"),
        lng=Decimal("-70.6693000"),
    )
    assert payload.lat == Decimal("-33.4489000")
    assert payload.lng == Decimal("-70.6693000")


def test_work_order_location_update_invalid_bounds():
    with pytest.raises(ValidationError):
        WorkOrderLocationUpdate(lat=Decimal("95.0"), lng=Decimal("-70.0"))
    with pytest.raises(ValidationError):
        WorkOrderLocationUpdate(lat=Decimal("-95.0"), lng=Decimal("-70.0"))
    with pytest.raises(ValidationError):
        WorkOrderLocationUpdate(lat=Decimal("-33.0"), lng=Decimal("185.0"))
    with pytest.raises(ValidationError):
        WorkOrderLocationUpdate(lat=Decimal("-33.0"), lng=Decimal("-185.0"))


# ─── 2. Endpoint POST /api/v1/orders/{order_id}/location ────────────────────

def test_record_location_success(client, db):
    u, t = make_technician()
    order = make_order(technician_id=u.id, status=OrderStatusEnum.EN_RUTA)
    order.technician = t

    # Mock DB queries
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = u

    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = order

    db.execute.side_effect = [user_res, order_res]
    db.get = AsyncMock(return_value=t)

    token = create_access_token(subject=str(u.id), role=u.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        f"/api/v1/orders/{order.id}/location",
        json={"lat": -33.4567890, "lng": -70.6543210},
        headers=headers,
    )

    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["order_id"] == str(order.id)
    assert data["technician_id"] == str(t.id)
    assert float(data["current_lat"]) == pytest.approx(-33.4567890, abs=1e-5)
    assert float(data["current_lng"]) == pytest.approx(-70.6543210, abs=1e-5)
    assert data["status"] == "EN_RUTA"


def test_record_location_forbidden_for_other_technician(client, db):
    assigned_u, assigned_t = make_technician()
    intruder_u, intruder_t = make_technician(full_name="Pedro Intruso")
    order = make_order(technician_id=assigned_u.id, status=OrderStatusEnum.EN_RUTA)

    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = intruder_u

    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = order

    db.execute.side_effect = [user_res, order_res]

    token = create_access_token(subject=str(intruder_u.id), role=intruder_u.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        f"/api/v1/orders/{order.id}/location",
        json={"lat": -33.45, "lng": -70.65},
        headers=headers,
    )

    assert res.status_code == 403
    assert "no está asignado" in res.json()["detail"]


def test_record_location_conflict_when_order_not_en_ruta(client, db):
    u, t = make_technician()
    order = make_order(technician_id=u.id, status=OrderStatusEnum.EN_SITIO)

    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = u

    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = order

    db.execute.side_effect = [user_res, order_res]

    token = create_access_token(subject=str(u.id), role=u.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        f"/api/v1/orders/{order.id}/location",
        json={"lat": -33.45, "lng": -70.65},
        headers=headers,
    )

    assert res.status_code == 409
    assert "Solo se admiten actualizaciones de ubicación mientras la orden está en estado EN_RUTA" in res.json()["detail"]


def test_record_location_order_not_found(client, db):
    u, t = make_technician()

    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = u

    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = None

    db.execute.side_effect = [user_res, order_res]

    token = create_access_token(subject=str(u.id), role=u.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    random_id = uuid.uuid4()
    res = client.post(
        f"/api/v1/orders/{random_id}/location",
        json={"lat": -33.45, "lng": -70.65},
        headers=headers,
    )

    assert res.status_code == 404


# ─── 3. Endpoint GET /api/v1/orders/technicians/locations ───────────────────

def test_technician_last_location_at_not_default_to_updated_at():
    """Valida que last_location_at sea None si no hubo ping GPS real, sin usar updated_at."""
    u, t = make_technician()
    t.updated_at = datetime.now(timezone.utc)
    assert t.last_location_at is None

    real_time = datetime(2026, 11, 6, 20, 0, 0, tzinfo=timezone.utc)
    t.last_location_at = real_time
    assert t.last_location_at == real_time


def test_get_technicians_locations(client, db):
    u, t = make_technician()
    t.last_location_at = datetime.now(timezone.utc)
    coord_u = User(
        id=uuid.uuid4(),
        email="coord@atlasfsm.cl",
        full_name="Coord",
        role=UserRoleEnum.COORDINADOR,
        is_active=True,
        auth_version=0,
    )

    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coord_u

    tech_res = MagicMock()
    tech_res.scalars.return_value.all.return_value = [t]

    # Caso 1: Sin orden EN_RUTA -> Ubicación oculta (privacidad estricta)
    orders_res_empty = MagicMock()
    orders_res_empty.scalars.return_value.all.return_value = []

    db.execute.side_effect = [user_res, tech_res, orders_res_empty]

    token = create_access_token(subject=str(coord_u.id), role=coord_u.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/orders/technicians/locations", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["technician_id"] == str(t.id)
    assert data[0]["current_lat"] is None
    assert data[0]["current_lng"] is None
    assert data[0]["last_location_at"] is None

    # Caso 2: Con orden EN_RUTA autorizada -> Coordenadas expuestas
    order_en_ruta = make_order(technician_id=t.id, status=OrderStatusEnum.EN_RUTA)
    orders_res_en_ruta = MagicMock()
    orders_res_en_ruta.scalars.return_value.all.return_value = [order_en_ruta]

    db.execute.side_effect = [user_res, tech_res, orders_res_en_ruta]
    res_en_ruta = client.get("/api/v1/orders/technicians/locations", headers=headers)
    assert res_en_ruta.status_code == 200
    data_en_ruta = res_en_ruta.json()
    assert float(data_en_ruta[0]["current_lat"]) == pytest.approx(-33.4489, abs=1e-4)
    assert float(data_en_ruta[0]["current_lng"]) == pytest.approx(-70.6693, abs=1e-4)
    assert data_en_ruta[0]["last_location_at"] is not None


# ─── 4. Portal Cliente: Telemetría y Privacidad Estricta ─────────────────────

def test_client_portal_summary_gps_exposure_only_in_en_ruta(client, db):
    from datetime import timedelta
    u, t = make_technician()
    t.last_location_at = datetime.now(timezone.utc)
    order = make_order(technician_id=u.id, status=OrderStatusEnum.EN_RUTA)
    order.technician = t

    magic_link = MagicLink(
        id=uuid.uuid4(),
        work_order_id=order.id,
        work_order=order,
        token="test_token",
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )

    ml_res = MagicMock()
    ml_res.scalar_one_or_none.return_value = magic_link
    db.execute.return_value = ml_res

    res = client.get("/api/v1/client/order-summary?token=test_token")
    assert res.status_code == 200
    data = res.json()
    assert data["technician_location"] is not None
    assert float(data["technician_location"]["lat"]) == pytest.approx(-33.4489, abs=1e-4)
    assert data["technician_location"]["is_live"] is True

    # Cambiar estado a EN_SITIO -> Ubicación debe ocultarse
    order.status = OrderStatusEnum.EN_SITIO
    res_sitio = client.get("/api/v1/client/order-summary?token=test_token")
    assert res_sitio.status_code == 200
    assert res_sitio.json()["technician_location"] is None

    # Cambiar estado a COMPLETADA -> Ubicación debe permanecer oculta
    order.status = OrderStatusEnum.COMPLETADA
    res_comp = client.get("/api/v1/client/order-summary?token=test_token")
    assert res_comp.status_code == 200
    assert res_comp.json()["technician_location"] is None


def test_client_portal_live_tracking_endpoint(client, db):
    from datetime import timedelta
    u, t = make_technician()
    t.last_location_at = datetime.now(timezone.utc)
    order = make_order(technician_id=u.id, status=OrderStatusEnum.EN_RUTA)
    order.technician = t

    magic_link = MagicLink(
        id=uuid.uuid4(),
        work_order_id=order.id,
        work_order=order,
        token="test_token",
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )

    ml_res = MagicMock()
    ml_res.scalar_one_or_none.return_value = magic_link
    db.execute.return_value = ml_res

    # Durante EN_RUTA: coordenadas activas
    res = client.get("/api/v1/client/tracking?token=test_token")
    assert res.status_code == 200
    data = res.json()
    assert data["is_live"] is True
    assert float(data["lat"]) == pytest.approx(-33.4489, abs=1e-4)

    # Durante EN_SITIO: is_live = False, lat/lng = None
    order.status = OrderStatusEnum.EN_SITIO
    res_sitio = client.get("/api/v1/client/tracking?token=test_token")
    assert res_sitio.status_code == 200
    data_sitio = res_sitio.json()
    assert data_sitio["is_live"] is False
    assert data_sitio["lat"] is None
    assert data_sitio["lng"] is None
