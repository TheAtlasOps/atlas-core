import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDateSafe,
  getChileDayKey,
  formatChileanTime,
  formatChileanDate,
  formatChileanSchedule,
  getSchedulingInfo,
  getCompletionInfo,
  sortPendingVisits,
  sortHistoryVisits,
} from '../utils/scheduling.ts';
import { orderToVisit } from '../api/mappers.ts';

test('parseDateSafe maneja valores nulos, vacíos e inválidos', () => {
  assert.equal(parseDateSafe(null), null);
  assert.equal(parseDateSafe(''), null);
  assert.equal(parseDateSafe('   '), null);
  assert.equal(parseDateSafe('fecha-invalida'), null);
  assert.equal(parseDateSafe(undefined), null);
});

test('parseDateSafe asume UTC para strings ISO sin offset para evitar desplazamientos', () => {
  // Cuando viene sin 'Z' ni offset (ej. "2026-11-12T14:30:00")
  const parsedNaive = parseDateSafe('2026-11-12T14:30:00');
  const parsedZ = parseDateSafe('2026-11-12T14:30:00Z');

  assert.ok(parsedNaive instanceof Date);
  assert.ok(parsedZ instanceof Date);
  assert.equal(parsedNaive.getTime(), parsedZ.getTime());
});

test('parseDateSafe respeta strings con offset explícito', () => {
  const parsedOffset = parseDateSafe('2026-11-12T11:30:00-03:00');
  const parsedUtc = parseDateSafe('2026-11-12T14:30:00Z');

  assert.ok(parsedOffset instanceof Date);
  assert.equal(parsedOffset.getTime(), parsedUtc.getTime());
});

test('formatChileanTime formatea en es-CL / America/Santiago en formato 24h', () => {
  // 14:30 UTC en noviembre (Chile UTC-3) corresponde a las 11:30 hrs
  const formatted = formatChileanTime('2026-11-12T14:30:00Z');
  assert.equal(formatted, '11:30 hrs');
  assert.equal(formatChileanTime(null), '—');
});

test('formatChileanDate formatea el día y mes abreviado en es-CL', () => {
  const formatted = formatChileanDate('2026-11-12T14:30:00Z');
  // "12 nov" o "12 nov."
  assert.match(formatted, /12.*nov/i);
  assert.equal(formatChileanDate(null), '—');
});

test('getSchedulingInfo clasifica «Sin programar» cuando no tiene fecha', () => {
  const info = getSchedulingInfo(null);
  assert.equal(info.category, 'SIN_PROGRAMAR');
  assert.equal(info.label, 'Sin programar');
  assert.equal(info.isUnscheduled, true);
  assert.equal(info.displayDateTime, 'Sin fecha asignada');
});

test('getSchedulingInfo clasifica «Atrasada» cuando la fecha/hora programada ya venció', () => {
  // Referencia fija: 2026-11-12 a las 15:00 UTC (12:00 en Chile)
  const now = new Date('2026-11-12T15:00:00Z');

  // Orden programada ayer
  const infoAyer = getSchedulingInfo('2026-11-11T14:00:00Z', 'programada', now);
  assert.equal(infoAyer.category, 'ATRASADA');
  assert.equal(infoAyer.label, 'Atrasada');
  assert.equal(infoAyer.isOverdue, true);

  // Orden programada hoy más temprano (ej. 09:00 CL = 12:00 UTC)
  const infoTemprano = getSchedulingInfo('2026-11-12T12:00:00Z', 'programada', now);
  assert.equal(infoTemprano.category, 'ATRASADA');
  assert.equal(infoTemprano.isToday, true);
  assert.equal(infoTemprano.isOverdue, true);
  assert.match(infoTemprano.displayDateTime, /Atrasada · 09:00 hrs/);
});

