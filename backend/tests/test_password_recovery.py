import io
import re
import runpy
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select, func
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import get_password_hash, verify_password, decode_access_token
from app.main import app
from app.models.enums import UserRoleEnum
from app.models.password_reset import PasswordResetToken
from app.models.user import User
from app.services import password_reset_service as recovery
from app.services import email_service
from app.services.auth_service import create_user_token_response
from app.api.v1 import auth as auth_routes
from scripts.reset_account_password import checked_url, parser

OLD_PASSWORD = "previous-synthetic-password"
NEW_PASSWORD = "new-synthetic-password"
REQUEST_URL = "/api/v1/auth/password-reset/request"
CONFIRM_URL = "/api/v1/auth/password-reset/confirm"


@pytest.fixture
def memory(monkeypatch):
    monkeypatch.setattr(auth_routes, "_recovery_requests", auth_routes.OrderedDict())
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    statements = []

    class IsolatedSession:
        def __init__(self):
            self.session = Session(engine, expire_on_commit=False)

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            self.session.close()

        @asynccontextmanager
        async def begin(self):
            with self.session.begin():
                yield

        async def execute(self, statement):
            statements.append(str(statement.compile(dialect=postgresql.dialect())))
            return self.session.execute(statement)

        def add(self, item):
            self.session.add(item)

    mail = AsyncMock(return_value=SimpleNamespace(success=True, simulated=False))
    monkeypatch.setattr(recovery, "AsyncSessionLocal", IsolatedSession)
    monkeypatch.setattr(recovery, "send_transactional_email", mail)
    with Session(engine) as db:
        user = User(id=uuid.uuid4(), email="member@example.com", full_name="Integrante de prueba",
                    role=UserRoleEnum.ADMIN, is_active=True, auth_version=0,
                    password_hash=get_password_hash(OLD_PASSWORD))
        db.add(user)
        db.commit()
        user_id = user.id
    yield SimpleNamespace(engine=engine, session=IsolatedSession, mail=mail, user_id=user_id, statements=statements)
    engine.dispose()


@pytest.fixture
def recovery_client(memory):
    async def isolated_db():
        async with memory.session() as session:
            yield session

    app.dependency_overrides[get_db] = isolated_db
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()


def captured_token(memory):
    html = memory.mail.await_args.args[2]
    match = re.search(r"#token=([A-Za-z0-9_-]{43})", html)
    assert match is not None
    return match.group(1)


def insert_token(memory, *, expired=False, used=False, active=True):
    token = "a" * 43
    now = datetime.now(timezone.utc)
    with Session(memory.engine) as db:
        db.get(User, memory.user_id).is_active = active
        db.add(PasswordResetToken(
            user_id=memory.user_id, token_hash=recovery.token_digest(token),
            created_at=now - timedelta(hours=1),
            expires_at=now - timedelta(seconds=1) if expired else now + timedelta(minutes=10),
            used_at=now if used else None,
        ))
        db.commit()
    return token


def submit(client, token, password=NEW_PASSWORD, confirmation=NEW_PASSWORD):
    return client.post(CONFIRM_URL, json={"token": token, "password": password, "password_confirmation": confirmation})


def test_request_has_same_public_response_for_existing_missing_and_inactive(recovery_client, memory):
    known = recovery_client.post(REQUEST_URL, json={"email": "member@example.com"})
    missing = recovery_client.post(REQUEST_URL, json={"email": "missing@example.com"})
    with Session(memory.engine) as db:
        db.get(User, memory.user_id).is_active = False
        db.commit()
    inactive = recovery_client.post(REQUEST_URL, json={"email": "member@example.com"})
    assert known.status_code == missing.status_code == inactive.status_code == 202
    assert known.json() == missing.json() == inactive.json()
    memory.mail.assert_awaited_once()
    token = captured_token(memory)
    assert token not in known.text
    assert memory.mail.await_args.kwargs["sensitive"] is True
    with Session(memory.engine) as db:
        record = db.scalar(select(PasswordResetToken))
        assert record.token_hash == recovery.token_digest(token)
        assert record.token_hash != token
        assert not hasattr(record, "token")


