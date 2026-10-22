import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT current_database(), current_user;"))
        print("Connected to:", res.fetchone())
        res = await db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"))
        tables = [r[0] for r in res.fetchall()]
        print(f"Total tables: {len(tables)}")
        print("Tables list:", tables)

if __name__ == "__main__":
    asyncio.run(check())
