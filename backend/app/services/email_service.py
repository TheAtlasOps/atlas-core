import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import resend
import httpx
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
    """Genera plantilla HTML responsiva para invitación con Magic Link compatible con Gmail y Outlook."""
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Atlas Entel - Visita Técnica</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        
        <!-- Header con Espaciado Seguro -->
        <div style="background-color: #0f172a; padding: 22px 26px;">
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
            <tr>
              <td style="vertical-align: middle;">
                <span style="color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; vertical-align: middle;">🌍 Atlas</span>
                <span style="display: inline-block; margin-left: 14px; background-color: #f97316; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; vertical-align: middle;">ENTEL FSM</span>
              </td>
            </tr>
          </table>
        </div>

        <div style="padding: 32px 28px;">
          <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a;">Tu visita técnica ha sido programada</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">Hola <strong>{client_name}</strong>, tu orden de servicio de conectividad está confirmada. Puedes seguir el estado del técnico en tiempo real sin necesidad de crear contraseñas.</p>
          
          <!-- Tabla de Datos Clave (100% compatible con clientes de correo) -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; font-size: 13px;">
              <tr>
                <td style="color: #64748b; font-weight: 500; padding: 7px 0; border-bottom: 1px solid #f1f5f9;">Orden de Trabajo:</td>
                <td style="color: #0f172a; font-weight: 700; text-align: right; padding: 7px 0; border-bottom: 1px solid #f1f5f9; font-family: monospace;">{order_number}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-weight: 500; padding: 7px 0; border-bottom: 1px solid #f1f5f9;">Servicio:</td>
                <td style="color: #0f172a; font-weight: 600; text-align: right; padding: 7px 0; border-bottom: 1px solid #f1f5f9;">{service_type}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-weight: 500; padding: 7px 0; border-bottom: 1px solid #f1f5f9;">Fecha acordada:</td>
                <td style="color: #0f172a; font-weight: 600; text-align: right; padding: 7px 0; border-bottom: 1px solid #f1f5f9;">{scheduled_date_str}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-weight: 500; padding: 7px 0; border-bottom: 1px solid #f1f5f9;">Dirección:</td>
                <td style="color: #0f172a; font-weight: 600; text-align: right; padding: 7px 0; border-bottom: 1px solid #f1f5f9;">{address}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-weight: 500; padding: 7px 0;">Técnico Asignado:</td>
                <td style="color: #f97316; font-weight: 700; text-align: right; padding: 7px 0;">Alexander Sáez (Entel)</td>
              </tr>
            </table>
          </div>

          <!-- Botón de Acción Principal -->
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin: 24px 0;">
            <tr>
              <td align="center">
                <a href="{magic_link_url}" style="display: block; width: 100%; box-sizing: border-box; background-color: #f97316; color: #ffffff !important; text-align: center; padding: 14px 20px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px;" target="_blank">Acceder al Portal de Seguimiento</a>
              </td>
            </tr>
          </table>

          <div style="font-size: 12px; color: #64748b; background-color: #f1f5f9; padding: 12px; border-radius: 8px; text-align: center;">
            🛡️ <strong>Enlace seguro y personal:</strong> Este acceso es exclusivo para ti y tiene una vigencia estricta de 48 horas.
          </div>
        </div>
      </div>
      <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px;">
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
      <title>Atlas Entel - Servicio Finalizado</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: #166534; padding: 22px 26px;">
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
            <tr>
              <td style="vertical-align: middle;">
                <span style="color: #ffffff; font-size: 20px; font-weight: 800; vertical-align: middle;">✅ Atlas</span>
                <span style="display: inline-block; margin-left: 14px; background-color: #15803d; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; vertical-align: middle;">SERVICIO FINALIZADO</span>
              </td>
            </tr>
          </table>
        </div>
        <div style="padding: 32px 28px;">
          <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a;">Servicio técnico completado con éxito</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">Estimado/a <strong>{client_name}</strong>, el técnico <strong>{technician_name}</strong> ha finalizado las labores correspondientes a la orden <strong>{order_number}</strong> ({service_type}) a las {completed_at_str}.</p>
          
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">Tu acta de conformidad y respaldo técnico ya se encuentran registrados en la plataforma.</p>

          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin: 24px 0;">
            <tr>
              <td align="center">
                <a href="{magic_link_url}" style="display: block; width: 100%; box-sizing: border-box; background-color: #166534; color: #ffffff !important; text-align: center; padding: 14px 20px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px;" target="_blank">Ver Respaldo Digital y Acta de Servicio</a>
              </td>
            </tr>
          </table>
        </div>
      </div>
      <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px;">
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
    Despacha un correo transaccional utilizando SendGrid o Resend (RF-API-10 / 14-DocArq §3.3).
    Si las claves de API no están configuradas, opera en modo simulación para desarrollo local.
    """
    now = datetime.now(timezone.utc)
    sendgrid_key = settings.SENDGRID_API_KEY.strip() if settings.SENDGRID_API_KEY else ""
    resend_key = settings.RESEND_API_KEY.strip() if settings.RESEND_API_KEY else ""

    # 1. Envío prioritario vía API oficial de SendGrid
    if sendgrid_key and not sendgrid_key.startswith("SG.sample"):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {
                    "Authorization": f"Bearer {sendgrid_key}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": settings.EMAILS_FROM_EMAIL, "name": "Atlas Entel FSM"},
                    "subject": subject,
                    "content": [{"type": "text/html", "value": html_content}],
                }
                res = await client.post("https://api.sendgrid.com/v3/mail/send", json=payload, headers=headers)
                if res.status_code in (200, 202):
                    msg_id = res.headers.get("X-Message-Id", f"sg_{datetime.now().strftime('%Y%m%d%H%M%S')}")
                    logger.info(f"✅ Correo enviado exitosamente vía SendGrid a {to_email} (MsgID: {msg_id})")
                    return EmailNotificationResponse(
                        success=True,
                        recipient=to_email,
                        message_id=msg_id,
                        status="delivered",
                        sent_at=now,
                        simulated=False,
                    )
                else:
                    logger.error(f"❌ Error al enviar con SendGrid ({res.status_code}): {res.text}")
                    return EmailNotificationResponse(
                        success=False,
                        recipient=to_email,
                        message_id=None,
                        status=f"error_sendgrid_{res.status_code}: {res.text}",
                        sent_at=now,
                        simulated=False,
                    )
        except Exception as e:
            logger.error(f"❌ Excepción de red al enviar con SendGrid a {to_email}: {str(e)}")
            return EmailNotificationResponse(
                success=False,
                recipient=to_email,
                message_id=None,
                status=f"error_sendgrid_exception: {str(e)}",
                sent_at=now,
                simulated=False,
            )

    # 2. Envío secundario vía Resend si está configurado
    if resend_key and not resend_key.startswith("re_sample") and resend_key != "tu_api_key_aqui":
        try:
            resend.api_key = resend_key
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
            logger.error(f"❌ Error al enviar correo transaccional con Resend a {to_email}: {str(e)}")
            return EmailNotificationResponse(
                success=False,
                recipient=to_email,
                message_id=None,
                status=f"error: {str(e)}",
                sent_at=now,
                simulated=False,
            )

    # 3. Modo simulación dev si no hay proveedor configurado
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
