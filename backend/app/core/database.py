from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Engine Asíncrono para PostgreSQL (Neon / Supabase / AWS RDS)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    hide_parameters=True,  # Evita exponer tokens y credenciales en SQL y errores.
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,  # Impide caídas por conexiones inactivas cerradas por Neon
)

# Fábrica de sesiones asíncronas
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Clase base declarativa para todos los modelos ORM de SQLAlchemy 2.0"""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Inyector de dependencia para endpoints de FastAPI.
    Garantiza el cierre expedito de la sesión de base de datos (RNF-DIS-04).
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
