import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
import pytest
from pydantic import ValidationError

from app.models.enums import (
    EquipmentStatusEnum,
    EquipmentTypeEnum,
    OrderStatusEnum,
    OrderPriorityEnum,
    ServiceTypeEnum,
    SimStatusEnum,
    UserRoleEnum,
)
from app.models.inventory import Equipment, SimCard
from app.models.work_order import WorkOrder, WorkOrderItem
from app.models.client import Client
from app.models.user import User
from app.schemas.inventory import (
    DevicePairRequest,
    EquipmentCreate,
    SimCardCreate,
)
from app.services.inventory_service import (
    build_equipment_response,
    build_sim_response,
    pair_devices,
)
from fastapi import HTTPException


# ─── 1. Validación de Esquema Pydantic: Dirección MAC y Operadores ───────────
def test_equipment_create_validates_mac_address_format():
    # Válido con dos puntos
    eq1 = EquipmentCreate(
        serial_number="RTR-001",
        mac_address="b8:27:eb:99:10:aa",
        brand="Teltonika",
        model="RUTX50",
        type=EquipmentTypeEnum.ROUTER_5G,
    )
    assert eq1.mac_address == "B8:27:EB:99:10:AA"

    # Válido con guiones
    eq2 = EquipmentCreate(
        serial_number="RTR-002",
        mac_address="B8-27-EB-99-10-AA",
        brand="Teltonika",
        model="RUTX50",
        type=EquipmentTypeEnum.ROUTER_5G,
    )
    assert eq2.mac_address == "B8-27-EB-99-10-AA"

    # Opcional / None
    eq3 = EquipmentCreate(
        serial_number="RTR-003",
        mac_address=None,
        brand="Teltonika",
        model="RUTX50",
        type=EquipmentTypeEnum.ROUTER_5G,
    )
    assert eq3.mac_address is None

    # Cadena vacía o espacios se convierte a None
    eq4 = EquipmentCreate(
        serial_number="RTR-004",
        mac_address="   ",
        brand="Teltonika",
        model="RUTX50",
        type=EquipmentTypeEnum.ROUTER_5G,
    )
    assert eq4.mac_address is None


def test_equipment_create_rejects_invalid_mac_address():
    with pytest.raises(ValidationError) as exc:
        EquipmentCreate(
            serial_number="RTR-005",
            mac_address="invalid-mac-address",
            brand="Teltonika",
            model="RUTX50",
            type=EquipmentTypeEnum.ROUTER_5G,
        )
    assert "Formato de dirección MAC inválido" in str(exc.value)


def test_sim_card_create_accepts_custom_operator_and_null_imsi_msisdn():
    sim = SimCardCreate(
        iccid="89560200102400018501",
        operator="Movistar Empresas",
    )
    assert sim.operator == "Movistar Empresas"
    assert sim.imsi is None
    assert sim.msisdn is None


# ─── 2. Control de Exclusividad y Disponibilidad en pair_devices ─────────────
@pytest.mark.asyncio
async def test_pair_devices_rejects_already_installed_equipment(db):
    user = User(id=uuid.uuid4(), email="admin@atlasfsm.cl", role=UserRoleEnum.ADMIN)
    equip_id = uuid.uuid4()
    sim_id = uuid.uuid4()

    equip = Equipment(
        id=equip_id,
        serial_number="RTR-001",
        status=EquipmentStatusEnum.INSTALADO,
        brand="Teltonika",
        model="RUTX50",
        type=EquipmentTypeEnum.ROUTER_5G,
    )
    sim = SimCard(
        id=sim_id,
        iccid="89560200102400018501",
        status=SimStatusEnum.DISPONIBLE,
        operator="Entel",
    )

    req = DevicePairRequest(equipment_id=equip_id, sim_card_id=sim_id, action_type="INSTALACION")

    r_equip = MagicMock()
    r_equip.scalar_one_or_none.return_value = equip
    r_sim = MagicMock()
    r_sim.scalar_one_or_none.return_value = sim

    db.execute.side_effect = [r_equip, r_sim]

    with pytest.raises(HTTPException) as exc:
        await pair_devices(db, req, user)

    assert exc.value.status_code == 400
    assert "actualmente figura como INSTALADO" in exc.value.detail


@pytest.mark.asyncio
async def test_pair_devices_rejects_defective_or_baja_sim(db):
    user = User(id=uuid.uuid4(), email="admin@atlasfsm.cl", role=UserRoleEnum.ADMIN)
    equip_id = uuid.uuid4()
    sim_id = uuid.uuid4()

    equip = Equipment(
        id=equip_id,
        serial_number="RTR-001",
        status=EquipmentStatusEnum.DISPONIBLE,
        brand="Teltonika",
        model="RUTX50",
        type=EquipmentTypeEnum.ROUTER_5G,
    )
    sim = SimCard(
        id=sim_id,
        iccid="89560200102400018501",
        status=SimStatusEnum.DEFECTUOSA,
        operator="Entel",
    )

    req = DevicePairRequest(equipment_id=equip_id, sim_card_id=sim_id, action_type="INSTALACION")

    r_equip = MagicMock()
    r_equip.scalar_one_or_none.return_value = equip
    r_sim = MagicMock()
    r_sim.scalar_one_or_none.return_value = sim

    db.execute.side_effect = [r_equip, r_sim]

    with pytest.raises(HTTPException) as exc:
        await pair_devices(db, req, user)

    assert exc.value.status_code == 400
    assert "DEFECTUOSA" in exc.value.detail


