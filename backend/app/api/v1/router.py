from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.orders import router as orders_router
from app.api.v1.inventory import router as inventory_router

api_router = APIRouter()

# ─── Módulo de Identidad y Autenticación (14-DocArq §1.2 / RF-API-08) ────────
api_router.include_router(auth_router, prefix="/auth", tags=["Autenticación"])

# ─── Módulo de Órdenes y Despacho (14-DocArq §1.2 / RF-API-06 / RF-API-11) ───
api_router.include_router(orders_router, prefix="/orders", tags=["Órdenes de Trabajo"])

# ─── Módulo de Dispositivos e Inventario (14-DocArq §1.2 / RF-API-01-03) ─────
api_router.include_router(inventory_router, prefix="/inventory", tags=["Inventario de Dispositivos"])


@api_router.get("/health", tags=["Salud"])
async def health_check():
    """Endpoint de verificación de disponibilidad de la API v1 (RNF-DIS-01)."""
    return {
        "status": "online",
        "service": "Atlas FSM Core API",
        "version": "1.0.0",
        "mode": "production-ready"
    }

