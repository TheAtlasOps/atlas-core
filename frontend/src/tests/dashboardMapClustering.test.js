import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  ORDER_STATUS_COLORS,
  AVAILABLE_STATUS_FILTERS,
  isValidCoordinate,
  extractOrderCoordinates,
  getMarkerHexByStatus,
  normalizeOrderForMap,
  groupOrdersIntoClusters,
  getMapSummaryCounters,
  getSignalFreshness,
} from "../lib/mapClustering.js";


// ─── 1. Cuatro órdenes completadas con coordenadas válidas ───────────────────

test("1. Cuatro órdenes completadas con coordenadas válidas se geolocalizan en 2 clusters geográficos", () => {
  const mockOrders = [
    {
      id: "ord-1",
      order_number: "#OT-08491",
      title: "Instalación Enlace Fibra Óptica - Prueba ATLAS 01",
      client: { business_name: "Cliente Providencia", lat: -33.4372, lng: -70.6506 },
      status: "COMPLETADA",
      lat: -33.4372,
      lng: -70.6506,
    },
    {
      id: "ord-2",
      order_number: "#OT-08492",
      title: "Instalación Router - Prueba ATLAS 02",
      client: { business_name: "Cliente Las Condes", lat: -33.4125, lng: -70.5843 },
      status: "COMPLETADA",
      lat: -33.4125,
      lng: -70.5843,
    },
    {
      id: "ord-3",
      order_number: "#OT-08493",
      title: "Prueba GPS Android 1.0.2",
      client: { business_name: "Cliente Providencia", lat: -33.4372, lng: -70.6506 },
      status: "COMPLETADA",
      lat: -33.4372,
      lng: -70.6506,
    },
    {
      id: "ord-4",
      order_number: "#OT-08494",
      title: "Prueba GPS Android 1.0.3",
      client: { business_name: "Cliente Providencia", lat: -33.4372, lng: -70.6506 },
      status: "COMPLETADA",
      lat: -33.4372,
      lng: -70.6506,
    },
  ];

  const result = groupOrdersIntoClusters(mockOrders, "TODAS");

  assert.equal(result.geocodedOrders.length, 4, "Las 4 órdenes deben ser geocodificadas");
  assert.equal(result.unlocatedOrders.length, 0, "No debe haber órdenes sin ubicación");
  assert.equal(result.clusters.length, 2, "Deben formarse exactamente 2 clusters geográficos");

  const providenciaCluster = result.clusters.find((c) => c.count === 3);
  const lasCondesCluster = result.clusters.find((c) => c.count === 1);

  assert.ok(providenciaCluster, "Debe existir un cluster con 3 órdenes en Providencia");
  assert.ok(lasCondesCluster, "Debe existir un cluster unitario con 1 orden en Las Condes");
  assert.equal(providenciaCluster.isCluster, true);
  assert.equal(lasCondesCluster.isCluster, false);

  const counters = getMapSummaryCounters(mockOrders, [], "TODAS");
  assert.equal(counters.geocodedCount, 4);
  assert.equal(counters.unlocatedCount, 0);
  assert.equal(counters.summaryText, "4 órdenes geolocalizadas · 0 técnicos con GPS activo");
  assert.equal(counters.unlocatedText, null);
});

// ─── 2. Tres órdenes compartiendo una ubicación (Providencia) ────────────────

test("2. Tres órdenes compartiendo la misma ubicación se agrupan en un único marcador con lista interna", () => {
  const mockProvidenciaOrders = [
    {
      id: "ord-1",
      order_number: "#OT-08491",
      title: "Instalación Enlace Fibra Óptica",
      client: { business_name: "Entel Providencia" },
      status: "COMPLETADA",
      lat: -33.4372,
      lng: -70.6506,
    },
    {
      id: "ord-3",
      order_number: "#OT-08493",
      title: "Prueba GPS Android 1.0.2",
      client: { business_name: "Entel Providencia" },
      status: "COMPLETADA",
      lat: -33.4372,
      lng: -70.6506,
    },
    {
      id: "ord-4",
      order_number: "#OT-08494",
      title: "Prueba GPS Android 1.0.3",
      client: { business_name: "Entel Providencia" },
      status: "COMPLETADA",
      lat: -33.4372,
      lng: -70.6506,
    },
  ];

  const { clusters } = groupOrdersIntoClusters(mockProvidenciaOrders);
  assert.equal(clusters.length, 1, "Debe colapsar en un solo marcador cluster");
  assert.equal(clusters[0].count, 3, "El cluster debe contener 3 órdenes");
  assert.equal(clusters[0].isCluster, true);

  const clusterOrderNumbers = clusters[0].orders.map((o) => o.orderNumber);
  assert.deepEqual(
    clusterOrderNumbers,
    ["#OT-08491", "#OT-08493", "#OT-08494"],
    "Debe contener exactamente las 3 órdenes con sus identificadores"
  );
});

