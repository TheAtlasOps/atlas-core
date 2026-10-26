import uuid
from unittest.mock import MagicMock

import pytest

from app.core.security import decode_access_token, get_password_hash
from app.models.enums import UserRoleEnum
from app.models.user import User


@pytest.fixture(scope="module")
def user():
    return User(
        id=uuid.uuid4(), email="coordinator@example.com",
        password_hash=get_password_hash("synthetic-test-password"),
        full_name="Persona de prueba", role=UserRoleEnum.COORDINADOR, is_active=True,
    )


@pytest.mark.parametrize("endpoint", ["/api/v1/auth/login", "/api/v1/auth/login-form"])
@pytest.mark.parametrize("state,expected", [("valid", 200), ("wrong_password", 401), ("unknown_user", 401), ("inactive", 403)])
def test_normal_login_with_isolated_database(client, db, user, endpoint, state, expected):
    result = MagicMock()
    result.scalar_one_or_none.return_value = None if state == "unknown_user" else user
    db.execute.return_value = result
    user.is_active = state != "inactive"
    password = "wrong-synthetic-password" if state == "wrong_password" else "synthetic-test-password"
    if endpoint.endswith("login-form"):
        response = client.post(endpoint, data={"username": user.email, "password": password})
    else:
        response = client.post(endpoint, json={"email": user.email, "password": password})
    assert response.status_code == expected
    assert password not in response.text
    if expected == 200:
        data = response.json()
        payload = decode_access_token(data["access_token"])
        assert payload["sub"] == str(user.id)
        assert payload["role"] == "COORDINADOR"
        assert data["token_type"] == "bearer"
        assert data["user_id"] == str(user.id)
    elif expected == 401:
        assert response.headers["www-authenticate"] == "Bearer"
        assert "access_token" not in response.json()
    db.commit.assert_not_awaited()


def test_login_rejects_invalid_email_before_database_access(client, db):
    response = client.post("/api/v1/auth/login", json={"email": "invalid", "password": "synthetic"})
    assert response.status_code == 422
    db.execute.assert_not_awaited()