def test_request_cooldown_and_replacement(recovery_client, memory):
    for _ in range(2):
        assert recovery_client.post(REQUEST_URL, json={"email": "member@example.com"}).status_code == 202
    assert memory.mail.await_count == 1
    first = captured_token(memory)
    with Session(memory.engine) as db:
        record = db.scalar(select(PasswordResetToken))
        record.created_at = datetime.now(timezone.utc) - timedelta(minutes=2)
        db.commit()
    recovery_client.post(REQUEST_URL, json={"email": "member@example.com"})
    second = captured_token(memory)
    assert first != second
    assert submit(recovery_client, first).status_code == 400
    assert submit(recovery_client, second).status_code == 200


def test_success_preserves_account_and_invalidates_old_jwt(recovery_client, memory):
    with Session(memory.engine) as db:
        old_jwt = create_user_token_response(db.get(User, memory.user_id)).access_token
    recovery_client.post(REQUEST_URL, json={"email": "member@example.com"})
    token = captured_token(memory)
    response = submit(recovery_client, token)
    assert response.status_code == 200
    assert token not in response.text and NEW_PASSWORD not in response.text
    assert submit(recovery_client, token).status_code == 400
    with Session(memory.engine) as db:
        user = db.get(User, memory.user_id)
        assert user.email == "member@example.com" and user.role == UserRoleEnum.ADMIN and user.is_active
        assert user.auth_version == 1
        assert verify_password(NEW_PASSWORD, user.password_hash)
        assert not verify_password(OLD_PASSWORD, user.password_hash)
        assert db.scalar(select(func.count()).select_from(User)) == 1
        assert db.scalar(select(PasswordResetToken)).used_at is not None
    assert recovery_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {old_jwt}"}).status_code == 401
    assert recovery_client.post("/api/v1/auth/login", json={"email": "member@example.com", "password": OLD_PASSWORD}).status_code == 401
    login = recovery_client.post("/api/v1/auth/login", json={"email": "member@example.com", "password": NEW_PASSWORD})
    assert login.status_code == 200
    assert decode_access_token(login.json()["access_token"])["ver"] == 1
    assert any("FROM users" in sql and "FOR UPDATE" in sql for sql in memory.statements)
    assert any("FROM password_reset_tokens" in sql and "FOR UPDATE" in sql for sql in memory.statements)


@pytest.mark.parametrize("kind", ["expired", "used", "inactive", "unknown", "malformed"])
def test_invalid_token_cannot_change_password(recovery_client, memory, kind):
    token = insert_token(memory, expired=kind == "expired", used=kind == "used", active=kind != "inactive")
    if kind == "unknown":
        token = "b" * 43
    elif kind == "malformed":
        token = "not-a-token"
    response = submit(recovery_client, token)
    assert response.status_code == 400
    assert token not in response.text
    with Session(memory.engine) as db:
        assert verify_password(OLD_PASSWORD, db.get(User, memory.user_id).password_hash)


@pytest.mark.parametrize("password,confirmation", [
    ("too-short", "too-short"), (NEW_PASSWORD, "different-password"),
    ("a" * 73, "a" * 73), ("á" * 37, "á" * 37), (" " * 20, " " * 20),
])
def test_password_policy_does_not_consume_token(recovery_client, memory, password, confirmation):
    token = insert_token(memory)
    response = submit(recovery_client, token, password, confirmation)
    assert response.status_code == 400
    assert password not in response.text
    with Session(memory.engine) as db:
        assert db.scalar(select(PasswordResetToken)).used_at is None


def test_validation_errors_never_echo_password_or_token(recovery_client):
    response = recovery_client.post(CONFIRM_URL, json={"token": "synthetic-private-token", "password": NEW_PASSWORD})
    assert response.status_code == 422
    assert "synthetic-private-token" not in response.text and NEW_PASSWORD not in response.text


def test_email_failure_keeps_generic_response_and_invalidates_link(recovery_client, memory, caplog):
    memory.mail.return_value = SimpleNamespace(success=False, simulated=False)
    response = recovery_client.post(REQUEST_URL, json={"email": "member@example.com"})
    assert response.status_code == 202
    token = captured_token(memory)
    assert submit(recovery_client, token).status_code == 400
    assert token not in caplog.text and "member@example.com" not in caplog.text


