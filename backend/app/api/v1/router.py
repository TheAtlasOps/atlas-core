from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/health", tags=["Salud"])
async def health_check():
    """Endpoint de verificación de disponibilidad de la API v1 (RNF-DIS-01)."""
    return {
        "status": "online",
        "service": "Atlas FSM Core API",
        "version": "1.0.0",
        "mode": "production-ready"
    }
