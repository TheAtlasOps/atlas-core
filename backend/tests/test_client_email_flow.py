import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, AsyncMock, patch

import pytest
from app.core.security import create_access_token
from app.core.config import settings, Settings
from app.models.enums import UserRoleEnum, OrderStatusEnum, ServiceTypeEnum, OrderPriorityEnum
from app.models.user import User, Technician
from app.models.client import Client
from app.models.work_order import WorkOrder
from app.models.magic_link import MagicLink
from app.schemas.notification import EmailNotificationResponse


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
def coord_headers(coordinator_user):
    token = create_access_token(
        subject=str(coordinator_user.id),
        role=coordinator_user.role.value,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def tech_headers(technician_user):
    token = create_access_token(
        subject=str(technician_user.id),
        role=technician_user.role.value,
    )
    return {"Authorization": f"Bearer {token}"}


def create_mock_order_with_client(client_email="contacto@cliente.cl"):
    mock_client = Client(
        id=uuid.uuid4(),
        business_name="Entel IoT Corp",
        contact_person="Juan Pérez",
        contact_phone="+56911223344",
        contact_email=client_email,
        address="Av. Costanera 100",
        comuna="Las Condes",
    )
    order = WorkOrder(
        id=uuid.uuid4(),
        order_number="#OT-09999",
        title="Instalación Router IoT",
        service_type=ServiceTypeEnum.DIAGNOSTICO_ROUTER,
        priority=OrderPriorityEnum.MEDIA,
        status=OrderStatusEnum.CONFIRMADA,
        client=mock_client,
        client_id=mock_client.id,
        scheduled_date=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        status_history=[],
        magic_links=[],
        items=[],
    )
    return order


def test_update_client_email_requires_auth(client):
    order_id = uuid.uuid4()
    res = client.patch(
        f"/api/v1/orders/{order_id}/client-email",
        json={"contact_email": "nuevo@cliente.cl"},
    )
    assert res.status_code == 401


def test_update_client_email_forbidden_for_technician(client, db, technician_user, tech_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = technician_user
    db.execute.return_value = user_res

    order_id = uuid.uuid4()
    res = client.patch(
        f"/api/v1/orders/{order_id}/client-email",
        json={"contact_email": "nuevo@cliente.cl"},
        headers=tech_headers,
    )
    assert res.status_code == 403


def test_update_client_email_validation_error(client, db, coordinator_user, coord_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user
    db.execute.return_value = user_res

    order_id = uuid.uuid4()
    res = client.patch(
        f"/api/v1/orders/{order_id}/client-email",
        json={"contact_email": "correo-invalido-sin-arroba"},
        headers=coord_headers,
    )
    assert res.status_code == 422


def test_update_client_email_success(client, db, coordinator_user, coord_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    order = create_mock_order_with_client("antiguo@cliente.cl")
    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = order

    db.execute.side_effect = [user_res, order_res]

    res = client.patch(
        f"/api/v1/orders/{order.id}/client-email",
        json={"contact_email": "actualizado@cliente.cl"},
        headers=coord_headers,
    )
    assert res.status_code == 200
    assert order.client.contact_email == "actualizado@cliente.cl"
    assert db.commit.called


def test_send_magic_link_to_custom_recipient_preserves_client_email(
    client, db, coordinator_user, coord_headers
):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    order = create_mock_order_with_client("original@cliente.cl")
    ml = MagicLink(
        id=uuid.uuid4(),
        work_order_id=order.id,
        token="test_token_abcdef1234567890",
        is_active=True,
        expires_at=datetime(2028, 1, 1, tzinfo=timezone.utc),
    )
    order.magic_links = [ml]

    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = order

    db.execute.side_effect = [user_res, order_res]

    with patch(
        "app.api.v1.notifications.send_transactional_email",
        new=AsyncMock(
            return_value=EmailNotificationResponse(
                success=True,
                recipient="destinatario.alternativo@otro.cl",
                message_id="msg_123",
                status="delivered",
                sent_at=datetime.now(timezone.utc),
                simulated=True,
            )
        ),
    ) as mock_send:
        res = client.post(
            "/api/v1/notifications/send-magic-link",
            json={
                "work_order_id": str(order.id),
                "recipient_email": "destinatario.alternativo@otro.cl",
            },
            headers=coord_headers,
        )

        assert res.status_code == 200
        mock_send.assert_called_once()
        assert mock_send.call_args.kwargs["to_email"] == "destinatario.alternativo@otro.cl"
        # El correo principal del cliente debe permanecer intacto
        assert order.client.contact_email == "original@cliente.cl"


def test_send_magic_link_failure_returns_real_error(
    client, db, coordinator_user, coord_headers
):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    order = create_mock_order_with_client("cliente@empresa.cl")
    ml = MagicLink(
        id=uuid.uuid4(),
        work_order_id=order.id,
        token="test_token_abcdef1234567890",
        is_active=True,
        expires_at=datetime(2028, 1, 1, tzinfo=timezone.utc),
    )
    order.magic_links = [ml]

    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = order

    db.execute.side_effect = [user_res, order_res]

    with patch(
        "app.api.v1.notifications.send_transactional_email",
        new=AsyncMock(
            return_value=EmailNotificationResponse(
                success=False,
                recipient="cliente@empresa.cl",
                message_id=None,
                status="error_sendgrid_401: The provided authorization grant is invalid",
                sent_at=datetime.now(timezone.utc),
                simulated=False,
            )
        ),
    ):
        res = client.post(
            "/api/v1/notifications/send-magic-link",
            json={"work_order_id": str(order.id)},
            headers=coord_headers,
        )

        assert res.status_code == 502
        assert "error_sendgrid_401" in res.json()["detail"]


def test_send_magic_link_uses_assigned_technician_from_database(
    client, db, coordinator_user, coord_headers
):
    """Verifica que el correo incluya el nombre real del técnico asignado en BD y no un valor hardcodeado."""
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    order = create_mock_order_with_client("cliente@empresa.cl")
    tech_user = User(
        id=uuid.uuid4(),
        email="tech01@atlasfsm.cl",
        full_name="Técnico Prueba ATLAS 01",
        role=UserRoleEnum.TECNICO,
        is_active=True,
    )
    tech_profile = Technician(
        id=tech_user.id,
        rut="12.345.678-9",
        initials="TP",
        vehicle_plate="JJ-9988",
    )
    tech_profile.user = tech_user
    order.technician = tech_profile
    order.technician_id = tech_profile.id

    ml = MagicLink(
        id=uuid.uuid4(),
        work_order_id=order.id,
        token="token_con_tecnico_real_12345",
        is_active=True,
        expires_at=datetime(2028, 1, 1, tzinfo=timezone.utc),
    )
    order.magic_links = [ml]

    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = order

    db.execute.side_effect = [user_res, order_res]

    with patch(
        "app.api.v1.notifications.send_transactional_email",
        new=AsyncMock(
            return_value=EmailNotificationResponse(
                success=True,
                recipient="cliente@empresa.cl",
                message_id="msg_tech_assigned",
                status="delivered",
                sent_at=datetime.now(timezone.utc),
                simulated=True,
            )
        ),
    ) as mock_send:
        res = client.post(
            "/api/v1/notifications/send-magic-link",
            json={"work_order_id": str(order.id)},
            headers=coord_headers,
        )

        assert res.status_code == 200
        mock_send.assert_called_once()
        html = mock_send.call_args.kwargs["html_content"]
        # Debe reflejar el técnico asignado en la base de datos
        assert "Técnico Prueba ATLAS 01" in html
        # Jamás debe incluir valores hardcodeados obsoletos
        assert "Alexander Sáez" not in html
        # El enlace debe apuntar a la URL configurada
        assert f"{settings.FRONTEND_PORTAL_URL}/{ml.token}" in html


def test_send_magic_link_unassigned_technician_shows_pending(
    client, db, coordinator_user, coord_headers
):
    """Verifica que una orden sin técnico muestre 'Pendiente de asignación' sin inventar técnicos."""
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    order = create_mock_order_with_client("cliente@empresa.cl")
    order.technician = None
    order.technician_id = None

    ml = MagicLink(
        id=uuid.uuid4(),
        work_order_id=order.id,
        token="token_sin_tecnico_12345",
        is_active=True,
        expires_at=datetime(2028, 1, 1, tzinfo=timezone.utc),
    )
    order.magic_links = [ml]

    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = order

    db.execute.side_effect = [user_res, order_res]

    with patch(
        "app.api.v1.notifications.send_transactional_email",
        new=AsyncMock(
            return_value=EmailNotificationResponse(
                success=True,
                recipient="cliente@empresa.cl",
                message_id="msg_unassigned",
                status="delivered",
                sent_at=datetime.now(timezone.utc),
                simulated=True,
            )
        ),
    ) as mock_send:
        res = client.post(
            "/api/v1/notifications/send-magic-link",
            json={"work_order_id": str(order.id)},
            headers=coord_headers,
        )

        assert res.status_code == 200
        html = mock_send.call_args.kwargs["html_content"]
        assert "Pendiente de asignación" in html
        assert "Alexander Sáez" not in html


def test_frontend_portal_url_production_guard():
    """Valida que en producción FRONTEND_PORTAL_URL nunca apunte a localhost ni a dominios internos de vercel.app."""
    # 1. En producción con valor por defecto localhost, debe mutar al dominio oficial https://www.atlasfsm.cl/status
    prod_settings = Settings(
        ENVIRONMENT="production",
        FRONTEND_PORTAL_URL="http://localhost:5173/status",
    )
    assert prod_settings.FRONTEND_PORTAL_URL == "https://www.atlasfsm.cl/status"
    assert "localhost" not in prod_settings.FRONTEND_PORTAL_URL
    assert "vercel.app" not in prod_settings.FRONTEND_PORTAL_URL

    # 2. Si se configuró con dominio interno de vercel.app en producción, se normaliza al dominio oficial
    prod_vercel = Settings(
        ENVIRONMENT="production",
        FRONTEND_PORTAL_URL="https://atlas-fsm.vercel.app/status",
    )
    assert prod_vercel.FRONTEND_PORTAL_URL == "https://www.atlasfsm.cl/status"
    assert "vercel.app" not in prod_vercel.FRONTEND_PORTAL_URL

    # 3. Con trailing slash, debe normalizarse sin slash final
    prod_custom = Settings(
        ENVIRONMENT="production",
        FRONTEND_PORTAL_URL="https://www.atlasfsm.cl/status/",
    )
    assert prod_custom.FRONTEND_PORTAL_URL == "https://www.atlasfsm.cl/status"

    # 4. En desarrollo, conserva localhost para testing local
    dev_settings = Settings(
        ENVIRONMENT="development",
        FRONTEND_PORTAL_URL="http://localhost:5173/status",
    )
    assert dev_settings.FRONTEND_PORTAL_URL == "http://localhost:5173/status"