def test_simulated_email_is_not_treated_as_delivery(recovery_client, memory):
    memory.mail.return_value = SimpleNamespace(success=True, simulated=True)
    recovery_client.post(REQUEST_URL, json={"email": "member@example.com"})
    assert submit(recovery_client, captured_token(memory)).status_code == 400


@pytest.mark.asyncio
async def test_failed_transaction_rolls_back_password_and_token(memory, monkeypatch):
    token = insert_token(memory)
    async def fail(*args):
        raise RuntimeError("synthetic failure")
    monkeypatch.setattr(recovery, "invalidate_reset_tokens", fail)
    async with memory.session() as db:
        with pytest.raises(Exception) as error:
            await recovery.confirm_password_reset(db, token, NEW_PASSWORD, NEW_PASSWORD)
        assert error.value.status_code == 503
    with Session(memory.engine) as db:
        user = db.get(User, memory.user_id)
        assert verify_password(OLD_PASSWORD, user.password_hash) and user.auth_version == 0
        assert db.scalar(select(PasswordResetToken)).used_at is None


@pytest.mark.asyncio
async def test_admin_preserves_inactive_account_role_and_identity(memory):
    insert_token(memory, active=False)
    async with memory.session() as db:
        await recovery.admin_reset_password(db, memory.user_id, "member@example.com", NEW_PASSWORD, NEW_PASSWORD)
    with Session(memory.engine) as db:
        user = db.get(User, memory.user_id)
        assert not user.is_active and user.role == UserRoleEnum.ADMIN and user.email == "member@example.com"
        assert verify_password(NEW_PASSWORD, user.password_hash) and user.auth_version == 1
        assert db.scalar(select(PasswordResetToken)).used_at is not None
        assert db.scalar(select(func.count()).select_from(User)) == 1


@pytest.mark.asyncio
async def test_admin_requires_matching_existing_identity(memory):
    async with memory.session() as db:
        with pytest.raises(ValueError):
            await recovery.admin_reset_password(db, memory.user_id, "wrong@example.com", NEW_PASSWORD, NEW_PASSWORD)
    with Session(memory.engine) as db:
        assert verify_password(OLD_PASSWORD, db.get(User, memory.user_id).password_hash)


def test_admin_target_is_explicit_and_has_no_password_argument():
    for raw in ["", "postgresql://test:test@wrong-host/isolated", "postgresql://test:test@localhost/wrong-db"]:
        with pytest.raises(ValueError):
            checked_url(raw, "localhost", "isolated")
    url = checked_url("postgresql://test:test@localhost/isolated", "localhost", "isolated")
    assert url.drivername == "postgresql+asyncpg"
    assert not any(action.dest == "password" for action in parser()._actions)


def test_url_origin_is_configured_not_request_host(monkeypatch):
    monkeypatch.setattr(settings, "PASSWORD_RESET_URL", "https://example.com/reset-password")
    assert recovery.reset_url("synthetic") == "https://example.com/reset-password#token=synthetic"
    monkeypatch.setattr(settings, "PASSWORD_RESET_URL", "http://untrusted.example/reset-password")
    with pytest.raises(ValueError):
        recovery.reset_url("synthetic")
    monkeypatch.setattr(settings, "PASSWORD_RESET_URL", "http://localhost:5173/reset-password")
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    with pytest.raises(ValueError):
        recovery.reset_url("synthetic")


@pytest.mark.asyncio
async def test_sensitive_email_missing_provider_does_not_log_recipient(caplog):
    result = await email_service.send_transactional_email("member@example.com", "Prueba", "synthetic-private-token", sensitive=True)
    assert result.simulated
    assert "member@example.com" not in caplog.text and "synthetic-private-token" not in caplog.text


def test_email_template_escapes_user_input():
    html = email_service.build_password_reset_html('<script>alert("x")</script>', "https://example.com/reset-password#token=synthetic")
    assert "<script>" not in html and "&lt;script&gt;" in html


