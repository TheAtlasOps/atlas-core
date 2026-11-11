"""
Pruebas unitarias de disponibilidad automática de técnicos (ATLAS FSM).
Valida:
1. Estado DISPONIBLE cuando el técnico está habilitado y sin órdenes activas.
2. Estado ASIGNADO cuando el técnico tiene órdenes CONFIRMADA.
3. Estado OCUPADO cuando el técnico tiene al menos una orden EN_RUTA o EN_SITIO.
4. Estado NO_DISPONIBLE cuando is_available es False (bloqueo administrativo prioritario).
5. Sorteo y prioridad estricta: NO_DISPONIBLE > OCUPADO > ASIGNADO > DISPONIBLE.
6. Soporte de múltiples órdenes por técnico con conteo y listado detallado.
7. Alternancia de disponibilidad administrativa (toggle) y recálculo con órdenes remanentes.
"""

import asyncio
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from unittest.mock import MagicMock, AsyncMock
import pytest

from app.core.security import create_access_token
from app.models.enums import OrderStatusEnum, UserRoleEnum, ServiceTypeEnum, OrderPriorityEnum
from app.models.user import User, Technician
from app.models.work_order import WorkOrder
from app.services.order_service import (
    _calculate_technician_operational_status,
    list_technicians,
)


def make_test_technician(t_id=None, full_name="Pedro Técnico", is_available=True):
    uid = t_id or uuid.uuid4()
    u = User(
        id=uid,
        email=f"tech_{uid.hex[:6]}@atlasfsm.cl",
        full_name=full_name,
        role=UserRoleEnum.TECNICO,
        is_active=True,
    )
    t = Technician(
        id=uid,
        user=u,
        rut="16.234.567-8",
        initials="PT",
        vehicle_plate="WXYZ-99",
        current_lat=Decimal("-33.4372"),
        current_lng=Decimal("-70.6506"),
        is_available=is_available,
    )
    u.technician_profile = t
    return t


def make_test_order(order_id=None, technician_id=None, status=OrderStatusEnum.CONFIRMADA, number="OT-001"):
    return WorkOrder(
        id=order_id or uuid.uuid4(),
        order_number=number,
        title=f"Orden {number}",
        service_type=ServiceTypeEnum.INSTALACION_FIBRA,
        priority=OrderPriorityEnum.MEDIA,
        status=status,
        technician_id=technician_id,
        created_at=datetime.now(timezone.utc),
    )


def test_calculate_operational_status_disponible():
    # Técnico habilitado sin órdenes -> DISPONIBLE
    status_str, primary, orders = _calculate_technician_operational_status(
        is_available=True,
        tech_orders=[],
    )
    assert status_str == "DISPONIBLE"
    assert primary is None
    assert len(orders) == 0


def test_calculate_operational_status_asignado():
    # Técnico con 1 orden CONFIRMADA -> ASIGNADO
    t = make_test_technician()
    o = make_test_order(technician_id=t.id, status=OrderStatusEnum.CONFIRMADA, number="OT-100")
    status_str, primary, orders = _calculate_technician_operational_status(
        is_available=True,
        tech_orders=[o],
    )
    assert status_str == "ASIGNADO"
    assert primary == o
    assert len(orders) == 1
    assert orders[0]["order_number"] == "OT-100"


def test_calculate_operational_status_ocupado_en_ruta():
    # Técnico con orden EN_RUTA -> OCUPADO
    t = make_test_technician()
    o1 = make_test_order(technician_id=t.id, status=OrderStatusEnum.CONFIRMADA, number="OT-100")
    o2 = make_test_order(technician_id=t.id, status=OrderStatusEnum.EN_RUTA, number="OT-101")
    status_str, primary, orders = _calculate_technician_operational_status(
        is_available=True,
        tech_orders=[o1, o2],
    )
    assert status_str == "OCUPADO"
    # La orden primaria prioriza la orden en terreno (EN_RUTA)
    assert primary == o2
    assert len(orders) == 2


