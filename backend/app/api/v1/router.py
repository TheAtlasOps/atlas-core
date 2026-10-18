from fastapi import APIRouter
from app.api.v1.auth import router as auth_router

api_router = APIRouter()

# ─── Módulo de Identidad y Autenticación (14-DocArq §1.2 / RF-API-08) ────────
api_router.include_router(auth_router, prefix="/auth", tags=["Autenticación"])


@api_router.get("/health", tags=["Salud"])
async def health_check():
    """Endpoint de verificación de disponibilidad de la API v1 (RNF-DIS-01)."""
    return {
        "status": "online",
        "service": "Atlas FSM Core API",
        "version": "1.0.0",
        "mode": "production-ready"
    }

