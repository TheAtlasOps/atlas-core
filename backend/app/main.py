from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import configure_access_log_redaction
from app.api.v1.router import api_router

configure_access_log_redaction()

# Inicialización de la aplicación FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",  # Especificación interactiva OpenAPI/Swagger viva (RF-API-13, RNF-MAN-02)
    redoc_url="/redoc",
    description="""
    ## 🌍 Atlas - Field Service Management (FSM) API
    Plataforma de soporte y trazabilidad en terreno para conectividad IoT y Routers Entel.
    
    ### Características de la API:
    - **Monolito Modular:** Dominios desacoplados (Auth, Orders, Inventory, Evidences, Notifications).
    - **Autenticación Dual:** JWT + RBAC para usuarios internos y Magic Links seguros para clientes.
    - **Soporte Offline PWA:** Ingesta por lotes (batch sync) resiliente ante desconexión celular.
    - **Integración Cloud:** PostgreSQL Serverless en Neon y Google Cloud Storage para evidencias.
    """,
    version="1.0.0",
)

# Configuración de CORS Restrictivo + Soporte automático para despliegues en Vercel (RNF-SEG-01 / RNF-MAN-01)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Inclusión de Rutas de la API v1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    """Ruta raíz de bienvenida e información del servicio."""
    return {
        "message": "Bienvenido a Atlas FSM Backend API",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Salud"])
async def health_check():
    """Health check global para balanceadores de carga y Vercel/Cloud Run."""
    return {"status": "ok", "app": settings.PROJECT_NAME}
