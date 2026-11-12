import test from "node:test";
import assert from "node:assert/strict";

import {
  SIMULATION_DURATION_SECONDS,
  SIMULATION_DURATION_MS,
  getSafeClientName,
  getSafeAddress,
  getSafeOrderNumber,
  getSafeOrderId,
  getSafeTechnicianName,
  isEnRutaStatus,
  formatCountdown,
  startTracking,
  restartTracking,
  stopTracking,
  getTracking,
  hasActiveTracking,
  computeTrackingSnapshot,
  syncOrdersWithTracking,
  resetAllTrackings,
  setOnTrackingCompleted,
} from "../lib/routeTrackingManager.js";
import { DEMO_ORIGIN, FALLBACK_DEMO_COORDINATES } from "../lib/routeSimulation.js";
import { hasVerifiedRecentGps } from "../lib/mapClustering.js";

test("getSafeClientName previene Minified React Error #31 extrayendo siempre un string", () => {
  // Caso objeto complejo (FastAPI / Neon real)
  const orderWithClientObj = {
    client: { id: 101, business_name: "Entel Empresas S.A.", rut: "96.806.000-4" },
  };
  assert.equal(typeof getSafeClientName(orderWithClientObj), "string");
  assert.equal(getSafeClientName(orderWithClientObj), "Entel Empresas S.A.");

  // Caso cliente con nombre alternativo
  const orderWithName = {
    client: { name: "Bodega Pudahuel" },
  };
  assert.equal(getSafeClientName(orderWithName), "Bodega Pudahuel");

  // Caso string simple
  const orderWithString = { client: "Cliente Residencial" };
  assert.equal(getSafeClientName(orderWithString), "Cliente Residencial");

  // Caso nulo o indefinido
  assert.equal(getSafeClientName(null), "Cliente Corporativo");
  assert.equal(getSafeClientName({}), "Cliente Corporativo");
  assert.equal(getSafeClientName({ client: {} }), "Cliente Corporativo");
});

test("getSafeAddress previene objetos como hijos devolviendo un string sanitizado", () => {
  assert.equal(SIMULATION_DURATION_SECONDS, 180);

  const order = {
    id: 42,
    order_number: "OT-4242",
    address_override: "Av. Libertador Bernardo O'Higgins 1234, Santiago",
  };
  assert.equal(typeof getSafeAddress(order), "string");
  assert.equal(getSafeAddress(order), "Av. Libertador Bernardo O'Higgins 1234, Santiago");
  assert.equal(getSafeOrderNumber(order), "OT-4242");
  assert.equal(getSafeOrderId(order), "42");

  const orderClientAddr = {
    client: { address: "Calle Los Conquistadores 1900, Providencia" },
  };
  assert.equal(getSafeAddress(orderClientAddr), "Calle Los Conquistadores 1900, Providencia");

  assert.equal(getSafeAddress(null), "Dirección sin especificar");
  assert.equal(getSafeAddress({}), "Dirección sin especificar");
  assert.equal(getSafeOrderNumber(null), "OT-???");
  assert.equal(getSafeOrderId(null), null);
});

test("isEnRutaStatus identifica con precisión órdenes en tránsito y rechaza otros estados", () => {
  assert.equal(isEnRutaStatus("EN_RUTA"), true);
  assert.equal(isEnRutaStatus("en_ruta"), true);
  assert.equal(isEnRutaStatus("En ruta"), true);
  assert.equal(isEnRutaStatus("EN_CAMINO"), true);
  assert.equal(isEnRutaStatus("EN_TRANSITO"), true);

  // Estados no activos en tránsito
  assert.equal(isEnRutaStatus("CONFIRMADA"), false);
  assert.equal(isEnRutaStatus("COMPLETADA"), false);
  assert.equal(isEnRutaStatus("EN_SITIO"), false);
  assert.equal(isEnRutaStatus("CANCELADA"), false);
  assert.equal(isEnRutaStatus("IDLE"), false);
  assert.equal(isEnRutaStatus(null), false);
  assert.equal(isEnRutaStatus(undefined), false);
});

