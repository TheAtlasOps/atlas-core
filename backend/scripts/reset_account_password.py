"""Restablecimiento administrativo explícito; nunca usa DATABASE_URL como destino."""
import argparse
import asyncio
import getpass
import os
import sys
import uuid

from sqlalchemy.engine import make_url


def checked_url(raw: str, expected_host: str, expected_database: str):
    if not raw:
        raise ValueError("Falta ATLAS_ADMIN_DATABASE_URL en el entorno seguro del operador.")
    url = make_url(raw)
    if url.drivername not in ("postgresql", "postgresql+asyncpg"):
        raise ValueError("El destino debe ser PostgreSQL.")
    if url.host != expected_host or url.database != expected_database:
        raise ValueError("El destino no coincide con el host y base confirmados.")
    query = dict(url.query)
    if "sslmode" in query:
        query["ssl"] = query.pop("sslmode")
    query.pop("channel_binding", None)
    return url.set(drivername="postgresql+asyncpg", query=query)


class SafeArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        self.exit(2, "Argumentos no válidos. Usa --help; las contraseñas solo se introducen en la terminal.\n")


def parser():
    result = SafeArgumentParser(description="Restablece únicamente una cuenta existente de ATLAS.")
    result.add_argument("--user-id", required=True, type=uuid.UUID)
    result.add_argument("--email", required=True)
    result.add_argument("--expected-host", required=True)
    result.add_argument("--expected-database", required=True)
    result.add_argument("--apply", action="store_true", help="Sin esta opción solo comprueba la cuenta.")
    return result


async def run(args, url, password=None, confirmation=None):
    from sqlalchemy import func, select
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.models.user import User
    from app.services.password_reset_service import admin_reset_password

    # Este engine recibe exclusivamente el destino verificado por checked_url.
    engine = create_async_engine(url, echo=False, hide_parameters=True)
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as db:
            if args.apply:
                await admin_reset_password(db, args.user_id, args.email, password, confirmation)
                print("Contraseña actualizada. Sesiones y enlaces de recuperación anteriores invalidados.")
            else:
                result = await db.execute(select(User.id, User.is_active).where(
                    User.id == args.user_id, func.lower(func.trim(User.email)) == args.email.strip().lower()
                ))
                found = result.one_or_none()
                if found is None:
                    raise ValueError("No existe una cuenta que coincida con el UUID y correo indicados.")
                print("Cuenta encontrada. No se modificó ningún dato." if found.is_active else "Cuenta encontrada e inactiva. No se modificó ni activó.")
    finally:
        await engine.dispose()


def main():
    args = parser().parse_args()
    try:
        url = checked_url(os.environ.get("ATLAS_ADMIN_DATABASE_URL", ""), args.expected_host, args.expected_database)
        password = confirmation = None
        if args.apply:
            if not sys.stdin.isatty():
                raise ValueError("El cambio requiere una terminal interactiva para ocultar las contraseñas.")
            if input(f"Escribe el UUID {args.user_id} para confirmar el destino y la cuenta: ").strip() != str(args.user_id):
                raise ValueError("Confirmación cancelada.")
            password = getpass.getpass("Nueva contraseña (no se mostrará): ")
            confirmation = getpass.getpass("Repite la nueva contraseña: ")
        asyncio.run(run(args, url, password, confirmation))
        return 0
    except (ValueError, KeyboardInterrupt):
        print("Operación cancelada: revisa destino, UUID, correo y confirmación. No se completó ningún cambio.", file=sys.stderr)
    except Exception:
        # Nunca imprimir excepciones que puedan contener DSN, contraseña o hash.
        print("No se completó el cambio. Revisa conexión, migración y política de contraseña; la transacción se revierte ante errores.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
