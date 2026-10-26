"""Pruebas aisladas: no leen .env, no conectan a una BD ni permiten red."""

import os
import socket
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import asyncpg
from fastapi.testclient import TestClient
from pydantic_settings.sources import DotEnvSettingsSource
from sqlalchemy.ext.asyncio import AsyncSession


TEST_ENV = {
    "DATABASE_URL": "postgresql+asyncpg://test:test@127.0.0.1:1/atlas_test",
    "DATABASE_SYNC_URL": "postgresql://test:test@127.0.0.1:1/atlas_test",
    "JWT_SECRET_KEY": "synthetic-test-signing-key-never-use-outside-tests",
    "DEBUG": "false",
    "ENVIRONMENT": "test",
    "RESEND_API_KEY": "",
    "SENDGRID_API_KEY": "",
    "GCS_CREDENTIALS_JSON": "",
    "FRONTEND_PORTAL_URL": "https://example.invalid/status",
    "CORS_ORIGINS": "[]",
}

# Bloquear la lectura de dotenv antes de importar cualquier módulo de ATLAS.
with patch.object(DotEnvSettingsSource, "_read_env_files", return_value={}), patch.dict(
    os.environ, TEST_ENV
):
    from app.core.database import get_db
    from app.main import app


@pytest.fixture(autouse=True)
def block_external_network(monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("Las pruebas de seguridad no permiten conexiones externas")

    # Windows necesita sockets locales para crear el event loop de TestClient.
    original_connect = socket.socket.connect

    def local_only(sock, address):
        if not isinstance(address, tuple) or address[0] not in ("127.0.0.1", "::1", "localhost"):
            return forbidden()
        return original_connect(sock, address)

    monkeypatch.setattr(socket.socket, "connect", local_only)
    monkeypatch.setattr(socket, "create_connection", forbidden)
    monkeypatch.setattr(asyncpg, "connect", forbidden)


@pytest.fixture
def db():
    session = MagicMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def client(db):
    async def isolated_db():
        yield db

    app.dependency_overrides[get_db] = isolated_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
