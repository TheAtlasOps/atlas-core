import type { Status, Visit } from '../types';
import type { ApiOrder, ApiOrderStatus } from './types';

// ─── Orden de la API → Visita de la app ───────────────────────────────────────
const STATUS_FROM_API: Record<ApiOrderStatus, Status | null> = {
  IDLE:       'programada',
  CONFIRMADA: 'programada',
  EN_RUTA:    'en_ruta',
  EN_SITIO:   'en_curso',
  COMPLETADA: 'completada',
  CANCELADA:  null, // las órdenes canceladas no se muestran en la agenda
};

export const SERVICE_LABEL: Record<string, string> = {
  INSTALACION_FIBRA:      'Instalación de fibra',
  CAMBIO_SIM:             'Cambio de SIM',
  REVISION_ANTENA_4G:     'Revisión de antena 4G',
  DIAGNOSTICO_ROUTER:     'Diagnóstico de router',
  ACTIVACION_MAGIC_LINK:  'Activación Magic Link',
  INSTALACION_REPETIDOR:  'Instalación de repetidor',
  ALTA_LINEA_EMPRESARIAL: 'Alta de línea empresarial',
  REEMPLAZO_MODEM:        'Reemplazo de módem',
  CONFIGURACION_VPN:      'Configuración de VPN',
  OTRO:                   'Otro servicio',
};

function labelFor(serviceType: string): string {
  return (
    SERVICE_LABEL[serviceType] ??
    serviceType.charAt(0) + serviceType.slice(1).toLowerCase().replace(/_/g, ' ')
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay ? hm : `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${hm}`;
}

/** Devuelve null si la orden no debe mostrarse (cancelada). */
export function orderToVisit(o: ApiOrder): Visit | null {
  const status = STATUS_FROM_API[o.status];
  if (!status) return null;

  const street = o.address_override || o.client?.address || 'Dirección no informada';
  const comuna = o.comuna_override || o.client?.comuna || '';

  // Extraer hardware real asignado a la orden desde order.items
  let modelo = 'Sin información';
  let serie = 'Sin información';
  let iccid = 'Sin información';

  if (o.items && Array.isArray(o.items) && o.items.length > 0) {
    for (const item of o.items) {
      if (item.equipment_model && item.equipment_model.trim()) {
        modelo = item.equipment_model.trim();
      }
      if (item.equipment_serial && item.equipment_serial.trim()) {
        serie = item.equipment_serial.trim();
      }
      if (item.sim_iccid && item.sim_iccid.trim()) {
        iccid = item.sim_iccid.trim();
      }
    }
  }

  return {
    id: o.id,
    code: o.order_number,
    time: formatWhen(o.scheduled_date),
    client: o.client?.business_name ?? 'Cliente sin datos',
    service: labelFor(o.service_type),
    serviceType: o.service_type,
    title: o.title,
    description: o.description,
    address: comuna ? `${street}, ${comuna}` : street,
    zone: comuna || '—',
    status,
    equipo: { modelo, serie, iccid, falla: 'Sin registro' },
  };
}

/** Convierte y ordena por horario (las más próximas primero). */
export function ordersToVisits(orders: ApiOrder[]): Visit[] {
  return orders
    .slice()
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .map(orderToVisit)
    .filter((v): v is Visit => v !== null);
}
