"""
Pruebas unitarias de reglas de asignación según disponibilidad operativa (ATLAS FSM).
Valida:
1. DISPONIBLE: asignación permitida normalmente.
2. ASIGNADO: requiere advertencia y confirmación explícita del coordinador.
3. OCUPADO: asignación inmediata bloqueada; visita futura permitida con confirmación explícita.
4. NO_DISPONIBLE: asignación bloqueada bajo cualquier circunstancia.
5. Backend: rechaza intentos directos que incumplan las reglas con HTTP 409.
"""

import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, AsyncMock
import pytest
from fastapi import HTTPException

from app.models.enums import OrderStatusEnum, UserRoleEnum, ServiceTypeEnum, OrderPriorityEnum
from app.models.user import User, Technician
from app.models.work_order import WorkOrder
from app.services.order_service import (
    check_assignment_rules,
    validate_technician_assignment_rules,
    _is_future_datetime,
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


# ── 1. Técnico DISPONIBLE ───────────────────────────────────────────────────

def test_assignment_disponible_allowed_normally():
    """Técnico disponible sin órdenes permite asignación sin requerir confirmación."""
    t = make_test_technician(is_available=True)
    status_result = check_assignment_rules(
        technician_is_available=t.is_available,
        technician_active_orders=[],
        scheduled_date=None,
        confirm_assignment=False,
    )
    assert status_result == "DISPONIBLE"


# ── 2. Técnico ASIGNADO ─────────────────────────────────────────────────────

def test_assignment_asignado_without_confirmation_raises_409():
    """Técnico con órdenes confirmadas pendientes rechaza asignación sin confirmación explícita."""
    t = make_test_technician(is_available=True)
    o = make_test_order(technician_id=t.id, status=OrderStatusEnum.CONFIRMADA)

    with pytest.raises(HTTPException) as exc_info:
        check_assignment_rules(
            technician_is_available=t.is_available,
            technician_active_orders=[o],
            scheduled_date=None,
            confirm_assignment=False,
        )
    assert exc_info.value.status_code == 409
    assert "órdenes asignadas pendientes" in exc_info.value.detail
    assert "confirmación explícita" in exc_info.value.detail


def test_assignment_asignado_with_confirmation_allowed():
    """Técnico con órdenes confirmadas permite asignación con confirmación explícita."""
    t = make_test_technician(is_available=True)
    o = make_test_order(technician_id=t.id, status=OrderStatusEnum.CONFIRMADA)

    status_result = check_assignment_rules(
        technician_is_available=t.is_available,
        technician_active_orders=[o],
        scheduled_date=None,
        confirm_assignment=True,
    )
    assert status_result == "ASIGNADO"


# ── 3. Técnico OCUPADO ──────────────────────────────────────────────────────

def test_assignment_ocupado_immediate_blocked_without_scheduled_date():
    """Técnico ocupado en terreno bloquea asignaciones inmediatas sin fecha programada."""
    t = make_test_technician(is_available=True)
    o = make_test_order(technician_id=t.id, status=OrderStatusEnum.EN_RUTA)

    with pytest.raises(HTTPException) as exc_info:
        check_assignment_rules(
            technician_is_available=t.is_available,
            technician_active_orders=[o],
            scheduled_date=None,
            confirm_assignment=True,  # Incluso si confirma, asignación inmediata debe estar bloqueada
        )
    assert exc_info.value.status_code == 409
    assert "asignaciones inmediatas están bloqueadas" in exc_info.value.detail


def test_assignment_ocupado_immediate_blocked_with_past_date():
    """Técnico ocupado en terreno bloquea asignación si la fecha programada es en el pasado o actual."""
    t = make_test_technician(is_available=True)
    o = make_test_order(technician_id=t.id, status=OrderStatusEnum.EN_SITIO)
    past_date = datetime.now(timezone.utc) - timedelta(hours=1)

    with pytest.raises(HTTPException) as exc_info:
        check_assignment_rules(
            technician_is_available=t.is_available,
            technician_active_orders=[o],
            scheduled_date=past_date,
            confirm_assignment=True,
        )
    assert exc_info.value.status_code == 409
    assert "asignaciones inmediatas están bloqueadas" in exc_info.value.detail


def test_assignment_ocupado_future_without_confirmation_raises_409():
    """Técnico ocupado con fecha programada futura requiere confirmación explícita del coordinador."""
    t = make_test_technician(is_available=True)
    o = make_test_order(technician_id=t.id, status=OrderStatusEnum.EN_RUTA)
    future_date = datetime.now(timezone.utc) + timedelta(days=1)

    with pytest.raises(HTTPException) as exc_info:
        check_assignment_rules(
            technician_is_available=t.is_available,
            technician_active_orders=[o],
            scheduled_date=future_date,
            confirm_assignment=False,
        )
    assert exc_info.value.status_code == 409
    assert "revisar su agenda" in exc_info.value.detail


def test_assignment_ocupado_future_with_confirmation_allowed():
    """Técnico ocupado con fecha futura y confirmación explícita es permitido."""
    t = make_test_technician(is_available=True)
    o = make_test_order(technician_id=t.id, status=OrderStatusEnum.EN_RUTA)
    future_date = datetime.now(timezone.utc) + timedelta(days=2)

    status_result = check_assignment_rules(
        technician_is_available=t.is_available,
        technician_active_orders=[o],
        scheduled_date=future_date,
        confirm_assignment=True,
    )
    assert status_result == "OCUPADO"


# ── 4. Técnico NO_DISPONIBLE ────────────────────────────────────────────────

def test_assignment_no_disponible_blocked_under_all_conditions():
    """Técnico no disponible (bloqueado administrativamente) bloquea cualquier asignación."""
    t = make_test_technician(is_available=False)
    future_date = datetime.now(timezone.utc) + timedelta(days=3)

    # Intento 1: sin fecha, sin confirmación
    with pytest.raises(HTTPException) as exc1:
        check_assignment_rules(
            technician_is_available=False,
            technician_active_orders=[],
            scheduled_date=None,
            confirm_assignment=False,
        )
    assert exc1.value.status_code == 409
    assert "bloqueado administrativamente" in exc1.value.detail

    # Intento 2: con fecha futura y confirmación (debe permanecer bloqueado)
    with pytest.raises(HTTPException) as exc2:
        check_assignment_rules(
            technician_is_available=False,
            technician_active_orders=[],
            scheduled_date=future_date,
            confirm_assignment=True,
        )
    assert exc2.value.status_code == 409
    assert "bloqueado administrativamente" in exc2.value.detail


# ── 5. Helper de fechas futuras ─────────────────────────────────────────────

def test_is_future_datetime_helper():
    now_utc = datetime.now(timezone.utc)
    # None
    assert _is_future_datetime(None, now_utc) is False
    # Pasado
    assert _is_future_datetime(now_utc - timedelta(seconds=10), now_utc) is False
    # Futuro aware
    assert _is_future_datetime(now_utc + timedelta(minutes=5), now_utc) is True
    # Futuro naive (convertido internamente a UTC)
    future_naive = (datetime.now(timezone.utc) + timedelta(hours=2)).replace(tzinfo=None)
    assert _is_future_datetime(future_naive, now_utc) is True
