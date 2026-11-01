import logging
from typing import Optional
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)


def is_neon_storage_configured() -> bool:
    """Verifica si las credenciales y el endpoint de Neon Object Storage están configurados."""
    return bool(
        settings.NEON_STORAGE_ENDPOINT
        and settings.NEON_STORAGE_ACCESS_KEY_ID
        and settings.NEON_STORAGE_SECRET_ACCESS_KEY
    )


def get_s3_client():
    """
    Retorna un cliente boto3 configurado para Neon Object Storage (compatible S3).
    Usa addressing_style='path' (forcePathStyle) requerido por Neon.
    """
    if not is_neon_storage_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neon Object Storage no está configurado. Faltan variables NEON_STORAGE_*."
        )

    return boto3.client(
        "s3",
        endpoint_url=settings.NEON_STORAGE_ENDPOINT,
        region_name=settings.NEON_STORAGE_REGION,
        aws_access_key_id=settings.NEON_STORAGE_ACCESS_KEY_ID,
        aws_secret_access_key=settings.NEON_STORAGE_SECRET_ACCESS_KEY,
        config=Config(s3={"addressing_style": "path"}),
    )


def upload_file_to_storage(
    content: bytes,
    object_key: str,
    content_type: str,
) -> str:
    """
    Sube un archivo binario a Neon Object Storage y devuelve la clave persistente del objeto (RNF-SEG-05).
    Lanza HTTPException si la subida falla, impidiendo registros huérfanos.
    """
    try:
        client = get_s3_client()
        client.put_object(
            Bucket=settings.NEON_STORAGE_BUCKET,
            Key=object_key,
            Body=content,
            ContentType=content_type,
        )
        logger.info(f"Objeto {object_key} subido exitosamente a Neon Object Storage.")
        return object_key
    except HTTPException:
        raise
    except ClientError as e:
        logger.error(f"Error S3 al subir {object_key}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Fallo al almacenar el archivo en Neon Object Storage: {e.response.get('Error', {}).get('Message', str(e))}"
        )
    except Exception as e:
        logger.error(f"Excepción inesperada en almacenamiento de {object_key}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al conectar con el servicio de almacenamiento: {str(e)}"
        )


def generate_presigned_download_url(
    object_key_or_url: str,
    expires_in: Optional[int] = None,
) -> str:
    """
    Genera una URL temporal prefirmada de lectura (GET) para un objeto en el bucket privado.
    Si ya es una URL completa o Data URL, la retorna sin alteración.
    """
    if not object_key_or_url:
        return ""

    # Si ya es URL completa HTTP/HTTPS o Data URL, retornar directamente
    if object_key_or_url.startswith(("http://", "https://", "data:")):
        return object_key_or_url

    if not is_neon_storage_configured():
        # En entornos locales sin S3 configurado, retornar la clave para trazabilidad
        return object_key_or_url

    try:
        client = get_s3_client()
        url = client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.NEON_STORAGE_BUCKET,
                "Key": object_key_or_url,
            },
            ExpiresIn=expires_in or settings.NEON_STORAGE_PRESIGN_EXPIRES_IN,
        )
        return url
    except Exception as e:
        logger.warning(f"No se pudo generar URL prefirmada para {object_key_or_url}: {str(e)}")
        return object_key_or_url