test("formatCountdown formatea minutos y segundos en cuenta regresiva", () => {
  assert.equal(formatCountdown(180), "3:00 min");
  assert.equal(formatCountdown(125), "2:05 min");
  assert.equal(formatCountdown(45), "0:45 min");
  assert.equal(formatCountdown(9), "0:09 min");
  assert.equal(formatCountdown(0), "0:00 min");
  assert.equal(formatCountdown(-5), "0:00 min");
  assert.equal(formatCountdown(null), "0:00 min");
});

test("computeTrackingSnapshot calcula telemetría determinista a lo largo de 180 segundos", () => {
  const startedAt = 1000000;
  const mockRecord = {
    orderId: "OT-TEST-1",
    orderNumber: "OT-TEST-1",
    clientName: "Cliente Test",
    address: "Santiago",
    origin: DEMO_ORIGIN,
    destination: { lat: -33.4535, lng: -70.6605 },
    startedAt,
    durationMs: SIMULATION_DURATION_MS,
    routeData: {
      coordinates: FALLBACK_DEMO_COORDINATES,
      interpolatedCoordinates: FALLBACK_DEMO_COORDINATES,
      distanceMeters: 4650,
      durationSeconds: 780,
    },
    isLoadingRoute: false,
    routeError: null,
  };

  // 1. Al inicio exacto (t = 0s)
  const snap0 = computeTrackingSnapshot(mockRecord, startedAt);
  assert.equal(snap0.progress, 0);
  assert.equal(snap0.progressPercent, 0);
  assert.equal(snap0.remainingSeconds, 180);
  assert.equal(snap0.isArrived, false);
  assert.equal(snap0.currentIndex, 0);
  assert.deepEqual(snap0.currentCoord, FALLBACK_DEMO_COORDINATES[0]);

  // 2. A los 45 segundos (25% del ciclo de 3 minutos)
  const snap45 = computeTrackingSnapshot(mockRecord, startedAt + 45000);
  assert.equal(snap45.progress, 0.25);
  assert.equal(snap45.progressPercent, 25);
  assert.equal(snap45.remainingSeconds, 135);
  assert.equal(snap45.isArrived, false);
  assert.ok(snap45.currentIndex > 0);

  // 3. A los 90 segundos (50% del ciclo de 3 minutos)
  const snap90 = computeTrackingSnapshot(mockRecord, startedAt + 90000);
  assert.equal(snap90.progress, 0.5);
  assert.equal(snap90.progressPercent, 50);
  assert.equal(snap90.remainingSeconds, 90);
  assert.equal(snap90.isArrived, false);

  // 4. A los 180 segundos (100% - Llegada al sitio)
  const snap180 = computeTrackingSnapshot(mockRecord, startedAt + 180000);
  assert.equal(snap180.progress, 1.0);
  assert.equal(snap180.progressPercent, 100);
  assert.equal(snap180.remainingSeconds, 0);
  assert.equal(snap180.isArrived, true);
  assert.equal(snap180.currentIndex, FALLBACK_DEMO_COORDINATES.length - 1);
  assert.deepEqual(
    snap180.currentCoord,
    FALLBACK_DEMO_COORDINATES[FALLBACK_DEMO_COORDINATES.length - 1]
  );

  // 5. Tras 240 segundos (tiempo posterior a 180s no rompe ni excede el 100%)
  const snapOver = computeTrackingSnapshot(mockRecord, startedAt + 240000);
  assert.equal(snapOver.progress, 1.0);
  assert.equal(snapOver.progressPercent, 100);
  assert.equal(snapOver.remainingSeconds, 0);
  assert.equal(snapOver.isArrived, true);
});

test("Continuidad de sesión: startTracking conserva el timestamp startedAt original", () => {
  resetAllTrackings();

  const order = {
    id: "OT-CONTINUITY",
    order_number: "OT-CONTINUITY",
    status: "EN_RUTA",
    lat: -33.4535,
    lng: -70.6605,
    client: { business_name: "Cliente Santiago" },
  };

  const rec1 = startTracking(order);
  assert.ok(rec1);
  const initialStartedAt = rec1.startedAt;

  // Si el modal se cierra y se vuelve a solicitar seguimiento más tarde
  const rec2 = startTracking(order);
  assert.equal(rec2.startedAt, initialStartedAt, "Debe preservar el startedAt original");
});