// ─── 3. Una orden en ubicación diferente (Las Condes) ────────────────────────

test("3. Una orden con ubicación diferente se representa como marcador independiente", () => {
  const mockOrders = [
    {
      id: "ord-1",
      order_number: "#OT-08491",
      title: "OT Providencia",
      lat: -33.4372,
      lng: -70.6506,
      status: "COMPLETADA",
    },
    {
      id: "ord-2",
      order_number: "#OT-08492",
      title: "OT Las Condes",
      lat: -33.4125,
      lng: -70.5843,
      status: "COMPLETADA",
    },
  ];

  const { clusters } = groupOrdersIntoClusters(mockOrders);
  assert.equal(clusters.length, 2, "Deben generarse 2 marcadores independientes");
  assert.equal(clusters[0].count, 1);
  assert.equal(clusters[1].count, 1);
  assert.equal(clusters[0].isCluster, false);
  assert.equal(clusters[1].isCluster, false);
});

// ─── 4. Apertura individual de las cuatro órdenes ────────────────────────────

test("4. Todas las órdenes en clusters contienen datos completos para apertura individual en Drawer", () => {
  const mockOrders = [
    {
      id: "uuid-1",
      order_number: "#OT-08491",
      title: "Fibra Óptica",
      client: { business_name: "Cliente A" },
      status: "COMPLETADA",
      lat: -33.4372,
      lng: -70.6506,
    },
    {
      id: "uuid-2",
      order_number: "#OT-08492",
      title: "Router 5G",
      client: { business_name: "Cliente B" },
      status: "COMPLETADA",
      lat: -33.4125,
      lng: -70.5843,
    },
  ];

  const { clusters } = groupOrdersIntoClusters(mockOrders);

  for (const c of clusters) {
    for (const o of c.orders) {
      assert.ok(o.orderNumber.startsWith("#OT-"), "Debe tener identificador de OT legible");
      assert.ok(o.client, "Debe tener nombre de cliente");
      assert.ok(o.title, "Debe tener título de servicio");
      assert.ok(o.status, "Debe tener estado asignado");
      assert.ok(o.lat !== null && o.lng !== null, "Debe tener coordenadas válidas");
    }
  }
});

// ─── 5. Diagnóstico de Neon DEV: 3 órdenes en Providencia + 1 sin coordenadas ──