test('getSchedulingInfo clasifica «Hoy» cuando está programada para hoy más tarde', () => {
  const now = new Date('2026-11-12T15:00:00Z'); // 12:00 CL
  const orderDate = '2026-11-12T19:30:00Z'; // 16:30 CL

  const info = getSchedulingInfo(orderDate, 'programada', now);
  assert.equal(info.category, 'HOY');
  assert.equal(info.label, 'Hoy');
  assert.equal(info.isToday, true);
  assert.equal(info.isOverdue, false);
  assert.equal(info.displayDateTime, 'Hoy · 16:30 hrs');
});

test('getSchedulingInfo clasifica «Próxima» cuando está programada para días futuros', () => {
  const now = new Date('2026-11-12T15:00:00Z');
  const futureOrder = '2026-11-13T14:00:00Z'; // Mañana

  const info = getSchedulingInfo(futureOrder, 'programada', now);
  assert.equal(info.category, 'PROXIMA');
  assert.equal(info.label, 'Próxima');
  assert.equal(info.isToday, false);
  assert.equal(info.isOverdue, false);
  assert.match(info.displayDateTime, /13.*nov.*11:00 hrs/);
});

test('getSchedulingInfo no marca órdenes completadas como atrasadas en el historial', () => {
  const now = new Date('2026-11-12T15:00:00Z');
  const pastOrder = '2026-11-10T14:00:00Z';

  // Si está completada, no debe quedar categorizada como ATRASADA
  const info = getSchedulingInfo(pastOrder, 'completada', now);
  assert.notEqual(info.category, 'ATRASADA');
});

test('sortPendingVisits prioriza órdenes activas y ordena por fecha próxima', () => {
  const now = new Date('2026-11-12T15:00:00Z');

  const vUnscheduled = {
    id: '1',
    code: 'OT-001',
    status: 'programada',
    scheduledDate: null,
    title: 'Sin fecha',
  };
  const vFarFuture = {
    id: '2',
    code: 'OT-002',
    status: 'programada',
    scheduledDate: '2026-11-15T10:00:00Z',
    title: 'Lejana',
  };
  const vToday = {
    id: '3',
    code: 'OT-003',
    status: 'programada',
    scheduledDate: '2026-11-12T18:00:00Z',
    title: 'Hoy tarde',
  };
  const vOverdue = {
    id: '4',
    code: 'OT-004',
    status: 'programada',
    scheduledDate: '2026-11-11T12:00:00Z',
    title: 'Atrasada',
  };
  const vEnRuta = {
    id: '5',
    code: 'OT-005',
    status: 'en_ruta',
    scheduledDate: '2026-11-12T20:00:00Z',
    title: 'En ruta actual',
  };

  const sorted = sortPendingVisits([vUnscheduled, vFarFuture, vToday, vOverdue, vEnRuta], now);

  // 1. En ruta tiene máxima prioridad inmediata
  assert.equal(sorted[0].code, 'OT-005');
  // 2. Atrasada (más antigua/próxima a vencer)
  assert.equal(sorted[1].code, 'OT-004');
  // 3. Hoy tarde
  assert.equal(sorted[2].code, 'OT-003');
  // 4. Lejana
  assert.equal(sorted[3].code, 'OT-002');
  // 5. Sin programar al final
  assert.equal(sorted[4].code, 'OT-001');
});

test('sortHistoryVisits ordena las visitas completadas de más reciente a más antigua', () => {
  const v1 = { id: '1', code: 'OT-001', status: 'completada', scheduledDate: '2026-11-01T10:00:00Z' };
  const v2 = { id: '2', code: 'OT-002', status: 'completada', scheduledDate: '2026-11-10T10:00:00Z' };
  const v3 = { id: '3', code: 'OT-003', status: 'completada', scheduledDate: '2026-11-05T10:00:00Z' };

  const sorted = sortHistoryVisits([v1, v2, v3]);

  assert.equal(sorted[0].code, 'OT-002'); // 10 nov
  assert.equal(sorted[1].code, 'OT-003'); // 05 nov
  assert.equal(sorted[2].code, 'OT-001'); // 01 nov
});