test("syncOrdersWithTracking inicia seguimiento en EN_RUTA y lo detiene al cambiar de estado", () => {
  resetAllTrackings();

  const orders = [
    {
      id: "OT-A",
      order_number: "OT-A",
      status: "EN_RUTA",
      lat: -33.4350,
      lng: -70.6400,
      client: { business_name: "Cliente A" },
    },
    {
      id: "OT-B",
      order_number: "OT-B",
      status: "CONFIRMADA", // No está en ruta
      lat: -33.4400,
      lng: -70.6500,
      client: { business_name: "Cliente B" },
    },
    {
      id: "OT-C",
      order_number: "OT-C",
      status: "EN_RUTA",
      lat: null, // Sin coordenadas válidas
      lng: null,
      client: { business_name: "Cliente C" },
    },
  ];

  syncOrdersWithTracking(orders, { isInitial: true });

  // OT-A debe estar en seguimiento
  assert.equal(hasActiveTracking("OT-A"), true);
  assert.equal(getTracking("OT-A")?.orderId, "OT-A");
  // OT-B no debe estar en seguimiento (no está EN_RUTA)
  assert.equal(hasActiveTracking("OT-B"), false);
  assert.equal(getTracking("OT-B"), null);
  // OT-C no debe estar en seguimiento (sin coordenadas válidas)
  assert.equal(hasActiveTracking("OT-C"), false);

  // Parada manual explícita
  stopTracking("OT-A");
  assert.equal(hasActiveTracking("OT-A"), false);
  // Re-iniciar OT-A para probar transición en updatedOrders
  syncOrdersWithTracking(orders, { isInitial: false });
  assert.equal(hasActiveTracking("OT-A"), true);

  // Cuando OT-A cambia a COMPLETADA en el backend/tablero
  const updatedOrders = [
    {
      id: "OT-A",
      order_number: "OT-A",
      status: "COMPLETADA",
      lat: -33.4350,
      lng: -70.6400,
      client: { business_name: "Cliente A" },
    },
  ];

  syncOrdersWithTracking(updatedOrders);
  // El seguimiento de OT-A debe haberse detenido automáticamente
  assert.equal(hasActiveTracking("OT-A"), false);
});

test("getSafeTechnicianName extrae el nombre del técnico de diversas estructuras y previene fallos de React", () => {
  // Caso 1: objeto anidado assigned_technician con user
  const orderWithNestedTech = {
    assigned_technician: {
      user: { first_name: "Tomás", last_name: "Pérez" },
    },
  };
  assert.equal(getSafeTechnicianName(orderWithNestedTech), "Tomás Pérez");

  // Caso 2: technician_summary
  const orderWithSummary = {
    technician_summary: { full_name: "Carlos Muñoz" },
  };
  assert.equal(getSafeTechnicianName(orderWithSummary), "Carlos Muñoz");

  // Caso 3: string directo
  const orderWithStringTech = { technician: "Rodrigo Silva" };
  assert.equal(getSafeTechnicianName(orderWithStringTech), "Rodrigo Silva");

  // Caso 4: nulo o sin técnico
  assert.equal(getSafeTechnicianName(null), "Especialista en terreno");
  assert.equal(getSafeTechnicianName({}), "Especialista en terreno");
});

test("restartTracking reinicia el timestamp startedAt y el ciclo de 180s sin alterar la BD", () => {
  resetAllTrackings();

  const order = {
    id: "OT-RESTART-TEST",
    order_number: "OT-RESTART-TEST",
    status: "EN_RUTA",
    lat: -33.4535,
    lng: -70.6605,
    client: { business_name: "Cliente Test" },
  };

  const initialRecord = startTracking(order);
  const oldStartedAt = initialRecord.startedAt - 200000; // Simular que inició hace tiempo y finalizó
  initialRecord.startedAt = oldStartedAt;
  initialRecord.hasNotifiedCompletion = true;

  const snapBefore = computeTrackingSnapshot(initialRecord, Date.now());
  assert.equal(snapBefore.isArrived, true);
  assert.equal(snapBefore.progressPercent, 100);

  // Reiniciar la simulación (botón 'Repetir demo')
  const restartedRecord = restartTracking("OT-RESTART-TEST");
  assert.ok(restartedRecord);
  assert.ok(restartedRecord.startedAt > oldStartedAt);
  assert.equal(restartedRecord.hasNotifiedCompletion, false);

  const snapAfter = computeTrackingSnapshot(restartedRecord, restartedRecord.startedAt + 1000);
  assert.equal(snapAfter.isArrived, false);
  assert.ok(snapAfter.progressPercent < 5);
});