test("5. Diagnóstico exacto Neon DEV: 3 órdenes con coordenadas + 1 orden (#OT-08492) sin ubicación", () => {
  // Escenario real verificado en Neon DEV:
  const neonOrders = [
    {
      id: "ord-1",
      order_number: "#OT-08491",
      title: "Instalación Enlace Fibra Óptica - Prueba ATLAS 01",
      client: { business_name: "Entel Corporativo", lat: null, lng: null },
      lat: -33.4372,
      lng: -70.6506,
      status: "COMPLETADA",
    },
    {
      id: "ord-2",
      order_number: "#OT-08492",
      title: "Instalación Router - Prueba ATLAS 02",
      client: { business_name: "Empresa Las Condes", lat: null, lng: null },
      lat: null, // Sin coordenadas en orden
      lng: null, // Sin coordenadas en cliente
      status: "COMPLETADA",
    },
    {
      id: "ord-3",
      order_number: "#OT-08493",
      title: "Prueba GPS Android 1.0.2",
      client: { business_name: "Entel Corporativo", lat: null, lng: null },
      lat: -33.4372,
      lng: -70.6506,
      status: "COMPLETADA",
    },
    {
      id: "ord-4",
      order_number: "#OT-08494",
      title: "Prueba GPS Android 1.0.3",
      client: { business_name: "Entel Corporativo", lat: null, lng: null },
      lat: -33.4372,
      lng: -70.6506,
      status: "COMPLETADA",
    },
  ];

  const result = groupOrdersIntoClusters(neonOrders);

  // Explicación de por qué antes solo aparecían 3:
  assert.equal(result.geocodedOrders.length, 3, "Solo 3 órdenes tienen coordenadas en Neon DEV");
  assert.equal(result.unlocatedOrders.length, 1, "#OT-08492 debe ser clasificada como sin ubicación");
  assert.equal(result.unlocatedOrders[0].orderNumber, "#OT-08492");

  // Y las 3 órdenes geocodificadas se agrupan en 1 cluster por compartir -33.4372, -70.6506:
  assert.equal(result.clusters.length, 1, "Las 3 órdenes de Providencia forman 1 cluster");
  assert.equal(result.clusters[0].count, 3, "El cluster contiene las 3 órdenes de Providencia");

  const counters = getMapSummaryCounters(neonOrders, [], "TODAS");
  assert.equal(counters.geocodedCount, 3);
  assert.equal(counters.unlocatedCount, 1);
  assert.equal(counters.summaryText, "3 órdenes geolocalizadas · 0 técnicos con GPS activo");
  assert.equal(counters.unlocatedText, "1 orden sin ubicación");
});

// ─── 6. Colores diferenciados por estado ──────────────────────────────────────

test("6. getMarkerHexByStatus asigna colores precisos por estado, con EN_SITIO diferenciado de EN_RUTA", () => {
  assert.equal(getMarkerHexByStatus("CONFIRMADA"), ORDER_STATUS_COLORS.CONFIRMADA, "CONFIRMADA debe ser azul");
  assert.equal(getMarkerHexByStatus("EN_RUTA"), ORDER_STATUS_COLORS.EN_RUTA, "EN_RUTA debe ser naranja");
  assert.equal(getMarkerHexByStatus("EN_SITIO"), ORDER_STATUS_COLORS.EN_SITIO, "EN_SITIO debe ser violeta/púrpura");
  assert.equal(getMarkerHexByStatus("COMPLETADA"), ORDER_STATUS_COLORS.COMPLETADA, "COMPLETADA debe ser verde");
  assert.equal(getMarkerHexByStatus("CANCELADA"), ORDER_STATUS_COLORS.CANCELADA, "CANCELADA debe ser rojo/rosado");

  // Comprobar que EN_SITIO y EN_RUTA no tienen el mismo color
  assert.notEqual(
    getMarkerHexByStatus("EN_SITIO"),
    getMarkerHexByStatus("EN_RUTA"),
    "EN_SITIO debe tener color visualmente diferenciado de EN_RUTA"
  );
});

// ─── 7. Aplicación de filtros por estado ─────────────────────────────────────

test("7. Los filtros por estado actualizan dinámicamente los clusters y contadores", () => {
  const mixedOrders = [
    { id: "1", order_number: "OT-1", status: "CONFIRMADA", lat: -33.4372, lng: -70.6506 },
    { id: "2", order_number: "OT-2", status: "EN_RUTA", lat: -33.4372, lng: -70.6506 },
    { id: "3", order_number: "OT-3", status: "EN_SITIO", lat: -33.4125, lng: -70.5843 },
    { id: "4", order_number: "OT-4", status: "COMPLETADA", lat: -33.4500, lng: -70.6600 },
    { id: "5", order_number: "OT-5", status: "CANCELADA", lat: -33.4500, lng: -70.6600 },
    { id: "6", order_number: "OT-6", status: "COMPLETADA", lat: null, lng: null }, // sin ubicación
  ];

  // Filtro TODAS
  const allResult = groupOrdersIntoClusters(mixedOrders, "TODAS");
  assert.equal(allResult.geocodedOrders.length, 5);
  assert.equal(allResult.unlocatedOrders.length, 1);

  // Filtro COMPLETADA
  const compResult = groupOrdersIntoClusters(mixedOrders, "COMPLETADA");
  assert.equal(compResult.geocodedOrders.length, 1);
  assert.equal(compResult.unlocatedOrders.length, 1);
  assert.equal(compResult.clusters.length, 1);
  assert.equal(compResult.clusters[0].orders[0].orderNumber, "OT-4");

  // Filtro EN_SITIO
  const sitioResult = groupOrdersIntoClusters(mixedOrders, "EN_SITIO");
  assert.equal(sitioResult.geocodedOrders.length, 1);
  assert.equal(sitioResult.unlocatedOrders.length, 0);
  assert.equal(sitioResult.clusters[0].orders[0].orderNumber, "OT-3");

  // Filtro CANCELADA
  const cancResult = groupOrdersIntoClusters(mixedOrders, "CANCELADA");
  assert.equal(cancResult.geocodedOrders.length, 1);
  assert.equal(cancResult.unlocatedOrders.length, 0);
});

