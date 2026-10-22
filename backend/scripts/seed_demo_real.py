import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User, Technician
from app.models.client import Client
from app.models.work_order import WorkOrder
from app.models.magic_link import MagicLink
from app.models.enums import UserRoleEnum, OrderStatusEnum, OrderPriorityEnum, ServiceTypeEnum
from app.core.security import get_password_hash

async def run_seed():
    print("Iniciando seed de datos reales para Proyecto Atlas...")
    async with AsyncSessionLocal() as db:
        # 1. Configurar Técnico: Alexander Sáez
        tech_email = "al.saezl@duocuc.cl"
        res_tech_user = await db.execute(select(User).where(User.email == tech_email))
        tech_user = res_tech_user.scalar_one_or_none()

        if not tech_user:
            # Buscar por email alternativo si existe
            res_alt = await db.execute(select(User).where(User.email == "alexander.saez@atlasops.cl"))
            tech_user = res_alt.scalar_one_or_none()

        if not tech_user:
            tech_user = User(
                id=uuid.uuid4(),
                email=tech_email,
                password_hash=get_password_hash("Atlas2026!Prod"),
                full_name="Alexander Sáez López",
                phone="+56 9 1234 5678",
                role=UserRoleEnum.TECNICO,
                is_active=True,
            )
            db.add(tech_user)
            await db.flush()
            print(f"Creado usuario tecnico: {tech_user.full_name} ({tech_user.email})")
        else:
            tech_user.email = tech_email
            tech_user.full_name = "Alexander Sáez López"
            tech_user.role = UserRoleEnum.TECNICO
            tech_user.is_active = True
            await db.flush()
            print(f"Actualizado usuario tecnico: {tech_user.full_name} ({tech_user.email})")

        # Asegurar perfil Technician
        res_profile = await db.execute(select(Technician).where(Technician.id == tech_user.id))
        tech_profile = res_profile.scalar_one_or_none()
        if not tech_profile:
            tech_profile = Technician(
                id=tech_user.id,
                rut="19.876.543-2",
                initials="AS",
                vehicle_plate="GG-WP-24",
                current_lat=Decimal("-33.4372000"),
                current_lng=Decimal("-70.6506000"),
                is_available=True,
            )
            db.add(tech_profile)
            await db.flush()
            print("Creado perfil de tecnico en terreno para Alexander Sáez.")
        else:
            tech_profile.initials = "AS"
            tech_profile.vehicle_plate = "GG-WP-24"
            tech_profile.is_available = True
            await db.flush()

        # 2. Configurar Cliente: Diego Jiménez
        client_email = "di.jimeneze@duocuc.cl"
        res_client = await db.execute(select(Client).where(Client.contact_email == client_email))
        client = res_client.scalar_one_or_none()

        if not client:
            client = Client(
                id=uuid.uuid4(),
                rut="18.987.654-3",
                business_name="Entel B2B - Soluciones SpA",
                contact_person="Diego Jiménez Escobar",
                contact_phone="+56 9 8765 4321",
                contact_email=client_email,
                address="Av. Vitacura 2939, Torre Entel",
                comuna="Las Condes",
                region="Metropolitana",
                lat=Decimal("-33.4140000"),
                lng=Decimal("-70.6050000"),
            )
            db.add(client)
            await db.flush()
            print(f"Creado cliente: {client.contact_person} ({client.contact_email})")
        else:
            client.contact_person = "Diego Jiménez Escobar"
            client.business_name = "Entel B2B - Soluciones SpA"
            client.contact_phone = "+56 9 8765 4321"
            client.address = "Av. Vitacura 2939, Torre Entel"
            client.comuna = "Las Condes"
            await db.flush()
            print(f"Actualizado cliente: {client.contact_person} ({client.contact_email})")

        # 3. Actualizar / Crear Órdenes de Trabajo del Piloto
        orders_data = [
            {
                "order_number": "#OT-08491",
                "title": "Revisión y Calibración Antena 5G Entel",
                "description": "Mantenimiento preventivo de enlace inalámbrico de alta velocidad en sede corporativa.",
                "service_type": ServiceTypeEnum.REVISION_ANTENA_4G,
                "priority": OrderPriorityEnum.ALTA,
                "status": OrderStatusEnum.EN_RUTA,
                "address": "Av. Vitacura 2939, Piso 8",
                "comuna": "Las Condes",
                "token": "xK9pQ2",
            },
            {
                "order_number": "#OT-08492",
                "title": "Instalación Enlace Fibra Óptica Dedicada",
                "description": "Conexión de router empresarial y prueba de latencia simétrica 1 Gbps.",
                "service_type": ServiceTypeEnum.INSTALACION_FIBRA,
                "priority": OrderPriorityEnum.MEDIA,
                "status": OrderStatusEnum.CONFIRMADA,
                "address": "Av. Providencia 1760",
                "comuna": "Providencia",
                "token": "atlas_fibra_diego_8492",
            },
            {
                "order_number": "#OT-08495",
                "title": "Diagnóstico y Sustitución de Router Gateway",
                "description": "Sustitución de equipo por fallo en fuente de poder e integración a red.",
                "service_type": ServiceTypeEnum.DIAGNOSTICO_ROUTER,
                "priority": OrderPriorityEnum.URGENTE,
                "status": OrderStatusEnum.IDLE,
                "address": "San Martín 450",
                "comuna": "Santiago Centro",
                "token": "atlas_gateway_diego_8495",
            },
        ]

        now = datetime.now(timezone.utc)

        for o_info in orders_data:
            res_order = await db.execute(select(WorkOrder).where(WorkOrder.order_number == o_info["order_number"]))
            order = res_order.scalar_one_or_none()

            if not order:
                order = WorkOrder(
                    id=uuid.uuid4(),
                    order_number=o_info["order_number"],
                    title=o_info["title"],
                    description=o_info["description"],
                    service_type=o_info["service_type"],
                    priority=o_info["priority"],
                    status=o_info["status"],
                    client_id=client.id,
                    technician_id=tech_profile.id,
                    scheduled_date=now + timedelta(hours=2),
                    eta=now + timedelta(minutes=25) if o_info["status"] == OrderStatusEnum.EN_RUTA else None,
                    address_override=o_info["address"],
                    comuna_override=o_info["comuna"],
                    lat=Decimal("-33.4140000"),
                    lng=Decimal("-70.6050000"),
                    created_by=tech_user.id,
                )
                db.add(order)
                await db.flush()
                print(f"Creada orden: {order.order_number} asignada a {tech_user.full_name} para {client.contact_person}")
            else:
                order.title = o_info["title"]
                order.description = o_info["description"]
                order.service_type = o_info["service_type"]
                order.priority = o_info["priority"]
                order.status = o_info["status"]
                order.client_id = client.id
                order.technician_id = tech_profile.id
                order.address_override = o_info["address"]
                order.comuna_override = o_info["comuna"]
                await db.flush()
                print(f"Actualizada orden: {order.order_number} asignada a {tech_user.full_name} para {client.contact_person}")

            # 4. Asegurar Magic Link activo para la orden
            res_ml = await db.execute(select(MagicLink).where(MagicLink.work_order_id == order.id, MagicLink.is_active == True))
            mls = res_ml.scalars().all()
            ml = mls[0] if mls else None

            if not ml:
                ml = MagicLink(
                    id=uuid.uuid4(),
                    work_order_id=order.id,
                    token=o_info["token"],
                    expires_at=now + timedelta(days=7),
                    is_active=True,
                )
                db.add(ml)
                await db.flush()
                print(f"Generado Magic Link activo para {order.order_number}: token={ml.token}")
            else:
                ml.expires_at = now + timedelta(days=7)
                ml.is_active = True
                await db.flush()

        await db.commit()
        print("SEED EXITOSO: Base de datos sincronizada con Alexander Sáez (Técnico) y Diego Jiménez (Cliente).")

if __name__ == "__main__":
    asyncio.run(run_seed())
