import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def count_records():
    tables = [
        'users', 'clients', 'technicians', 'work_orders', 
        'equipment', 'sim_cards', 'magic_links', 'work_order_evidences'
    ]
    async with AsyncSessionLocal() as db:
        print("=== ROW COUNTS IN PRODUCTION NEON DB ===")
        for t in tables:
            try:
                res = await db.execute(text(f"SELECT COUNT(*) FROM {t};"))
                count = res.scalar()
                print(f"{t}: {count} rows")
            except Exception as e:
                print(f"{t}: Error ({e})")
        
        # Check users in DB to see who exists
        res = await db.execute(text("SELECT email, full_name, role FROM users;"))
        users = res.fetchall()
        print("\nRegistered Users:")
        for u in users:
            print(f"- {u[0]} ({u[1]}) [{u[2]}]")

if __name__ == "__main__":
    asyncio.run(count_records())