// ─── 8. Conteo de órdenes visibles vs número de marcadores ───────────────────

test("8. El contador de encabezado refleja órdenes individuales y no se confunde con número de clusters", () => {
  // 3 órdenes en el mismo punto = 1 cluster
  const orders = [
    { id: "1", order_number: "OT-1", status: "COMPLETADA", lat: -33.4372, lng: -70.6506 },
    { id: "2", order_number: "OT-2", status: "COMPLETADA", lat: -33.4372, lng: -70.6506 },
    { id: "3", order_number: "OT-3", status: "COMPLETADA", lat: -33.4372, lng: -70.6506 },
  ];

  const counters = getMapSummaryCounters(orders, []);
  assert.equal(counters.geocodedCount, 3, "Debe reportar 3 órdenes geolocalizadas, no 1 cluster");
  assert.equal(counters.summaryText, "3 órdenes geolocalizadas · 0 técnicos con GPS activo");
});

// ─── 9. Incorporación automática de órdenes futuras ─────────────────────────

test("9. La incorporación de nuevas órdenes al array agrupa o crea nuevos marcadores automáticamente", () => {
  const currentOrders = [
    { id: "1", order_number: "OT-1", status: "COMPLETADA", lat: -33.4372, lng: -70.6506 },
    { id: "2", order_number: "OT-2", status: "COMPLETADA", lat: -33.4372, lng: -70.6506 },
  ];

  const step1 = groupOrdersIntoClusters(currentOrders);
  assert.equal(step1.clusters.length, 1);
  assert.equal(step1.clusters[0].count, 2);

  // Llega una 3ra orden futura compartiendo Providencia
  const withThird = [
    ...currentOrders,
    { id: "3", order_number: "OT-3", status: "COMPLETADA", lat: -33.4372, lng: -70.6506 },
  ];
  const step2 = groupOrdersIntoClusters(withThird);
  assert.equal(step2.clusters.length, 1);
  assert.equal(step2.clusters[0].count, 3, "Se incorpora al grupo existente automáticamente");

  // Llega una 4ta orden futura en otra comuna
  const withFourth = [
    ...withThird,
    { id: "4", order_number: "OT-4", status: "EN_RUTA", lat: -33.5000, lng: -70.7000 },
  ];
  const step3 = groupOrdersIntoClusters(withFourth);
  assert.equal(step3.clusters.length, 2, "Crea un nuevo marcador independiente automáticamente");
});

// ─── 10. Representación de técnicos con GPS vigente ──────────────────────────

test("10. getSignalFreshness clasifica señales de técnicos en vivo, señal reciente o sin señal", () => {
  const now = Date.now();

  // En vivo (< 5 min)
  const fresh = getSignalFreshness(new Date(now - 2 * 60 * 1000).toISOString());
  assert.equal(fresh.isRecent, true);
  assert.equal(fresh.isStale, false);
  assert.ok(fresh.label.includes("En vivo"));

  // Hace 15 min (> 5 min y < 30 min)
  const stale = getSignalFreshness(new Date(now - 15 * 60 * 1000).toISOString());
  assert.equal(stale.isRecent, false);
  assert.equal(stale.isStale, true);
  assert.ok(stale.label.includes("Señal hace 15 min"));

  // Hace 2 horas (> 30 min)
  const old = getSignalFreshness(new Date(now - 120 * 60 * 1000).toISOString());
  assert.equal(old.isRecent, false);
  assert.equal(old.isStale, false);
  assert.ok(old.label.includes("Sin señal reciente"));

  // Sin fecha
  const none = getSignalFreshness(null);
  assert.equal(none.isRecent, false);
  assert.equal(none.isStale, false);
  assert.equal(none.label, "Sin señal registrada");
});

