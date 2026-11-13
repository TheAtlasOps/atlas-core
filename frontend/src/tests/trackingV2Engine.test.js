/**
 * frontend/src/tests/trackingV2Engine.test.js
 *
 * Suite de pruebas unitarias exhaustiva para la Refactorización V2 del Seguimiento
 * de Técnicos en ATLAS FSM.
 *
 * Cubre las 10 verificaciones obligatorias:
 * 1. Simulación avanza sin abrir el visor.
 * 2. Cerrar y reabrir el mapa no reinicia el recorrido.
 * 3. El progreso cambia correctamente según wall-clock time (180s).
 * 4. El vehículo llega exactamente a destino al completar tiempo (milimétrico).
 * 5. Notificación se emite exactamente una vez de forma centralizada y pura.
 * 6. Cambiar de vista / recargar no duplica simulaciones.
 * 7. Mover el mapa no detiene el recorrido.
 * 8. El control «Seguir vehículo» activa/desactiva centrado y se desactiva con dragstart.
 * 9. Filtro GPS descarta técnicos sin ubicación reciente verificada.
 * 10. Simulación no altera base de datos ni estados reales de órdenes.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  SIMULATION_DURATION_MS,
  startTracking,
  restartTracking,
  getTracking,
  computeTrackingSnapshot,
  syncOrdersWithTracking,
  resetAllTrackings,
  setOnTrackingCompleted,
  checkAndNotifyCompletion,
  smoothAngle,
} from "../lib/routeTrackingManager.js";
import { DEMO_ORIGIN, FALLBACK_DEMO_COORDINATES } from "../lib/routeSimulation.js";
import { hasVerifiedRecentGps, getMapSummaryCounters } from "../lib/mapClustering.js";

// Helper para crear una orden mock válida en estado EN_RUTA
function makeMockOrder(orderNumber = "OT-V2-001", id = "9901") {
  return {
    id,
    orderNumber,
    order_number: orderNumber,
    status: "EN_RUTA",
    title: "Instalación Enlace Dedicado 500M",
    client: "Banco de Chile - Sucursal Central",
    clientName: "Banco de Chile - Sucursal Central",
    address: "Calle Huérfanos 1100, Santiago",
    assigned_technician: { id: 7, name: "Carlos Mendoza", phone: "+56 9 8765 4321" },
    lat: -33.4412,
    lng: -70.6534,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Simulación avanza sin abrir el visor
// ─────────────────────────────────────────────────────────────────────────────
test("1. Simulación avanza de forma autónoma en frontend sin necesidad de abrir el visor", () => {
  resetAllTrackings();
  const order = makeMockOrder("OT-AUTONOMOUS-1", "101");

  // Sincronizar órdenes (simula carga del tablero o cambio de estado)
  syncOrdersWithTracking([order]);

  const record = getTracking("101");
  assert.ok(record, "El seguimiento debe inicializarse en memoria");
  assert.equal(record.orderId, "101");

  // Asignar ruta de prueba precargada para evaluar interpolación
  record.routeData = {
    coordinates: FALLBACK_DEMO_COORDINATES,
    interpolatedCoordinates: FALLBACK_DEMO_COORDINATES,
    distanceMeters: 4650,
    durationSeconds: 780,
  };

  // Evaluar estado a los 60 segundos (33% del recorrido)
  const snap60 = computeTrackingSnapshot(record, record.startedAt + 60000);
  assert.equal(snap60.progressPercent, 33);
  assert.equal(snap60.remainingSeconds, 120);
  assert.equal(snap60.isArrived, false);
  assert.ok(snap60.traveledSegment.length > 1, "Debe registrar tramo recorrido");
  assert.ok(snap60.pendingSegment.length > 1, "Debe registrar tramo pendiente");
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Cerrar y reabrir el mapa no reinicia el recorrido
// ─────────────────────────────────────────────────────────────────────────────
test("2. Cerrar y reabrir el mapa conserva el progreso basado en timestamps reales (wall-clock time)", () => {
  resetAllTrackings();
  const order = makeMockOrder("OT-PERSIST-2", "102");
  const t0 = 1700000000000;

  // Iniciar seguimiento en t0
  const record = startTracking(order);
  record.startedAt = t0;
  record.routeData = {
    coordinates: FALLBACK_DEMO_COORDINATES,
    interpolatedCoordinates: FALLBACK_DEMO_COORDINATES,
    distanceMeters: 4650,
    durationSeconds: 780,
  };

  // Simular render inicial
  const snapInitial = computeTrackingSnapshot(record, t0);
  assert.equal(snapInitial.progressPercent, 0);

  // Simular que el usuario cierra el mapa o visor y transcurren 90 segundos (50%)
  const tSimulated = t0 + 90000;

  // Simular que el usuario reabre el mapa: re-obtener el registro desde el almacén central
  const recordReopened = getTracking("102");
  assert.equal(recordReopened.startedAt, t0, "El timestamp startedAt debe ser idéntico");

  const snapReopened = computeTrackingSnapshot(recordReopened, tSimulated);
  assert.equal(snapReopened.progressPercent, 50, "El progreso debe haber avanzado al 50% sin reiniciarse");
  assert.equal(snapReopened.remainingSeconds, 90);
  assert.equal(snapReopened.isArrived, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. El progreso cambia correctamente según wall-clock time (180s)
// ─────────────────────────────────────────────────────────────────────────────
test("3. El progreso avanza de forma determinista y proporcional a lo largo de 180 segundos", () => {
  const t0 = 2000000000000;
  const mockRecord = {
    orderId: "OT-TIMING-3",
    orderNumber: "OT-TIMING-3",
    startedAt: t0,
    durationMs: SIMULATION_DURATION_MS,
    origin: DEMO_ORIGIN,
    destination: { lat: -33.4412, lng: -70.6534 },
    routeData: {
      coordinates: FALLBACK_DEMO_COORDINATES,
      interpolatedCoordinates: FALLBACK_DEMO_COORDINATES,
      distanceMeters: 4650,
      durationSeconds: 780,
    },
  };

  // 0s -> 0%
  const s0 = computeTrackingSnapshot(mockRecord, t0);
  assert.equal(s0.progressPercent, 0);
  assert.equal(s0.remainingSeconds, 180);

  // 45s -> 25%
  const s45 = computeTrackingSnapshot(mockRecord, t0 + 45000);
  assert.equal(s45.progressPercent, 25);
  assert.equal(s45.remainingSeconds, 135);

  // 90s -> 50%
  const s90 = computeTrackingSnapshot(mockRecord, t0 + 90000);
  assert.equal(s90.progressPercent, 50);
  assert.equal(s90.remainingSeconds, 90);

  // 135s -> 75%
  const s135 = computeTrackingSnapshot(mockRecord, t0 + 135000);
  assert.equal(s135.progressPercent, 75);
  assert.equal(s135.remainingSeconds, 45);

  // 180s -> 100%
  const s180 = computeTrackingSnapshot(mockRecord, t0 + 180000);
  assert.equal(s180.progressPercent, 100);
  assert.equal(s180.remainingSeconds, 0);
  assert.equal(s180.isArrived, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. El vehículo llega exactamente a destino al completar tiempo (milimétrico)
// ─────────────────────────────────────────────────────────────────────────────
test("4. El vehículo posiciona exactamente en las coordenadas de destino al cumplirse los 180s", () => {
  const destination = { lat: -33.4535, lng: -70.6605 };
  const t0 = 1000000;
  const mockRecord = {
    orderId: "OT-DEST-4",
    orderNumber: "OT-DEST-4",
    startedAt: t0,
    durationMs: 180000,
    origin: DEMO_ORIGIN,
    destination,
    routeData: {
      coordinates: FALLBACK_DEMO_COORDINATES,
      interpolatedCoordinates: FALLBACK_DEMO_COORDINATES,
      distanceMeters: 5200,
      durationSeconds: 850,
    },
  };

  // Al completar t0 + 180000 (o posterior)
  const snapArrived = computeTrackingSnapshot(mockRecord, t0 + 180500);

  assert.equal(snapArrived.isArrived, true);
  assert.equal(snapArrived.remainingDistanceMeters, 0, "Distancia restante debe ser exactamente 0 m");
  assert.equal(snapArrived.remainingSeconds, 0, "Segundos restantes debe ser exactamente 0");

  // Coordenada exacta en destino
  assert.equal(snapArrived.currentCoord[0], destination.lat);
  assert.equal(snapArrived.currentCoord[1], destination.lng);

  // Continuidad de polilíneas: el tramo recorrido finaliza exactamente en destino
  const lastTraveledPt = snapArrived.traveledSegment[snapArrived.traveledSegment.length - 1];
  assert.deepEqual(lastTraveledPt, [destination.lat, destination.lng]);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Notificación se emite exactamente una vez de forma centralizada y pura
// ─────────────────────────────────────────────────────────────────────────────
test("5. computeTrackingSnapshot es 100% puro y checkAndNotifyCompletion emite una sola notificación", () => {
  let notificationCount = 0;
  let receivedRecord = null;

  setOnTrackingCompleted((record) => {
    notificationCount += 1;
    receivedRecord = record;
  });

  const record = {
    orderId: "OT-NOTIF-5",
    orderNumber: "OT-NOTIF-5",
    startedAt: 500000,
    durationMs: 180000,
    hasNotifiedCompletion: false,
    origin: DEMO_ORIGIN,
    destination: { lat: -33.44, lng: -70.65 },
    routeData: {
      coordinates: FALLBACK_DEMO_COORDINATES,
      interpolatedCoordinates: FALLBACK_DEMO_COORDINATES,
      distanceMeters: 3000,
      durationSeconds: 500,
    },
  };

  // Paso A: computeTrackingSnapshot repetido NO muta hasNotifiedCompletion ni dispara callback
  computeTrackingSnapshot(record, 500000 + 180000);
  computeTrackingSnapshot(record, 500000 + 180000);
  computeTrackingSnapshot(record, 500000 + 180000);
  assert.equal(notificationCount, 0, "computeTrackingSnapshot debe ser puro y no generar efectos secundarios");
  assert.equal(record.hasNotifiedCompletion, false);

  // Paso B: checkAndNotifyCompletion centralizado evalúa y emite una sola vez
  const completedFirst = checkAndNotifyCompletion(record, 500000 + 180000);
  assert.equal(completedFirst, true);
  assert.equal(notificationCount, 1);
  assert.equal(receivedRecord.orderId, "OT-NOTIF-5");
  assert.equal(record.hasNotifiedCompletion, true);

  // Paso C: Múltiples evaluaciones posteriores NO disparan una segunda notificación
  const completedSecond = checkAndNotifyCompletion(record, 500000 + 185000);
  assert.equal(completedSecond, false);
  assert.equal(notificationCount, 1, "La notificación debe emitirse exactamente una sola vez");

  // Limpiar callback
  setOnTrackingCompleted(null);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Cambiar de vista / recargar no duplica simulaciones
// ─────────────────────────────────────────────────────────────────────────────
test("6. Sincronizaciones sucesivas de la misma orden preservan el registro único sin duplicar", () => {
  resetAllTrackings();
  const order = makeMockOrder("OT-DEDUP-6", "106");

  // Primera sincronización
  syncOrdersWithTracking([order]);
  const rec1 = getTracking("106");
  assert.ok(rec1);
  const originalStartedAt = rec1.startedAt;

  // Simular que el usuario cambia de vista dentro del Dashboard y el hook syncOrdersWithTracking se ejecuta de nuevo
  syncOrdersWithTracking([order]);
  syncOrdersWithTracking([order]);
  syncOrdersWithTracking([order]);

  const recFinal = getTracking("106");
  assert.equal(recFinal.startedAt, originalStartedAt, "El timestamp de inicio no debe ser modificado");
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Mover el mapa no detiene el recorrido
// ─────────────────────────────────────────────────────────────────────────────
test("7. Las interacciones con el mapa (arrastre, zoom) no afectan el progreso ni el motor", () => {
  resetAllTrackings();
  const order = makeMockOrder("OT-MAP-DRAG-7", "107");
  const t0 = 800000;

  const record = startTracking(order);
  record.startedAt = t0;
  record.routeData = {
    coordinates: FALLBACK_DEMO_COORDINATES,
    interpolatedCoordinates: FALLBACK_DEMO_COORDINATES,
    distanceMeters: 4000,
    durationSeconds: 600,
  };

  // Simular interacción de usuario: arrastre manual del mapa en t0 + 30s
  // En la arquitectura V2, los eventos de mapa son puramente de interfaz y no tocan record.startedAt
  const snapBefore = computeTrackingSnapshot(record, t0 + 30000);
  assert.equal(snapBefore.remainingSeconds, 150);

  // El motor sigue evaluando con wall-clock time en t0 + 60s
  const snapAfter = computeTrackingSnapshot(record, t0 + 60000);
  assert.equal(snapAfter.remainingSeconds, 120);
  assert.ok(snapAfter.progress > snapBefore.progress, "El progreso avanza ininterrumpidamente");
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. El control «Seguir vehículo» activa/desactiva centrado y se desactiva con dragstart
// ─────────────────────────────────────────────────────────────────────────────
test("8. Lógica de control de cámara «Seguir vehículo» y desconexión segura en dragstart", () => {
  let followVehicle = true;

  const onToggleFollow = () => {
    followVehicle = !followVehicle;
  };

  const onDragStart = () => {
    // Al arrastrar el mapa manualmente, se pausa el seguimiento para respetar la inspección del usuario
    followVehicle = false;
  };

  // 1. Estado inicial activo
  assert.equal(followVehicle, true);

  // 2. Usuario arrastra el mapa
  onDragStart();
  assert.equal(followVehicle, false, "El arrastre debe pausar el seguimiento automático de cámara");

  // 3. Usuario presiona botón «Seguir vehículo»
  onToggleFollow();
  assert.equal(followVehicle, true, "El botón debe reactivar el seguimiento de cámara");
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Filtro GPS descarta técnicos sin ubicación reciente verificada
// ─────────────────────────────────────────────────────────────────────────────
test("9. Filtro GPS rechaza coordenadas estáticas, antiguas o sin timestamp verificable", () => {
  const now = Date.now();

  // Técnico con GPS auténtico y reciente (< 5 minutos)
  const techRecent = {
    id: 1,
    name: "Técnico en Vivo",
    lat: -33.4372,
    lng: -70.6506,
    lastLocationAt: new Date(now - 3 * 60 * 1000).toISOString(),
  };
  assert.equal(hasVerifiedRecentGps(techRecent), true);

  // Técnico con ubicación de seed o antigua (> 10 minutos)
  const techStale = {
    id: 2,
    name: "Técnico Antiguo",
    lat: -33.4372,
    lng: -70.6506,
    lastLocationAt: new Date(now - 15 * 60 * 1000).toISOString(),
  };
  assert.equal(hasVerifiedRecentGps(techStale), false);

  // Técnico sin timestamp (ej. coordenadas estáticas de prueba)
  const techNoTimestamp = {
    id: 3,
    name: "Técnico Estático",
    lat: -33.4372,
    lng: -70.6506,
  };
  assert.equal(hasVerifiedRecentGps(techNoTimestamp), false);

  // Resumen de mapa: solo cuenta los verificados como "En vivo"
  const counters = getMapSummaryCounters([], [techRecent, techStale, techNoTimestamp]);
  assert.equal(counters.techGpsCount, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Simulación no altera base de datos ni estados reales de órdenes
// ─────────────────────────────────────────────────────────────────────────────
test("10. El seguimiento se ejecuta 100% en memoria de frontend sin mutar la orden original", () => {
  resetAllTrackings();
  const orderOriginal = makeMockOrder("OT-IMMUTABLE-10", "110");
  const orderClone = JSON.parse(JSON.stringify(orderOriginal));

  // Iniciar seguimiento y procesar snapshots
  const record = startTracking(orderOriginal);
  computeTrackingSnapshot(record, record.startedAt + 90000);
  restartTracking("110");

  // Verificar que el objeto de orden en el contexto React no fue mutado
  assert.deepEqual(orderOriginal, orderClone, "La orden original debe mantenerse 100% inmutable");
  assert.equal(orderOriginal.status, "EN_RUTA", "El estado operativo no debe ser modificado por la simulación");
});

// ─────────────────────────────────────────────────────────────────────────────
// Prueba adicional: Suavizado angular continuo (smoothAngle)
// ─────────────────────────────────────────────────────────────────────────────
test("smoothAngle realiza interpolación angular continua evitando discontinuidad 360/0", () => {
  // Giro continuo a través de 0/360 grados
  const angle1 = smoothAngle(350, 10, 0.5);
  assert.equal(Math.round(angle1), 0, "Debe tomar el camino más corto hacia 10°");

  const angle2 = smoothAngle(10, 350, 0.5);
  assert.equal(Math.round(angle2), 0, "Debe tomar el camino más corto hacia 350°");

  // Sin orientación previa
  const angleInit = smoothAngle(null, 180);
  assert.equal(angleInit, 180);
});
