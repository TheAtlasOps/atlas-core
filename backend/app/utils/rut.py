import re
from typing import Optional


def normalize_rut_key(raw_rut: Optional[str]) -> Optional[str]:
    """Normaliza un RUT chileno removiendo puntos, guiones y espacios en mayúsculas."""
    if raw_rut is None:
        return None
    cleaned = re.sub(r"[\s.\-]", "", str(raw_rut)).upper()
    return cleaned or None


def compute_rut_dv(body: str) -> str:
    """Calcula el dígito verificador chileno mediante algoritmo Módulo 11."""
    reversed_digits = map(int, reversed(body))
    factors = [2, 3, 4, 5, 6, 7]
    total = sum(d * factors[idx % len(factors)] for idx, d in enumerate(reversed_digits))
    remainder = 11 - (total % 11)
    if remainder == 11:
        return "0"
    if remainder == 10:
        return "K"
    return str(remainder)


def format_rut(normalized_key: str) -> str:
    """Da formato estándar XX.XXX.XXX-D a un RUT ya validado."""
    body, dv = normalized_key[:-1], normalized_key[-1]
    parts = []
    while body:
        parts.append(body[-3:])
        body = body[:-3]
    formatted_body = ".".join(reversed(parts))
    return f"{formatted_body}-{dv}"


def validate_and_format_rut(raw_rut: Optional[str]) -> Optional[str]:
    """
    Valida formato y dígito verificador (Módulo 11) de un RUT chileno.
    Retorna None si el valor está vacío o el RUT formateado si es válido.
    Lanza ValueError si el formato o dígito verificador es inválido.
    """
    normalized = normalize_rut_key(raw_rut)
    if not normalized:
        return None

    if not re.fullmatch(r"\d{6,8}[0-9K]", normalized):
        raise ValueError(
            "El RUT ingresado no tiene un formato chileno válido (ej: 12.345.678-5)."
        )

    body, dv = normalized[:-1], normalized[-1]
    if compute_rut_dv(body) != dv:
        raise ValueError(
            "El RUT ingresado no es válido. Verifique el número y el dígito verificador."
        )

    return format_rut(normalized)
