import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Configuración global de la aplicación Atlas FSM.
    Carga variables desde el entorno o archivo .env.
    """
    # Información General
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PROJECT_NAME: str = "Atlas - Field Service Management API"
    API_V1_STR: str = "/api/v1"

    # Base de Datos (Neon.tech / PostgreSQL)
    DATABASE_URL: str = "postgresql+asyncpg://neondb_owner:npg_sample_password@ep-atlas-sample.us-east-2.aws.neon.tech/atlas_fsm?sslmode=require"
    DATABASE_SYNC_URL: str = "postgresql://neondb_owner:npg_sample_password@ep-atlas-sample.us-east-2.aws.neon.tech/atlas_fsm?sslmode=require"

    # Pool de Conexiones (Optimización Free Tier / Serverless Neon)
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 300

    # Seguridad: JWT para Usuarios Internos (RNF-SEG-02)
    JWT_SECRET_KEY: str = "atlas_super_secret_jwt_key_change_in_production_1234567890"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Seguridad: Magic Links para Clientes (RNF-SEG-03)
    MAGIC_LINK_SECRET_KEY: str = "atlas_super_secret_magic_link_key_change_in_production_9876"
    MAGIC_LINK_EXPIRE_HOURS: int = 48
    FRONTEND_PORTAL_URL: str = "http://localhost:5173/status"

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://atlas-fsm.vercel.app",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    # Mensajería y Correos Transaccionales (Resend)
    RESEND_API_KEY: str = ""
    EMAILS_FROM_EMAIL: str = "notificaciones@atlasops.cl"

    # Google Cloud Storage (Evidencias de Terreno)
    GCS_BUCKET_NAME: str = "atlas-evidences"
    GCS_CREDENTIALS_JSON: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
