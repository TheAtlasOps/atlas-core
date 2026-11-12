import test from "node:test";
import assert from "node:assert/strict";

import {
  SIMULATION_DURATION_SECONDS,
  SIMULATION_DURATION_MS,
  getSafeClientName,
  getSafeAddress,
  getSafeOrderNumber,
  getSafeOrderId,
  isEnRutaStatus,
  formatCountdown,
  startTracking,
  stopTracking,
  getTracking,
  hasActiveTracking,
  computeTrackingSnapshot,
  syncOrdersWithTracking,
  resetAllTrackings,
} from "../lib/routeTrackingManager.js";
import { DEMO_ORIGIN, FALLBACK_DEMO_COORDINATES } from "../lib/routeSimulation.js";

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