def test_calculate_operational_status_ocupado_en_sitio():
    # Técnico con orden EN_SITIO -> OCUPADO
    t = make_test_technician()
    o = make_test_order(technician_id=t.id, status=OrderStatusEnum.EN_SITIO, number="OT-200")
    status_str, primary, orders = _calculate_technician_operational_status(
        is_available=True,
        tech_orders=[o],
    )
    assert status_str == "OCUPADO"
    assert primary == o


def test_calculate_operational_status_no_disponible_priority():
    # Prioridad: NO_DISPONIBLE > OCUPADO > ASIGNADO > DISPONIBLE
    t = make_test_technician(is_available=False)
    o1 = make_test_order(technician_id=t.id, status=OrderStatusEnum.EN_RUTA, number="OT-300")
    status_str, primary, orders = _calculate_technician_operational_status(
        is_available=False,
        tech_orders=[o1],
    )
    assert status_str == "NO_DISPONIBLE"
    assert primary == o1
    assert len(orders) == 1


def test_multiple_orders_priority_and_lifecycle():
    """
    Verifica soporte de múltiples órdenes simultáneas y transición de estados:
    - Con [CONFIRMADA, EN_RUTA] -> OCUPADO (2 órdenes activas)
    - Al completar o remover la orden EN_RUTA -> ASIGNADO (1 orden activa)
    - Al completar o remover la orden CONFIRMADA -> DISPONIBLE (0 órdenes activas)
    """
    t = make_test_technician()
    o_conf = make_test_order(technician_id=t.id, status=OrderStatusEnum.CONFIRMADA, number="OT-101")
    o_ruta = make_test_order(technician_id=t.id, status=OrderStatusEnum.EN_RUTA, number="OT-102")

    # 1. Dos órdenes simultáneas (CONFIRMADA + EN_RUTA) -> OCUPADO
    st1, primary1, summary1 = _calculate_technician_operational_status(
        is_available=True,
        tech_orders=[o_conf, o_ruta],
    )
    assert st1 == "OCUPADO"
    assert primary1 == o_ruta
    assert len(summary1) == 2
    assert {s["order_number"] for s in summary1} == {"OT-101", "OT-102"}

    # 2. La orden EN_RUTA finaliza o se reasigna, queda solo CONFIRMADA -> ASIGNADO
    st2, primary2, summary2 = _calculate_technician_operational_status(
        is_available=True,
        tech_orders=[o_conf],
    )
    assert st2 == "ASIGNADO"
    assert primary2 == o_conf
    assert len(summary2) == 1

    # 3. La orden CONFIRMADA finaliza, el técnico vuelve a estar disponible -> DISPONIBLE
    st3, primary3, summary3 = _calculate_technician_operational_status(
        is_available=True,
        tech_orders=[],
    )
    assert st3 == "DISPONIBLE"
    assert primary3 is None
    assert len(summary3) == 0


def test_no_disponible_administrative_control_independence():
    """
    Verifica que is_available=False mantenga siempre NO_DISPONIBLE sin importar las órdenes,
    y que al habilitar administrativamente se refleje el estado operativo real según las órdenes.
    """
    t = make_test_technician(is_available=False)
    o = make_test_order(technician_id=t.id, status=OrderStatusEnum.CONFIRMADA, number="OT-201")

    # Bloqueado administrativamente con orden asignada
    st_bloq, _, sum_bloq = _calculate_technician_operational_status(
        is_available=False,
        tech_orders=[o],
    )
    assert st_bloq == "NO_DISPONIBLE"
    assert len(sum_bloq) == 1

    # Desbloqueado administrativamente con la misma orden -> ASIGNADO
    st_hab, _, sum_hab = _calculate_technician_operational_status(
        is_available=True,
        tech_orders=[o],
    )
    assert st_hab == "ASIGNADO"
    assert len(sum_hab) == 1
