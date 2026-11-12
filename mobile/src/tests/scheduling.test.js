import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDateSafe,
  getChileDayKey,
  formatChileanTime,
  formatChileanDate,
  formatChileanSchedule,
  getSchedulingInfo,
  sortPendingVisits,
  sortHistoryVisits,
} from '../utils/scheduling.ts';

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
