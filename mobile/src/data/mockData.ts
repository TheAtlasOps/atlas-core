import type { Status, IconName, TabId } from '../types';

// ─── Constantes de la app (las visitas ahora vienen de la API) ────────────────
export const MAX_PHOTOS = 6;

export const CHECKLIST_ITEMS = [
  { id: 1, title: 'Verificación de acceso',      desc: 'Acceso al lugar confirmado' },
  { id: 2, title: 'Revisión de equipos',         desc: 'Equipos en condiciones operativas' },
  { id: 3, title: 'Instalación / mantenimiento', desc: 'Trabajo realizado correctamente' },
  { id: 4, title: 'Pruebas de funcionamiento',   desc: 'Todo funcionando según estándar' },
  { id: 5, title: 'Cierre y validación',         desc: 'Cliente conforme con el servicio' },
];

// Clases Tailwind por estado
export const STATUS_META: Record<Status, { label: string; wrapClass: string; dotClass: string; textClass: string }> = {
  programada: { label: 'Programada', wrapClass: 'bg-overlay/[0.07]', dotClass: 'bg-text3', textClass: 'text-text2' },
  en_ruta:    { label: 'En ruta',    wrapClass: 'bg-blue-dim',     dotClass: 'bg-blue',  textClass: 'text-blue' },
  en_curso:   { label: 'En curso',   wrapClass: 'bg-brand-dim',    dotClass: 'bg-brand', textClass: 'text-brand-text' },
  completada: { label: 'Completada', wrapClass: 'bg-green-dim',    dotClass: 'bg-green', textClass: 'text-green' },
};

// Color e ícono por tipo de servicio
export const SERVICE_COLOR: Record<string, string> = {
  INSTALACION_FIBRA:      '#60A5FA',
  CAMBIO_SIM:             '#A78BFA',
  REVISION_ANTENA_4G:     '#FBBF24',
  DIAGNOSTICO_ROUTER:     '#F97316',
  ACTIVACION_MAGIC_LINK:  '#34D399',
  INSTALACION_REPETIDOR:  '#38BDF8',
  ALTA_LINEA_EMPRESARIAL: '#F472B6',
  REEMPLAZO_MODEM:        '#FB7185',
  CONFIGURACION_VPN:      '#2DD4BF',
  OTRO:                   '#9CA3AF',
};

export const SERVICE_ICON: Record<string, IconName> = {
  INSTALACION_FIBRA:      'wifi',
  CAMBIO_SIM:             'credit-card',
  REVISION_ANTENA_4G:     'radio',
  DIAGNOSTICO_ROUTER:     'activity',
  ACTIVACION_MAGIC_LINK:  'link',
  INSTALACION_REPETIDOR:  'repeat',
  ALTA_LINEA_EMPRESARIAL: 'phone',
  REEMPLAZO_MODEM:        'refresh-cw',
  CONFIGURACION_VPN:      'shield',
  OTRO:                   'tool',
};

export const TABS: { id: TabId; label: string }[] = [
  { id: 'resumen',    label: 'Resumen' },
  { id: 'checklist',  label: 'Checklist' },
  { id: 'equipo',     label: 'Equipo' },
  { id: 'evidencias', label: 'Evidencias' },
  { id: 'notas',      label: 'Notas' },
];