import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession
import pytest
from app.core.security import create_access_token
from app.models.enums import (
    UserRoleEnum,
    OrderStatusEnum,
    OrderPriorityEnum,
    ServiceTypeEnum,
    EvidenceTypeEnum,
)
from app.models.user import User, Technician
from app.models.client import Client
from app.models.work_order import WorkOrder, OrderStatusHistory
from app.models.evidence import WorkOrderEvidence
from app.models.magic_link import MagicLink


@pytest.fixture
def coordinator_user():
    return User(
        id=uuid.uuid4(),
        email="coordinador@atlasfsm.cl",
        full_name="Constanza Coordinadora",
        role=UserRoleEnum.COORDINADOR,
        is_active=True,
    )


@pytest.fixture
def admin_user():
    return User(
        id=uuid.uuid4(),
        email="admin@atlasfsm.cl",
        full_name="Andrés Administrador",
        role=UserRoleEnum.ADMIN,
        is_active=True,
    )


@pytest.fixture
def technician_user():
    u_id = uuid.uuid4()
    u = User(
        id=u_id,
        email="tecnico@atlasfsm.cl",
        full_name="Carlos Mendoza",
        role=UserRoleEnum.TECNICO,
        is_active=True,
    )
    t = Technician(id=u_id, user=u, rut="15.111.222-3", initials="CM")
    u.technician_profile = t
    return u


