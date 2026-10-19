import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import resend
from app.core.config import settings
from app.schemas.notification import EmailNotificationResponse

logger = logging.getLogger(__name__)


def build_magic_link_html(
    client_name: str,
    order_number: str,
    service_type: str,
    scheduled_date_str: str,
    address: str,
    magic_link_url: str,
) -> str:
    """Genera plantilla HTML responsiva para invitación con Magic Link."""
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }}
        .card {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
        .header {{ background: #0f172a; padding: 24px; text-align: left; }}
        .brand {{ color: #ffffff; font-size: 18px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; }}
        .badge {{ background: #f97316; color: #ffffff; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; }}
        .body {{ padding: 32px 28px; }}
        h1 {{ font-size: 20px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a; }}
        p {{ font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }}
        .details {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px; }}
        .detail-row {{ display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }}
        .detail-row:last-child {{ margin-bottom: 0; }}
        .detail-label {{ color: #64748b; font-weight: 500; }}
        .detail-value {{ color: #0f172a; font-weight: 600; text-align: right; }}
        .btn {{ display: block; width: 100%; box-sizing: border-box; background: #f97316; color: #ffffff !important; text-align: center; padding: 14px 20px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 24px 0; }}
        .alert {{ font-size: 12px; color: #64748b; background: #f1f5f9; padding: 12px; border-radius: 8px; text-align: center; }}
        .footer {{ text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="brand">🌍 Atlas <span class="badge">Entel FSM</span></span>
        </div>
        <div class="body">
          <h1>Tu visita técnica ha sido programada</h1>
          <p>Hola <strong>{client_name}</strong>, tu orden de servicio de conectividad está confirmada. Puedes seguir el estado del técnico en tiempo real sin necesidad de crear contraseñas.</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Orden de Trabajo:</span>
              <span class="detail-value">{order_number}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Servicio:</span>
              <span class="detail-value">{service_type}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Fecha acordada:</span>
              <span class="detail-value">{scheduled_date_str}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Dirección:</span>
              <span class="detail-value">{address}</span>
            </div>
          </div>

          <a href="{magic_link_url}" class="btn" target="_blank">Acceder al Portal de Seguimiento</a>

          <div class="alert">
            🛡️ <strong>Enlace seguro y personal:</strong> Este acceso es exclusivo para ti y tiene una vigencia estricta de 48 horas.
          </div>
        </div>
      </div>
      <div class="footer">
        © 2026 Atlas FSM para Entel Chile. Mensajería transaccional automática.
      </div>
    </body>
    </html>
    """


def build_service_completed_html(
    client_name: str,
    order_number: str,
    service_type: str,
    completed_at_str: str,
    technician_name: str,
    magic_link_url: str,
) -> str:
    """Genera plantilla HTML para notificación de servicio completado y acta de entrega."""
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }}
        .card {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }}
        .header {{ background: #166534; padding: 24px; text-align: left; }}
        .brand {{ color: #ffffff; font-size: 18px; font-weight: 700; }}
        .body {{ padding: 32px 28px; }}
        h1 {{ font-size: 20px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a; }}
        p {{ font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }}
        .btn {{ display: block; width: 100%; box-sizing: border-box; background: #166534; color: #ffffff !important; text-align: center; padding: 14px 20px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 24px 0; }}
        .footer {{ text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="brand">✅ Atlas · Servicio Finalizado</span>
        </div>
        <div class="body">
          <h1>Servicio técnico completado con éxito</h1>
          <p>Estimado/a <strong>{client_name}</strong>, el técnico <strong>{technician_name}</strong> ha finalizado las labores correspondientes a la orden <strong>{order_number}</strong> ({service_type}) a las {completed_at_str}.</p>
          
          <p>Tu acta de conformidad y respaldo técnico ya se encuentran registrados en la plataforma.</p>

          <a href="{magic_link_url}" class="btn" target="_blank">Ver Respaldo Digital y Acta de Servicio</a>
        </div>
      </div>
      <div class="footer">
        © 2026 Atlas FSM para Entel Chile.
      </div>
    </body>
    </html>
    """


async def send_transactional_email(
    to_email: str,
    subject: str,
    html_content: str,
) -> EmailNotificationResponse:
    """
    Despacha un correo transaccional utilizando Resend (RF-API-10 / 14-DocArq §3.3).
    Si la clave de API es de prueba o no está configurada, opera en modo simulación (dev).
    """
    now = datetime.now(timezone.utc)
    api_key = settings.RESEND_API_KEY.strip() if settings.RESEND_API_KEY else ""

    # Modo simulación para entornos de desarrollo / pruebas sin API key activa
    if not api_key or api_key.startswith("re_sample") or api_key == "tu_api_key_aqui":
        logger.info(
            f"📧 [DEV MOCK EMAIL] Envío simulado a {to_email} | Asunto: {subject}"
        )
        return EmailNotificationResponse(
            success=True,
            recipient=to_email,
            message_id=f"mock_msg_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            status="simulated",
            sent_at=now,
            simulated=True,
        )

    # Envío real con Resend
    try:
        resend.api_key = api_key
        params: resend.Emails.SendParams = {
            "from": f"Atlas FSM <{settings.EMAILS_FROM_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }
        res = resend.Emails.send(params)
        message_id = res.get("id") if isinstance(res, dict) else str(res)

        return EmailNotificationResponse(
            success=True,
            recipient=to_email,
            message_id=message_id,
            status="delivered",
            sent_at=now,
            simulated=False,
        )
    except Exception as e:
        logger.error(f"❌ Error al enviar correo transaccional a {to_email}: {str(e)}")
        return EmailNotificationResponse(
            success=False,
            recipient=to_email,
            message_id=None,
            status=f"error: {str(e)}",
            sent_at=now,
            simulated=False,
        )