# ─── 3. Vinculación con Órdenes de Trabajo (work_order_items) ───────────────
@pytest.mark.asyncio
async def test_pair_devices_creates_work_order_item_and_prevents_duplicate(db):
    user = User(id=uuid.uuid4(), email="admin@atlasfsm.cl", role=UserRoleEnum.ADMIN)
    equip_id = uuid.uuid4()
    sim_id = uuid.uuid4()
    order_id = uuid.uuid4()
    client_id = uuid.uuid4()

    now = datetime.now(timezone.utc)
    equip = Equipment(
        id=equip_id,
        created_at=now,
        updated_at=now,
        serial_number="RTR-001",
        status=EquipmentStatusEnum.DISPONIBLE,
        brand="Teltonika",
        model="RUTX50",
        type=EquipmentTypeEnum.ROUTER_5G,
    )
    sim = SimCard(
        id=sim_id,
        created_at=now,
        updated_at=now,
        iccid="89560200102400018501",
        status=SimStatusEnum.DISPONIBLE,
        operator="Entel",
    )
    order = WorkOrder(
        id=order_id,
        order_number="#OT-08491",
        client_id=client_id,
        title="Instalación Router Test",
        service_type=ServiceTypeEnum.DIAGNOSTICO_ROUTER,
        priority=OrderPriorityEnum.MEDIA,
        status=OrderStatusEnum.CONFIRMADA,
    )
    client_obj = Client(
        id=client_id,
        business_name="Cliente Prueba ATLAS",
        contact_phone="+56911223344",
        contact_email="contacto@cliente.cl",
        address="Av. Providencia 1234",
        comuna="Providencia",
    )

    req = DevicePairRequest(
        equipment_id=equip_id,
        sim_card_id=sim_id,
        work_order_id=order_id,
        action_type="INSTALACION",
    )

    # 1era llamada: Exitoso
    r_equip = MagicMock()
    r_equip.scalar_one_or_none.return_value = equip
    r_sim = MagicMock()
    r_sim.scalar_one_or_none.return_value = sim
    r_order = MagicMock()
    r_order.scalar_one_or_none.return_value = order
    r_dup_check = MagicMock()
    r_dup_check.scalar_one_or_none.return_value = None  # No hay duplicado
    r_client = MagicMock()
    r_client.scalar_one_or_none.return_value = client_obj
    r_equip_post = MagicMock()
    r_equip_post.scalar_one_or_none.return_value = equip
    r_sim_post = MagicMock()
    r_sim_post.scalar_one_or_none.return_value = sim

    db.execute.side_effect = [
        r_equip,
        r_sim,
        r_order,
        r_dup_check,
        r_client,
        r_equip_post,
        r_sim_post,
    ]

    res = await pair_devices(db, req, user)
    assert res.success is True
    assert res.equipment.status == EquipmentStatusEnum.INSTALADO
    assert res.sim_card.status == SimStatusEnum.INSTALADA
    assert db.add.called
    assert db.commit.called

    # 2da llamada con el mismo par en la misma orden: debe rechazar con 409 Conflict
    existing_item = WorkOrderItem(
        id=uuid.uuid4(),
        work_order_id=order_id,
        equipment_id=equip_id,
        sim_card_id=sim_id,
    )
    r_dup_found = MagicMock()
    r_dup_found.scalar_one_or_none.return_value = existing_item

    equip_dup = Equipment(
        id=equip_id,
        created_at=now,
        updated_at=now,
        serial_number="RTR-001",
        status=EquipmentStatusEnum.DISPONIBLE,
        brand="Teltonika",
        model="RUTX50",
        type=EquipmentTypeEnum.ROUTER_5G,
    )
    sim_dup = SimCard(
        id=sim_id,
        created_at=now,
        updated_at=now,
        iccid="89560200102400018501",
        status=SimStatusEnum.DISPONIBLE,
        operator="Entel",
    )
    r_equip_dup = MagicMock()
    r_equip_dup.scalar_one_or_none.return_value = equip_dup
    r_sim_dup = MagicMock()
    r_sim_dup.scalar_one_or_none.return_value = sim_dup

    db.execute.side_effect = [
        r_equip_dup,
        r_sim_dup,
        r_order,
        r_dup_found,
    ]

    with pytest.raises(HTTPException) as exc:
        await pair_devices(db, req, user)

    assert exc.value.status_code == 409
    assert "ya se encuentran vinculados a la orden" in exc.value.detail


# ─── 4. DTO Responses con Trazabilidad de Orden de Trabajo ──────────────────
def test_build_sim_and_equipment_responses_include_work_order():
    now = datetime.now(timezone.utc)
    order_id = uuid.uuid4()
    order = WorkOrder(id=order_id, order_number="#OT-08491", created_at=now)
    item = WorkOrderItem(id=uuid.uuid4(), work_order_id=order_id, created_at=now)
    item.work_order = order

    sim = SimCard(
        id=uuid.uuid4(),
        iccid="89560200102400018501",
        status=SimStatusEnum.INSTALADA,
        operator="Entel",
        created_at=now,
        updated_at=now,
    )
    sim.work_order_associations = [item]

    equip = Equipment(
        id=uuid.uuid4(),
        serial_number="RTR-ENTEL-2024-001",
        mac_address="B8:27:EB:99:10:AA",
        brand="Teltonika",
        model="RUTX50",
        type=EquipmentTypeEnum.ROUTER_5G,
        status=EquipmentStatusEnum.INSTALADO,
        created_at=now,
        updated_at=now,
    )
    equip.work_order_associations = [item]

    sim_res = build_sim_response(sim)
    assert sim_res.work_order_id == order_id
    assert sim_res.work_order_number == "#OT-08491"

    equip_res = build_equipment_response(equip)
    assert equip_res.work_order_id == order_id
    assert equip_res.work_order_number == "#OT-08491"
    assert equip_res.mac_address == "B8:27:EB:99:10:AA"