def test_migration_sql_is_generated_without_database():
    migration = runpy.run_path(str(Path("alembic/versions/20261026_01_password_recovery.py")))
    output = io.StringIO()
    context = MigrationContext.configure(dialect_name="postgresql", opts={"as_sql": True, "output_buffer": output})
    migration["upgrade"].__globals__["op"] = Operations(context)
    migration["upgrade"]()
    sql = output.getvalue()
    assert "ALTER TABLE users ADD COLUMN auth_version" in sql
    assert "CREATE TABLE password_reset_tokens" in sql
    assert "REFERENCES users (id) ON DELETE CASCADE" in sql
    assert "UPDATE users" not in sql and "INSERT INTO users" not in sql


def test_migration_runs_through_alembic_offline_only(monkeypatch):
    from alembic import command
    from alembic.config import Config
    import sqlalchemy
    def no_connection(*args, **kwargs):
        raise AssertionError("La comprobación offline no debe crear conexiones")
    monkeypatch.setattr(sqlalchemy, "engine_from_config", no_connection)
    output = io.StringIO()
    config = Config("alembic.ini", output_buffer=output)
    command.upgrade(config, "head", sql=True)
    assert "CREATE TABLE password_reset_tokens" in output.getvalue()


def test_request_throttle_has_same_response_and_does_not_send_more_emails(recovery_client, memory):
    responses = [recovery_client.post(REQUEST_URL, json={"email": "missing@example.com"}) for _ in range(20)]
    response = recovery_client.post(REQUEST_URL, json={"email": "member@example.com"})
    assert response.status_code == 202 and response.json() == responses[0].json()
    memory.mail.assert_not_awaited()


def test_legacy_jwt_remains_valid_until_password_change(recovery_client, memory):
    from jose import jwt
    payload = {"sub": str(memory.user_id), "role": "ADMIN", "exp": datetime.now(timezone.utc) + timedelta(minutes=10)}
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    headers = {"Authorization": f"Bearer {token}"}
    assert recovery_client.get("/api/v1/auth/me", headers=headers).status_code == 200
    reset_token = insert_token(memory)
    assert submit(recovery_client, reset_token).status_code == 200
    assert recovery_client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_exact_expiration_is_rejected(recovery_client, memory, monkeypatch):
    token = insert_token(memory)
    instant = datetime.now(timezone.utc)
    with Session(memory.engine) as db:
        db.scalar(select(PasswordResetToken)).expires_at = instant
        db.commit()
    class FixedDateTime:
        @staticmethod
        def now(tz):
            return instant
    monkeypatch.setattr(recovery, "datetime", FixedDateTime)
    assert submit(recovery_client, token).status_code == 400


def test_background_failure_is_generic(recovery_client, memory, monkeypatch, caplog):
    def unavailable():
        raise RuntimeError("synthetic-private-provider-detail")
    monkeypatch.setattr(recovery, "AsyncSessionLocal", unavailable)
    response = recovery_client.post(REQUEST_URL, json={"email": "member@example.com"})
    assert response.status_code == 202
    assert "synthetic-private-provider-detail" not in response.text + caplog.text


@pytest.mark.asyncio
async def test_sendgrid_error_does_not_expose_sensitive_content(monkeypatch, caplog):
    monkeypatch.setattr(settings, "SENDGRID_API_KEY", "synthetic-provider-key")
    class Provider:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return None
        async def post(self, *args, **kwargs):
            return SimpleNamespace(status_code=400, text="synthetic-private-token", headers={})
    monkeypatch.setattr(email_service.httpx, "AsyncClient", lambda **kwargs: Provider())
    result = await email_service.send_transactional_email("member@example.com", "Prueba", "synthetic-private-token", sensitive=True)
    assert not result.success
    assert "synthetic-private-token" not in result.status + caplog.text
    assert "member@example.com" not in caplog.text
    assert "sensitive_email_failed_sendgrid" in caplog.text


def test_admin_parser_does_not_echo_accidental_password_arguments(capsys):
    with pytest.raises(SystemExit):
        parser().parse_args(["--password", "synthetic-private-password"])
    assert "synthetic-private-password" not in capsys.readouterr().err