test('getCompletionInfo formatea «Finalizada · DD mes · HH:mm hrs» con fecha real en America/Santiago (Chile)', () => {
  // 19:30 UTC en noviembre (Chile UTC-3) corresponde a las 16:30 hrs
  const completedAt = '2026-11-10T19:30:00Z';
  const info = getCompletionInfo(completedAt);

  assert.equal(info.label, 'Finalizada');
  assert.equal(info.hasCompletionDate, true);
  assert.match(info.formattedDate, /10.*nov/i);
  assert.equal(info.formattedTime, '16:30 hrs');
  assert.match(info.displayDateTime, /10.*nov.*16:30 hrs/i);
  assert.match(info.fullText, /Finalizada · 10.*nov.*16:30 hrs/i);

  // Asegurar que no se devuelven etiquetas temporales de órdenes pendientes
  assert.notEqual(info.label, 'Próxima');
  assert.notEqual(info.label, 'Hoy');
  assert.notEqual(info.label, 'Atrasada');
});

test('getCompletionInfo retorna únicamente «Finalizada» cuando no existe fecha de finalización real', () => {
  for (const emptyVal of [null, undefined, '', '   ', 'fecha-invalida']) {
    const info = getCompletionInfo(emptyVal);

    assert.equal(info.label, 'Finalizada');
    assert.equal(info.hasCompletionDate, false);
    assert.equal(info.displayDateTime, null);
    assert.equal(info.formattedDate, null);
    assert.equal(info.formattedTime, null);
    assert.equal(info.fullText, 'Finalizada');

    // Sin etiquetas temporales
    assert.notEqual(info.label, 'Próxima');
    assert.notEqual(info.label, 'Hoy');
    assert.notEqual(info.label, 'Atrasada');
  }
});

test('sortHistoryVisits prioriza fecha de finalización real (completedAt) sobre scheduledDate', () => {
  // v1 fue programada el 10 nov pero finalizada el 12 nov
  const v1 = {
    id: '1',
    code: 'OT-001',
    status: 'completada',
    scheduledDate: '2026-11-10T10:00:00Z',
    completedAt: '2026-11-12T18:00:00Z',
  };
  // v2 fue programada el 11 nov pero finalizada el 11 nov
  const v2 = {
    id: '2',
    code: 'OT-002',
    status: 'completada',
    scheduledDate: '2026-11-11T10:00:00Z',
    completedAt: '2026-11-11T18:00:00Z',
  };
  // v3 completada sin completed_at (fallback a scheduledDate)
  const v3 = {
    id: '3',
    code: 'OT-003',
    status: 'completada',
    scheduledDate: '2026-11-08T10:00:00Z',
    completedAt: null,
  };

  const sorted = sortHistoryVisits([v3, v2, v1]);

  assert.equal(sorted[0].code, 'OT-001'); // 12 nov (más reciente)
  assert.equal(sorted[1].code, 'OT-002'); // 11 nov
  assert.equal(sorted[2].code, 'OT-003'); // 08 nov (fallback)
});

test('orderToVisit mapea completed_at del backend hacia completedAt en Visit', () => {
  const mockApiOrder = {
    id: 'wo-uuid-001',
    order_number: 'OT-0099',
    title: 'Visita completada',
    description: null,
    service_type: 'INSTALACION_FIBRA',
    priority: 'ALTA',
    status: 'COMPLETADA',
    client_id: 'client-uuid-001',
    technician_id: 'tech-uuid-001',
    scheduled_date: '2026-11-09T14:00:00Z',
    completed_at: '2026-11-09T16:45:00Z',
    eta: null,
    address_override: null,
    comuna_override: null,
    client: {
      id: 'client-uuid-001',
      business_name: 'Empresa Test',
      contact_person: null,
      contact_phone: '+56911112222',
      contact_email: 'test@empresa.cl',
      address: 'Av. Providencia 1234',
      comuna: 'Providencia',
    },
    items: [],
  };

  const visit = orderToVisit(mockApiOrder);

  assert.ok(visit !== null);
  assert.equal(visit.status, 'completada');
  assert.equal(visit.scheduledDate, '2026-11-09T14:00:00Z');
  assert.equal(visit.completedAt, '2026-11-09T16:45:00Z');
});
