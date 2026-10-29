import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock
import pytest
from app.core.security import create_access_token
from app.models.enums import UserRoleEnum, OrderStatusEnum, ServiceTypeEnum
from app.models.user import User, Technician
from app.models.client import Client
from app.models.work_order import WorkOrder, OrderStatusHistory


@pytest.fixture
def test_user():
    return User(
        id=uuid.uuid4(),
        email="admin@atlasfsm.cl",
        full_name="Admin Pruebas",
        role=UserRoleEnum.ADMIN,
        is_active=True,
    )


@pytest.fixture
def auth_headers(test_user):
    token = create_access_token(
        subject=str(test_user.id),
        role=test_user.role.value,
    )
    return {"Authorization": f"Bearer {token}"}


def test_activity_log_requires_authentication(client):
    response = client.get("/api/v1/orders/activity-log")
    assert response.status_code == 401


def test_activity_log_empty_when_no_records(client, db, test_user, auth_headers):
    # Simular usuario autenticado en BD
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = test_user

    # Simular lista vacía de historial
    history_res = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = []
    history_res.scalars.return_value = scalars_mock

    db.execute.side_effect = [user_res, history_res]

    response = client.get("/api/v1/orders/activity-log", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_activity_log_returns_real_records(client, db, test_user, auth_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = test_user

    now = datetime.now(timezone.utc)
    order_id = uuid.uuid4()
    history_id = uuid.uuid4()

    mock_client = Client(
        id=uuid.uuid4(),
        business_name="Falabella Retail",
        contact_phone="+56911112222",
        contact_email="contacto@falabella.cl",
        address="Ahumada 200",
        comuna="Santiago",
    )
    mock_order = WorkOrder(
        id=order_id,
        order_number="#OT-08501",
        title="Instalación router",
        service_type=ServiceTypeEnum.DIAGNOSTICO_ROUTER,
        client=mock_client,
    )
    mock_history = OrderStatusHistory(
        id=history_id,
        work_order_id=order_id,
        work_order=mock_order,
        old_status=OrderStatusEnum.CONFIRMADA,
        new_status=OrderStatusEnum.EN_RUTA,
        changed_by_user_id=test_user.id,
        changed_by_user=test_user,
        comment="Técnico inició ruta hacia el cliente",
        created_at=now,
    )

    history_res = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [mock_history]
    history_res.scalars.return_value = scalars_mock

    db.execute.side_effect = [user_res, history_res]

    response = client.get("/api/v1/orders/activity-log", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    item = data[0]
    assert item["order_number"] == "#OT-08501"
    assert item["technician_name"] == "Admin Pruebas"
    assert item["action"] == "Técnico inició ruta hacia el cliente"
    assert item["old_status"] == "CONFIRMADA"
    assert item["new_status"] == "EN_RUTA"


def test_activity_log_invalid_limit(client, db, test_user, auth_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = test_user
    db.execute.return_value = user_res

    response = client.get("/api/v1/orders/activity-log?limit=200", headers=auth_headers)
    assert response.status_code == 422


def test_activity_log_no_conflict_with_dynamic_routes(client, db, test_user, auth_headers):
    """
    Verifica que /api/v1/orders/activity-log sea resuelto por su handler propio y
    no colisione con el handler dinámico /{order_id} (que espera un UUID).
    """
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = test_user

    history_res = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = []
    history_res.scalars.return_value = scalars_mock

    db.execute.side_effect = [user_res, history_res]

    # 1. /activity-log retorna 200 (resuelto como ruta estática, no intenta castear a UUID)
    response = client.get("/api/v1/orders/activity-log", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []

    # 2. Una ruta no-UUID que no existe retorna 422 (validación de UUID en /{order_id})
    user_res2 = MagicMock()
    user_res2.scalar_one_or_none.return_value = test_user
    db.execute.side_effect = [user_res2]
    bad_slug_response = client.get("/api/v1/orders/no-un-uuid", headers=auth_headers)
    assert bad_slug_response.status_code == 422

    # 3. Un UUID válido que no existe en BD es resuelto por /{order_id} retornando 404
    user_res3 = MagicMock()
    user_res3.scalar_one_or_none.return_value = test_user
    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = None
    db.execute.side_effect = [user_res3, order_res]
    non_existent_uuid = uuid.uuid4()
    uuid_response = client.get(f"/api/v1/orders/{non_existent_uuid}", headers=auth_headers)
    assert uuid_response.status_code == 404