@pytest.fixture
def coord_auth_headers(coordinator_user):
    token = create_access_token(
        subject=str(coordinator_user.id),
        role=coordinator_user.role.value,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(admin_user):
    token = create_access_token(
        subject=str(admin_user.id),
        role=admin_user.role.value,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def tech_auth_headers(technician_user):
    token = create_access_token(
        subject=str(technician_user.id),
        role=technician_user.role.value,
    )
    return {"Authorization": f"Bearer {token}"}


def create_mock_order(
    status=OrderStatusEnum.COMPLETADA,
    priority=OrderPriorityEnum.MEDIA,
    is_audited=False,
    technician_id=None,
    has_photo=True,
    has_signature=True,
    has_active_magic_link=True,
):
    now = datetime.now(timezone.utc)
    order_id = uuid.uuid4()
    mock_client = Client(
        id=uuid.uuid4(),
        business_name="Entel Test Corp",
        contact_phone="+56911223344",
        contact_email="test@entel.cl",
        address="Amunategui 20",
        comuna="Santiago",
    )
    order = WorkOrder(
        id=order_id,
        order_number="#OT-08492",
        title="Instalación Router 5G",
        service_type=ServiceTypeEnum.DIAGNOSTICO_ROUTER,
        priority=priority,
        status=status,
        client=mock_client,
        client_id=mock_client.id,
        technician_id=technician_id,
        is_audited=is_audited,
        audited_at=now if is_audited else None,
        audited_by_user_id=None,
        audit_notes="Notas previas" if is_audited else None,
        created_at=now,
        updated_at=now,
    )

    evidences = []
    if has_photo:
        evidences.append(
            WorkOrderEvidence(
                id=uuid.uuid4(),
                work_order_id=order_id,
                technician_id=technician_id or uuid.uuid4(),
                evidence_type=EvidenceTypeEnum.FOTO_DESPUES,
                storage_url="https://storage.neon.tech/foto_despues.jpg",
                captured_at=now,
            )
        )
    if has_signature:
        evidences.append(
            WorkOrderEvidence(
                id=uuid.uuid4(),
                work_order_id=order_id,
                technician_id=technician_id or uuid.uuid4(),
                evidence_type=EvidenceTypeEnum.FIRMA_CLIENTE,
                storage_url="https://storage.neon.tech/firma_cliente.png",
                notes="Receptor Prueba ATLAS",
                captured_at=now,
            )
        )
    order.evidences = evidences
    order.status_history = []
    order.items = []

    if has_active_magic_link:
        ml = MagicLink(
            id=uuid.uuid4(),
            work_order_id=order_id,
            token="super_secret_cryptographic_token_32bytes",
            is_active=True,
            expires_at=now + timedelta(hours=24),
            created_at=now,
        )
        order.magic_links = [ml]
    else:
        order.magic_links = []

    return order


def test_audit_approve_requires_authentication(client):
    order_id = uuid.uuid4()
    res = client.post(f"/api/v1/orders/{order_id}/audit-approve")
    assert res.status_code == 401


def test_audit_approve_requires_coordinator_or_admin(client, db, technician_user, tech_auth_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = technician_user
    db.execute.return_value = user_res

    order_id = uuid.uuid4()
    res = client.post(f"/api/v1/orders/{order_id}/audit-approve", headers=tech_auth_headers)
    assert res.status_code == 403
    assert "insuficientes" in res.json()["detail"].lower()


def test_audit_approve_order_not_found(client, db, coordinator_user, coord_auth_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = None

    db.execute.side_effect = [user_res, order_res]

    order_id = uuid.uuid4()
    res = client.post(
        f"/api/v1/orders/{order_id}/audit-approve",
        headers=coord_auth_headers,
        json={"notes": "Aprobando inexistente"},
    )
    assert res.status_code == 404
    assert "no encontrada" in res.json()["detail"]


def test_audit_approve_order_not_completed_fails(client, db, coordinator_user, coord_auth_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    mock_order = create_mock_order(status=OrderStatusEnum.EN_SITIO)
    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = mock_order

    db.execute.side_effect = [user_res, order_res]

    res = client.post(
        f"/api/v1/orders/{mock_order.id}/audit-approve",
        headers=coord_auth_headers,
    )
    assert res.status_code == 400
    assert "COMPLETADA" in res.json()["detail"]


def test_audit_approve_missing_photo_after_fails(client, db, coordinator_user, coord_auth_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    mock_order = create_mock_order(status=OrderStatusEnum.COMPLETADA, has_photo=False, has_signature=True)
    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = mock_order

    db.execute.side_effect = [user_res, order_res]

    res = client.post(
        f"/api/v1/orders/{mock_order.id}/audit-approve",
        headers=coord_auth_headers,
    )
    assert res.status_code == 400
    assert "FOTO_DESPUES" in res.json()["detail"]


def test_audit_approve_missing_signature_fails(client, db, coordinator_user, coord_auth_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    mock_order = create_mock_order(status=OrderStatusEnum.COMPLETADA, has_photo=True, has_signature=False)
    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = mock_order

    db.execute.side_effect = [user_res, order_res]

    res = client.post(
        f"/api/v1/orders/{mock_order.id}/audit-approve",
        headers=coord_auth_headers,
    )
    assert res.status_code == 400
    assert "FIRMA_CLIENTE" in res.json()["detail"]


def test_audit_approve_duplicate_rejected_409(client, db, coordinator_user, coord_auth_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    mock_order = create_mock_order(status=OrderStatusEnum.COMPLETADA, is_audited=True)
    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = mock_order

    db.execute.side_effect = [user_res, order_res]

    res = client.post(
        f"/api/v1/orders/{mock_order.id}/audit-approve",
        headers=coord_auth_headers,
    )
    assert res.status_code == 409
    assert "ya cuenta con una auditoría aprobada" in res.json()["detail"]


def test_audit_approve_success_persists_data(client, db, coordinator_user, coord_auth_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    mock_order = create_mock_order(status=OrderStatusEnum.COMPLETADA, is_audited=False)
    order_res1 = MagicMock()
    order_res1.scalar_one_or_none.return_value = mock_order

    # Al recargar la orden después de commit
    order_res2 = MagicMock()
    mock_order.auditor = coordinator_user
    order_res2.scalar_one_or_none.return_value = mock_order

    db.execute.side_effect = [user_res, order_res1, order_res2]

    res = client.post(
        f"/api/v1/orders/{mock_order.id}/audit-approve",
        headers=coord_auth_headers,
        json={"notes": "Instalación y firma de conformidad validadas exitosamente."},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_audited"] is True
    assert data["audited_at"] is not None
    assert data["audit_notes"] == "Instalación y firma de conformidad validadas exitosamente."
    assert data["auditor"]["full_name"] == coordinator_user.full_name
    # P1: Seguridad de tokens de Magic Link en respuestas de auditoría
    assert data["active_magic_link_token"] is None

    # Verificar que se persistió en base de datos
    assert db.add.called
    assert db.commit.called


def test_get_orders_does_not_expose_magic_tokens_by_default(client, db, coordinator_user, coord_auth_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    mock_order = create_mock_order(status=OrderStatusEnum.COMPLETADA, has_active_magic_link=True)
    count_res = MagicMock()
    count_res.scalar.return_value = 1
    orders_res = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [mock_order]
    orders_res.scalars.return_value = scalars_mock

    db.execute.side_effect = [user_res, count_res, orders_res]

    # Consulta estándar sin parámetro de token
    res = client.get("/api/v1/orders", headers=coord_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["active_magic_link_token"] is None

    # Consulta explícita solicitando tokens
    db.execute.side_effect = [user_res, count_res, orders_res]
    res_tokens = client.get("/api/v1/orders?include_magic_tokens=true", headers=coord_auth_headers)
    assert res_tokens.status_code == 200
    assert res_tokens.json()["items"][0]["active_magic_link_token"] == "super_secret_cryptographic_token_32bytes"


def test_status_update_forbidden_on_audited_order(client, db, coordinator_user, coord_auth_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    mock_order = create_mock_order(status=OrderStatusEnum.COMPLETADA, is_audited=True)
    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = mock_order

    db.execute.side_effect = [user_res, order_res]

    res = client.patch(
        f"/api/v1/orders/{mock_order.id}/status",
        headers=coord_auth_headers,
        json={"new_status": "IDLE", "comment": "Intento de reversión"},
    )
    assert res.status_code == 409
    assert "ya cuenta con auditoría aprobada y cerrada" in res.json()["detail"]


def test_status_update_technician_can_only_update_assigned_order(client, db, technician_user, tech_auth_headers):
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = technician_user

    other_tech_id = uuid.uuid4()
    mock_order = create_mock_order(
        status=OrderStatusEnum.CONFIRMADA,
        is_audited=False,
        technician_id=other_tech_id,
    )
    order_res = MagicMock()
    order_res.scalar_one_or_none.return_value = mock_order

    db.execute.side_effect = [user_res, order_res]

    res = client.patch(
        f"/api/v1/orders/{mock_order.id}/status",
        headers=tech_auth_headers,
        json={"new_status": "EN_RUTA", "comment": "En ruta"},
    )
    assert res.status_code == 403
    assert "asignadas a su perfil" in res.json()["detail"]


def test_audit_approve_locks_row_with_for_update(client, db, coordinator_user, coord_auth_headers):
    """Verifica que el servicio ejecute SELECT ... FOR UPDATE en PostgreSQL para serializar la transacción."""
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = coordinator_user

    mock_order = create_mock_order(status=OrderStatusEnum.COMPLETADA, is_audited=False)
    order_res1 = MagicMock()
    order_res1.scalar_one_or_none.return_value = mock_order

    order_res2 = MagicMock()
    mock_order.auditor = coordinator_user
    order_res2.scalar_one_or_none.return_value = mock_order

    db.execute.side_effect = [user_res, order_res1, order_res2]

    res = client.post(
        f"/api/v1/orders/{mock_order.id}/audit-approve",
        headers=coord_auth_headers,
        json={"notes": "Validación con bloqueo FOR UPDATE"},
    )
    assert res.status_code == 200

    executed_queries = [call[0][0] for call in db.execute.call_args_list]
    order_query = executed_queries[1]
    assert hasattr(order_query, "_for_update_arg")
    assert order_query._for_update_arg is not None


@pytest.mark.anyio
async def test_concurrent_approvals_second_coordinator_gets_409(coordinator_user, admin_user):
    """
    Garantiza que dos coordinadores que intentan aprobar simultáneamente la misma orden
    quedan serializados por el bloqueo de fila: el primero tiene éxito y el segundo recibe HTTP 409.
    """
    from fastapi import HTTPException
    from app.services.order_service import approve_order_audit

    mock_order = create_mock_order(status=OrderStatusEnum.COMPLETADA, is_audited=False)
    order_id = mock_order.id

    # Sesión simulada de base de datos
    session = MagicMock(spec=AsyncSession)
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()

    # Primera llamada (Coordinador 1): la orden aún no está auditada
    res_coord1 = MagicMock()
    res_coord1.scalar_one_or_none.return_value = mock_order

    # Al recargar en Coordinador 1 tras commit
    res_reload1 = MagicMock()
    mock_order.auditor = coordinator_user
    res_reload1.scalar_one_or_none.return_value = mock_order

    session.execute = AsyncMock(side_effect=[res_coord1, res_reload1])

    # Coordinador 1 aprueba exitosamente
    approved1 = await approve_order_audit(
        db=session,
        order_id=order_id,
        notes="Aprobado por Coordinador 1",
        current_user=coordinator_user,
    )
    assert approved1.is_audited is True
    assert approved1.audited_by_user_id == coordinator_user.id
    assert session.commit.call_count == 1
    assert session.add.call_count == 1  # 1 registro en order_status_history

    # Segunda llamada simultánea (Coordinador 2):
    # Tras liberarse el lock de fila de PostgreSQL, Coordinador 2 lee la fila actualizada (is_audited=True)
    res_coord2 = MagicMock()
    res_coord2.scalar_one_or_none.return_value = mock_order

    session.execute = AsyncMock(side_effect=[res_coord2])

    with pytest.raises(HTTPException) as exc_info:
        await approve_order_audit(
            db=session,
            order_id=order_id,
            notes="Intento simultáneo por Administrador 2",
            current_user=admin_user,
        )

    assert exc_info.value.status_code == 409
    assert "ya cuenta con una auditoría aprobada" in exc_info.value.detail

    # Garantizar que no se generó un segundo commit ni registros duplicados
    assert session.commit.call_count == 1
    assert session.add.call_count == 1