// ─── 11. Validación de coordenadas límites ───────────────────────────────────

test("11. isValidCoordinate valida rangos geográficos válidos [-90, 90] y [-180, 180]", () => {
  assert.equal(isValidCoordinate(-33.4372, -70.6506), true);
  assert.equal(isValidCoordinate(0, 0), true);
  assert.equal(isValidCoordinate(90, 180), true);
  assert.equal(isValidCoordinate(-90, -180), true);

  assert.equal(isValidCoordinate(91, 0), false);
  assert.equal(isValidCoordinate(-91, 0), false);
  assert.equal(isValidCoordinate(0, 181), false);
  assert.equal(isValidCoordinate(null, -70.6506), false);
  assert.equal(isValidCoordinate(undefined, undefined), false);
  assert.equal(isValidCoordinate("NaN", "NaN"), false);
});

// ─── 12. Fallback de coordenadas al cliente ──────────────────────────────────

test("12. extractOrderCoordinates hereda coordenadas del cliente cuando la orden no las define", () => {
  const orderWithClientCoords = {
    id: "ord-test",
    lat: null,
    lng: null,
    client: {
      lat: -33.4125,
      lng: -70.5843,
    },
  };

  const coords = extractOrderCoordinates(orderWithClientCoords);
  assert.equal(coords.isValid, true);
  assert.equal(coords.lat, -33.4125);
  assert.equal(coords.lng, -70.5843);
});

// ─── 13. Normalización de orden para el mapa ─────────────────────────────────

test("13. normalizeOrderForMap normaliza identificadores, títulos y estados con validación de coordenadas", () => {
  const normalized = normalizeOrderForMap({
    id: "uuid-1",
    order_number: "#OT-08491",
    title: "Prueba Fibra",
    status: "completada",
    lat: -33.4372,
    lng: -70.6506,
  });
  assert.equal(normalized.orderNumber, "#OT-08491");
  assert.equal(normalized.status, "COMPLETADA");
  assert.equal(normalized.hasValidLocation, true);
});

// ─── 14. Verificación de estructura de datos para renderizado de ActiveZonesCard ─

test("14. ActiveZonesCard y getMapSummaryCounters generan los datos requeridos para el encabezado y leyenda", () => {
  const mockOrders = [
    {
      id: "ord-1",
      order_number: "#OT-08491",
      title: "Instalación Fibra",
      client: { business_name: "Cliente Providencia" },
      status: "COMPLETADA",
      lat: -33.4372,
      lng: -70.6506,
    },
    {
      id: "ord-2",
      order_number: "#OT-08492",
      title: "Instalación Router",
      client: { business_name: "Cliente Sin Coords" },
      status: "COMPLETADA",
      lat: null,
      lng: null,
    },
  ];

  const counters = getMapSummaryCounters(mockOrders, [], "TODAS");
  assert.equal(counters.geocodedCount, 1);
  assert.equal(counters.unlocatedCount, 1);
  assert.equal(counters.summaryText, "1 orden geolocalizada · 0 técnicos con GPS activo");
  assert.equal(counters.unlocatedText, "1 orden sin ubicación");
  assert.equal(counters.unlocatedOrders.length, 1);
  assert.equal(counters.unlocatedOrders[0].orderNumber, "#OT-08492");

  // Filtros disponibles
  assert.equal(AVAILABLE_STATUS_FILTERS.length, 6);
  const filterIds = AVAILABLE_STATUS_FILTERS.map((f) => f.id);
  assert.deepEqual(filterIds, ["TODAS", "CONFIRMADA", "EN_RUTA", "EN_SITIO", "COMPLETADA", "CANCELADA"]);
});