test("setOnTrackingCompleted dispara el callback una sola vez al cumplirse los 180 segundos", () => {
  let completedCount = 0;
  let lastCompletedOrderId = null;

  setOnTrackingCompleted((record) => {
    completedCount += 1;
    lastCompletedOrderId = record.orderId;
  });

  const record = {
    orderId: "OT-CALLBACK-TEST",
    orderNumber: "OT-CALLBACK-TEST",
    clientName: "Cliente Callback",
    address: "Santiago",
    origin: DEMO_ORIGIN,
    destination: { lat: -33.4535, lng: -70.6605 },
    startedAt: 1000000,
    durationMs: SIMULATION_DURATION_MS,
    hasNotifiedCompletion: false,
    routeData: {
      coordinates: FALLBACK_DEMO_COORDINATES,
      interpolatedCoordinates: FALLBACK_DEMO_COORDINATES,
      distanceMeters: 4650,
      durationSeconds: 780,
    },
    isLoadingRoute: false,
    routeError: null,
  };

  // 1. A los 90s: no debe dispararse
  computeTrackingSnapshot(record, 1000000 + 90000);
  assert.equal(completedCount, 0);

  // 2. A los 180s exactos: debe dispararse una vez
  computeTrackingSnapshot(record, 1000000 + 180000);
  assert.equal(completedCount, 1);
  assert.equal(lastCompletedOrderId, "OT-CALLBACK-TEST");

  // 3. Próximos ticks tras los 180s: NO debe volver a dispararse
  computeTrackingSnapshot(record, 1000000 + 185000);
  computeTrackingSnapshot(record, 1000000 + 190000);
  assert.equal(completedCount, 1);

  // Limpiar callback
  setOnTrackingCompleted(null);
});

test("hasVerifiedRecentGps solo acepta coordenadas con timestamp reciente (<10m) y descarta seed o datos obsoletos", () => {
  // Caso 1: Técnico de seed/demo con coordenadas pero sin timestamp (ej: TP)
  const seedTechWithoutTimestamp = {
    id: 1,
    name: "Tomás Pérez",
    initials: "TP",
    lat: -33.4372,
    lng: -70.6506,
    lastLocationAt: null,
  };
  assert.equal(hasVerifiedRecentGps(seedTechWithoutTimestamp), false, "Debe rechazar técnicos sin timestamp");

  // Caso 2: Coordenadas antiguas de hace varias horas o días
  const staleTech = {
    id: 2,
    name: "Técnico Antiguo",
    lat: -33.4372,
    lng: -70.6506,
    lastLocationAt: new Date(Date.now() - 3600000).toISOString(), // hace 1 hora
  };
  assert.equal(hasVerifiedRecentGps(staleTech), false, "Debe rechazar timestamps mayores a 10 minutos");

  // Caso 3: Coordenadas válidas y recientes emitidas hace 2 minutos
  const liveRecentTech = {
    id: 3,
    name: "Técnico en Vivo",
    lat: -33.4372,
    lng: -70.6506,
    lastLocationAt: new Date(Date.now() - 120000).toISOString(), // hace 2 min
  };
  assert.equal(hasVerifiedRecentGps(liveRecentTech), true, "Debe aceptar coordenadas recientes con timestamp");

  // Caso 4: Coordenadas inválidas
  const invalidCoordsTech = {
    id: 4,
    lat: "invalid",
    lng: null,
    lastLocationAt: new Date().toISOString(),
  };
  assert.equal(hasVerifiedRecentGps(invalidCoordsTech), false, "Debe rechazar coordenadas inválidas");
});
