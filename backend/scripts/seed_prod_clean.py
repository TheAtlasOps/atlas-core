import asyncio
from uuid import uuid4
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash

async def seed_production():
    async with AsyncSessionLocal() as db:
        print("[+] Seeding initial production actors into Neon DB...")

        # 1. Ensure extensions
        await db.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))

        # 2. Users
        users = [
            {
                "id": "a0000000-0000-0000-0000-000000000001",
                "email": "admin@atlasops.cl",
                "password": get_password_hash("Admin123!"),
                "full_name": "Administrador Atlas",
                "phone": "+56 9 1111 2222",
                "role": "ADMIN"
            },
            {
                "id": "a0000000-0000-0000-0000-000000000002",
                "email": "alexander.saez@atlasops.cl",
                "password": get_password_hash("Atlas2026!Prod"),
                "full_name": "Alexander Sáez López",
                "phone": "+56 9 1234 5678",
                "role": "ADMIN"
            },
            {
                "id": "a0000000-0000-0000-0000-000000000003",
                "email": "diego.jimenez@atlasops.cl",
                "password": get_password_hash("Atlas2026!Prod"),
                "full_name": "Diego Jiménez Escobar",
                "phone": "+56 9 8765 4321",
                "role": "ADMIN"
            },
            {
                "id": "b0000000-0000-0000-0000-000000000001",
                "email": "al.saezl@duocuc.cl",
                "password": get_password_hash("TecnicoAtlas2026!"),
                "full_name": "Alexander Sáez López",
                "phone": "+56 9 1234 5678",
                "role": "TECNICO"
            }
        ]

        for u in users:
            await db.execute(text("""
                INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active)
                VALUES (:id, :email, :password, :full_name, :phone, :role, TRUE)
                ON CONFLICT (email) DO UPDATE SET password_hash = :password, full_name = :full_name, role = :role;
            """), u)

        # 3. Technician Profile
        await db.execute(text("""
            INSERT INTO technicians (id, rut, initials, vehicle_plate, current_lat, current_lng, is_available)
            VALUES (
                'b0000000-0000-0000-0000-000000000001',
                '19.876.543-2',
                'AS',
                'GG-WP-24',
                -33.4372000,
                -70.6506000,
                TRUE
            )
            ON CONFLICT (rut) DO NOTHING;
        """))

        # 4. Enterprise Client for real notification testing
        await db.execute(text("""
            INSERT INTO clients (id, rut, business_name, contact_person, contact_phone, contact_email, address, comuna, region, lat, lng)
            VALUES (
                'c0000000-0000-0000-0000-000000000001',
                '18.987.654-3',
                'Entel B2B - Soluciones SpA',
                'Diego Jiménez Escobar',
                '+56 9 8765 4321',
                'di.jimeneze@duocuc.cl',
                'Av. Vitacura 2939, Torre Entel',
                'Las Condes',
                'Metropolitana',
                -33.4140000,
                -70.6050000
            )
            ON CONFLICT (rut) DO NOTHING;
        """))

        await db.commit()
        print("[OK] Production seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_production())
