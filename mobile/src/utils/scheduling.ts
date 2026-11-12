import type { Status, Visit } from '../types';

export type SchedulingCategory = 'HOY' | 'PROXIMA' | 'ATRASADA' | 'SIN_PROGRAMAR';

export interface ScheduleInfo {
  category: SchedulingCategory;
  label: string;
  displayDateTime: string;
  formattedTime: string;
  formattedDate: string;
  iconName: 'calendar' | 'clock' | 'alert-circle' | 'help-circle';
  badgeClass: string;
  textClass: string;
  isToday: boolean;
  isOverdue: boolean;
  isUnscheduled: boolean;
}

const CHILE_TZ = 'America/Santiago';

/**
 * Parsea de forma segura marcas temporales ISO provenientes de la API/Neon.
 * Si el string ISO carece de indicador de zona (sin 'Z' ni offset +/-HH:mm),
 * añade 'Z' para garantizar que se interprete en UTC y no como hora local.
 */
export function parseDateSafe(raw: string | Date | null | undefined): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const hasTz = trimmed.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(trimmed);
    const normalized = hasTz ? trimmed : `${trimmed}Z`;
    const d = new Date(normalized);
    if (!Number.isNaN(d.getTime())) return d;
    const fallback = new Date(trimmed);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Devuelve la clave del día YYYY-MM-DD en la zona horaria de Chile. */
export function getChileDayKey(date: Date): string {
  try {
    return date.toLocaleDateString('en-CA', { timeZone: CHILE_TZ });
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/** Formatea la hora en estándar chileno (HH:mm hrs) en America/Santiago. */
export function formatChileanTime(raw: string | Date | null | undefined): string {
  const d = parseDateSafe(raw);
  if (!d) return '—';
  try {
    const timeStr = d.toLocaleTimeString('es-CL', {
      timeZone: CHILE_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${timeStr} hrs`;
  } catch {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m} hrs`;
  }
}

/** Formatea la fecha corta en estándar chileno (ej. "12 nov" o "12/11"). */
export function formatChileanDate(raw: string | Date | null | undefined): string {
  const d = parseDateSafe(raw);
  if (!d) return '—';
  try {
    return d.toLocaleDateString('es-CL', {
      timeZone: CHILE_TZ,
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }
}

/** Formatea un resumen textual de la programación para ventanas y detalles. */
export function formatChileanSchedule(raw: string | Date | null | undefined, now: Date = new Date()): string {
  const d = parseDateSafe(raw);
  if (!d) return 'Sin fecha asignada';

  const orderKey = getChileDayKey(d);
  const nowKey = getChileDayKey(now);
  const timeStr = formatChileanTime(d);

  if (orderKey === nowKey) {
    return `Hoy · ${timeStr}`;
  }
  const dateStr = formatChileanDate(d);
  return `${dateStr} · ${timeStr}`;
}

/**
 * Determina la categoría de programación («Hoy», «Próxima», «Atrasada», «Sin programar»),
 * con textos formateados y clases visuales adaptadas al tema ATLAS.
 */
export function getSchedulingInfo(
  scheduledDate: string | null | undefined,
  orderStatus?: Status,
  now: Date = new Date(),
): ScheduleInfo {
  const date = parseDateSafe(scheduledDate);

  if (!date) {
    return {
      category: 'SIN_PROGRAMAR',
      label: 'Sin programar',
      displayDateTime: 'Sin fecha asignada',
      formattedTime: '—',
      formattedDate: '—',
      iconName: 'help-circle',
      badgeClass: 'bg-surface border-border',
      textClass: 'text-text3',
      isToday: false,
      isOverdue: false,
      isUnscheduled: true,
    };
  }

  const orderKey = getChileDayKey(date);
  const nowKey = getChileDayKey(now);
  const isPast = date.getTime() < now.getTime();
  const isCompleted = orderStatus === 'completada';
  const timeFormatted = formatChileanTime(date);
  const dateFormatted = formatChileanDate(date);

  // Si la orden ya está completada, no se marca como atrasada en el historial
  if (isPast && !isCompleted) {
    const isToday = orderKey === nowKey;
    const displayDateTime = isToday
      ? `Atrasada · ${timeFormatted}`
      : `${dateFormatted} · ${timeFormatted}`;

    return {
      category: 'ATRASADA',
      label: 'Atrasada',
      displayDateTime,
      formattedTime: timeFormatted,
      formattedDate: dateFormatted,
      iconName: 'alert-circle',
      badgeClass: 'bg-red-dim border-red/40',
      textClass: 'text-red',
      isToday,
      isOverdue: true,
      isUnscheduled: false,
    };
  }

  if (orderKey === nowKey) {
    return {
      category: 'HOY',
      label: 'Hoy',
      displayDateTime: `Hoy · ${timeFormatted}`,
      formattedTime: timeFormatted,
      formattedDate: dateFormatted,
      iconName: 'calendar',
      badgeClass: 'bg-brand-dim border-brand/40',
      textClass: 'text-brand-text',
      isToday: true,
      isOverdue: false,
      isUnscheduled: false,
    };
  }

  // Visita futura posterior a hoy
  return {
    category: 'PROXIMA',
    label: 'Próxima',
    displayDateTime: `${dateFormatted} · ${timeFormatted}`,
    formattedTime: timeFormatted,
    formattedDate: dateFormatted,
    iconName: 'clock',
    badgeClass: 'bg-blue-dim border-blue/40',
    textClass: 'text-blue',
    isToday: false,
    isOverdue: false,
    isUnscheduled: false,
  };
}

/**
 * Ordena las visitas pendientes:
 * 1. Primero las órdenes en ejecución (`en_curso` y `en_ruta`) con prioridad operativa inmediata.
 * 2. Órdenes con fecha programada, de la más próxima a la más lejana (cronológico ascendente).
 * 3. Órdenes sin fecha programada («Sin programar») al final, ordenadas por código OT.
 */
export function sortPendingVisits(visits: Visit[], now: Date = new Date()): Visit[] {
  return visits.slice().sort((a, b) => {
    // Prioridad inmediata de ejecución
    const aExec = a.status === 'en_curso' ? 2 : a.status === 'en_ruta' ? 1 : 0;
    const bExec = b.status === 'en_curso' ? 2 : b.status === 'en_ruta' ? 1 : 0;
    if (aExec !== bExec) {
      return bExec - aExec;
    }

    const dateA = parseDateSafe(a.scheduledDate);
    const dateB = parseDateSafe(b.scheduledDate);

    // Ambas con fecha: más próxima primero
    if (dateA && dateB) {
      return dateA.getTime() - dateB.getTime();
    }
    // Con fecha antes que sin fecha
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;

    // Sin fecha: por código de orden
    return a.code.localeCompare(b.code);
  });
}

/**
 * Ordena las visitas del historial («Completadas»):
 * De la más reciente a la más antigua.
 */
export function sortHistoryVisits(visits: Visit[]): Visit[] {
  return visits.slice().sort((a, b) => {
    const dateA = parseDateSafe(a.scheduledDate);
    const dateB = parseDateSafe(b.scheduledDate);

    if (dateA && dateB) {
      return dateB.getTime() - dateA.getTime();
    }
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;

    return b.code.localeCompare(a.code);
  });
}
