import logging
import re
from urllib.parse import unquote


class RedactAccessTokenFilter(logging.Filter):
    """Oculta tokens de las URL sin alterar los argumentos de Uvicorn."""

    _query_value = re.compile(r"([?&])([^=&#\s]+)=([^&#\s]*)")

    def filter(self, record: logging.LogRecord) -> bool:
        def redact(value):
            if isinstance(value, str):
                def replace(match):
                    key = unquote(match.group(2)).lower()
                    if key in ("token", "access_token"):
                        return f"{match.group(1)}{match.group(2)}=[REDACTED]"
                    return match.group(0)

                return self._query_value.sub(replace, value)
            return value

        record.msg = redact(record.msg)
        if isinstance(record.args, tuple):
            record.args = tuple(redact(arg) for arg in record.args)
        elif isinstance(record.args, dict):
            record.args = {key: redact(value) for key, value in record.args.items()}
        return True


def configure_access_log_redaction() -> None:
    logger = logging.getLogger("uvicorn.access")
    if not any(isinstance(item, RedactAccessTokenFilter) for item in logger.filters):
        logger.addFilter(RedactAccessTokenFilter())
