import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, AsyncMock

import pytest
from app.core.security import create_access_token
from app.models.enums import UserRoleEnum, OrderStatusEnum, ServiceTypeEnum, OrderPriorityEnum
from app.models.user import User, Technician
from app.models.client import Client
from app.models.work_order import WorkOrder


@pytest.fixture
def admin_user():
    return User(
        id=uuid.uuid4(),
        email="admin@atlasfsm.cl",
        full_name="Alejandro Admin",
        role=UserRoleEnum.ADMIN,
        is_active=True,
    )


@pytest.fixture
def coordinator_user():
    return User(
        id=uuid.uuid4(),
        email="coord@atlasfsm.cl",
        full_name="Carla Coordinadora",
        role=UserRoleEnum.COORDINADOR,
        is_active=True,
    )


@pytest.fixture
def technician_user():
    return User(
        id=uuid.uuid4(),
        email="tech@atlasfsm.cl",
        full_name="Pedro Técnico",
        role=UserRoleEnum.TECNICO,
        is_active=True,
    )


@pytest.fixture
def admin_headers(admin_user):
    token = create_access_token(subject=str(admin_user.id), role=admin_user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def coord_headers(coordinator_user):
    token = create_access_token(subject=str(coordinator_user.id), role=coordinator_user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def tech_headers(technician_user):
    token = create_access_token(subject=str(technician_user.id), role=technician_user.role.value)
    return {"Authorization": f"Bearer {token}"}


def create_mock_client(name="Entel B2B Corp", rut="76.111.222-3", orders=None):
    c = Client(
        id=uuid.uuid4(),
        rut=rut,
        business_name=name,
        contact_person="Carlos Contacto",
        contact_phone="+56912345678",
        contact_email="carlos@entelb2b.cl",
        address="Av. Costanera 123",
        comuna="Providencia",
        region="Metropolitana",
        lat=-33.4320,
        lng=-70.6093,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    c.work_orders = orders or []
    return c


def test_list_clients_requires_auth(client):
    res = client.get("/api/v1/clients")
    assert res.status_code == 401


def test_list_clients_success(client, db, coordinator_user, coord_headers):
    # Mock auth user
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    mock_c1 = create_mock_client("Empresas Providencia S.A.", "76.123.456-7")
    mock_c2 = create_mock_client("BancoEstado Casa Matriz", "97.036.000-K")

    clients_res = MagicMock()
    clients_res.scalars.return_value.all.return_value = [mock_c1, mock_c2]

    db.execute.side_effect = [user_res, clients_res]

    res = client.get("/api/v1/clients", headers=coord_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    assert data[0]["business_name"] == "Empresas Providencia S.A."
    assert data[1]["business_name"] == "BancoEstado Casa Matriz"
    assert "active_orders_count" in data[0]
    assert "total_orders_count" in data[0]


def test_create_client_rbac_technician_forbidden(client, db, technician_user, tech_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = technician_user
    db.execute.return_value = user_res

    payload = {
        "business_name": "Nuevo Cliente SpA",
        "contact_email": "contacto@nuevocliente.cl",
        "contact_phone": "+56987654321",
        "address": "Calle Moneda 500",
        "comuna": "Santiago",
    }
    res = client.post("/api/v1/clients", json=payload, headers=tech_headers)
    assert res.status_code == 403


def test_create_client_success_as_coordinator(client, db, coordinator_user, coord_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    rut_check = MagicMock()
    rut_check.scalar_one_or_none.return_value = None

    name_check = MagicMock()
    name_check.scalar_one_or_none.return_value = None

    db.execute.side_effect = [user_res, rut_check, name_check]

    payload = {
        "business_name": "Clínica Alemana Santiago",
        "contact_email": "telecom@alemana.cl",
        "contact_phone": "+56999887766",
        "address": "Av. Manquehue Norte 1410",
        "comuna": "Vitacura",
        "rut": "70.256.300-1",
        "contact_person": "Dra. Marcela Vidal",
    }
    res = client.post("/api/v1/clients", json=payload, headers=coord_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["business_name"] == "Clínica Alemana Santiago"
    assert data["contact_email"] == "telecom@alemana.cl"
    assert data["comuna"] == "Vitacura"


def test_create_client_duplicate_rut_rejected(client, db, coordinator_user, coord_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    existing_client = create_mock_client("Empresa Existente", "76.123.456-7")
    rut_check = MagicMock()
    rut_check.scalar_one_or_none.return_value = existing_client

    db.execute.side_effect = [user_res, rut_check]

    payload = {
        "business_name": "Otra Empresa SpA",
        "contact_email": "otra@empresa.cl",
        "contact_phone": "+56911223344",
        "address": "Calle Test 123",
        "comuna": "Santiago",
        "rut": "76.123.456-7",
    }
    res = client.post("/api/v1/clients", json=payload, headers=coord_headers)
    assert res.status_code == 400
    assert "Ya existe un cliente registrado con el RUT" in res.json()["detail"]


def test_get_client_detail_with_orders(client, db, coordinator_user, coord_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    mock_client = create_mock_client("Torre Costanera Hub", "77.888.999-1")
    order = WorkOrder(
        id=uuid.uuid4(),
        order_number="#OT-08498",
        title="Instalación Enlace 10G",
        service_type=ServiceTypeEnum.INSTALACION_FIBRA,
        status=OrderStatusEnum.EN_RUTA,
        priority=OrderPriorityEnum.URGENTE,
        client=mock_client,
        client_id=mock_client.id,
        scheduled_date=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    mock_client.work_orders = [order]

    client_res = MagicMock()
    client_res.scalar_one_or_none.return_value = mock_client

    db.execute.side_effect = [user_res, client_res]

    res = client.get(f"/api/v1/clients/{mock_client.id}", headers=coord_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["business_name"] == "Torre Costanera Hub"
    assert data["active_orders_count"] == 1
    assert data["total_orders_count"] == 1
    assert len(data["orders"]) == 1
    assert data["orders"][0]["order_number"] == "#OT-08498"
    assert data["orders"][0]["status"] == "EN_RUTA"


def test_update_client_success(client, db, coordinator_user, coord_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    mock_client = create_mock_client("Empresas Vitacura", "78.999.111-2")
    client_res = MagicMock()
    client_res.scalar_one_or_none.return_value = mock_client

    db.execute.side_effect = [user_res, client_res]

    payload = {
        "contact_phone": "+56911229988",
        "contact_email": "nuevo_email@vitacura.cl",
        "address": "Av. Vitacura 5000",
    }
    res = client.patch(f"/api/v1/clients/{mock_client.id}", json=payload, headers=coord_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["contact_phone"] == "+56911229988"
    assert data["contact_email"] == "nuevo_email@vitacura.cl"
    assert data["address"] == "Av. Vitacura 5000"


def test_delete_client_blocked_when_has_orders(client, db, admin_user, admin_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = admin_user

    mock_client = create_mock_client("Cliente Con Historial", "76.999.888-1")
    dummy_order = WorkOrder(id=uuid.uuid4(), order_number="#OT-08500")
    mock_client.work_orders = [dummy_order]

    client_res = MagicMock()
    client_res.scalar_one_or_none.return_value = mock_client

    db.execute.side_effect = [user_res, client_res]

    res = client.delete(f"/api/v1/clients/{mock_client.id}", headers=admin_headers)
    assert res.status_code == 400
    assert "No se puede eliminar el cliente" in res.json()["detail"]


def test_delete_client_success_without_orders(client, db, admin_user, admin_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = admin_user

    mock_client = create_mock_client("Cliente Sin Historial", "79.111.222-3")
    mock_client.work_orders = []

    client_res = MagicMock()
    client_res.scalar_one_or_none.return_value = mock_client

    db.execute.side_effect = [user_res, client_res]

    res = client.delete(f"/api/v1/clients/{mock_client.id}", headers=admin_headers)
    assert res.status_code == 204
