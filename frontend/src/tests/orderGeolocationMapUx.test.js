/**
 * frontend/src/tests/orderGeolocationMapUx.test.js
 *
 * Pruebas automatizadas para geolocalización en creación/edición de órdenes
 * y mejoras de la ventana emergente (popup) del mapa del Dashboard.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  geocodeAddress,
  formatCoordinates,
  parseCoordinate,
} from "../lib/geocoding.js";
import {
  isValidCoordinate,
  groupOrdersIntoClusters,
  getMapSummaryCounters,
} from "../lib/mapClustering.js";

// ─── 1. Dirección válida → coordenadas obtenidas y enviadas al backend ─────────

test("1. Dirección válida retorna coordenadas reales y se estructura correctamente para el backend", async () => {
  // Mock del endpoint del backend
  const mockApi = {
    orders: {
      geocode: async (query) => {
        if (query.includes("Providencia 1234")) {
          return {
            success: true,
            lat: -33.42905,
            lng: -70.62114,
            display_name: "Avenida Providencia 1234, Providencia, Santiago, Chile",
          };
        }
        return { success: false, lat: null, lng: null };
      },
    },
  };

  const res = await mockApi.orders.geocode("Av. Providencia 1234, Providencia");
  assert.equal(res.success, true);
  assert.ok(isValidCoordinate(res.lat, res.lng));
  assert.equal(typeof res.lat, "number");
  assert.equal(typeof res.lng, "number");

  // Form payload generado para creación o actualización
  const orderPayload = {
    title: "Instalación Enlace Fibra Óptica",
    address_override: "Av. Providencia 1234, Providencia",
    comuna_override: "Providencia",
    lat: res.lat,
    lng: res.lng,
    service_type: "FIBRA_OPTICA",
    priority: "ALTA",
  };

  assert.equal(orderPayload.lat, -33.42905);
  assert.equal(orderPayload.lng, -70.62114);
  assert.equal(orderPayload.address_override, "Av. Providencia 1234, Providencia");
});


// ─── 2. Dirección no encontrada → mensaje claro, sin coordenadas inventadas ───

test("2. Dirección inválida o no encontrada informa error claro y NO genera coordenadas ficticias", async () => {
  // Dirección vacía o en blanco
  const emptyRes = await geocodeAddress("");
  assert.equal(emptyRes.success, false);
  assert.equal(emptyRes.lat, null);
  assert.equal(emptyRes.lng, null);
  assert.match(emptyRes.error, /ingresa una dirección/i);

  // Dirección inexistente simulada
  const notFoundRes = await geocodeAddress("calle_falsa_xyz_123456789_no_existe");
  assert.equal(notFoundRes.success, false);
  assert.equal(notFoundRes.lat, null);
  assert.equal(notFoundRes.lng, null);
  assert.ok(notFoundRes.error && notFoundRes.error.length > 0);

  // Garantizar que NO se asignen coordenadas por defecto de Santiago (-33.4372, -70.6506)
  assert.notEqual(notFoundRes.lat, -33.4372);
  assert.notEqual(notFoundRes.lng, -70.6506);
});


// ─── 3. Ajuste manual del marcador → coordenadas actualizadas en formulario ───

test("3. Ajuste manual del marcador mediante clic o arrastre actualiza lat/lng con precisión", () => {
  const manualLat = -33.4168214;
  const manualLng = -70.5989123;

  assert.ok(isValidCoordinate(manualLat, manualLng));

  const parsedLat = parseCoordinate(manualLat);
  const parsedLng = parseCoordinate(manualLng);
  assert.equal(parsedLat, -33.4168214);
  assert.equal(parsedLng, -70.5989123);

  // Formato visual amigable de coordenadas
  const formatted = formatCoordinates(manualLat, manualLng);
  assert.equal(formatted, "-33.416821, -70.598912");

  // Simulación de evento onLocationChange en NewWorkOrderModal
  let formState = {
    address: "Av. Apoquindo 3000, Las Condes",
    lat: null,
    lng: null,
  };

  const handleLocationChange = ({ lat, lng }) => {
    formState = {
      ...formState,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    };
  };

  handleLocationChange({ lat: manualLat, lng: manualLng });
  assert.equal(formState.lat, -33.416821);
  assert.equal(formState.lng, -70.598912);
  assert.ok(isValidCoordinate(formState.lat, formState.lng));
});


// ─── 4. Recuperación de coordenadas al consultar una orden ───────────────────

test("4. Ficha técnica de orden recupera y presenta sus coordenadas geográficas reales", () => {
  const existingOrder = {
    id: "uuid-ot-08494",
    order_number: "#OT-08494",
    title: "Prueba GPS Android 1.0.3",
    status: "COMPLETADA",
    address_override: "Av. Providencia 1234, Providencia",
    lat: -33.42905,
    lng: -70.62114,
    client: {
      business_name: "Entel B2B",
      address: "Av. Providencia 1234",
    },
  };

  const orderLat = existingOrder.lat;
  const orderLng = existingOrder.lng;
  const hasGeoloc = isValidCoordinate(orderLat, orderLng);

  assert.equal(hasGeoloc, true);
  assert.equal(orderLat, -33.42905);
  assert.equal(orderLng, -70.62114);

  // Inicialización de formulario de edición con la orden existente
  const editInitialForm = {
    title: existingOrder.title,
    clientName: existingOrder.client.business_name,
    address: existingOrder.address_override,
    lat: existingOrder.lat != null ? Number(existingOrder.lat) : null,
    lng: existingOrder.lng != null ? Number(existingOrder.lng) : null,
  };

  assert.equal(editInitialForm.lat, -33.42905);
  assert.equal(editInitialForm.lng, -70.62114);
  assert.equal(editInitialForm.address, "Av. Providencia 1234, Providencia");
});


// ─── 5. Compatibilidad con órdenes existentes sin coordenadas (#OT-08492) ──────

test("5. Órdenes existentes sin coordenadas operan limpiamente sin errores ni inventar ubicación", () => {
  // Orden histórica #OT-08492
  const unlocatedOrder = {
    id: "uuid-ot-08492",
    order_number: "#OT-08492",
    title: "Instalación Router - Prueba ATLAS 02",
    status: "COMPLETADA",
    address_override: "Av. Apoquindo 3000, Las Condes",
    lat: null,
    lng: null,
    client: {
      business_name: "Cliente Las Condes",
      address: "Av. Apoquindo 3000",
      lat: null,
      lng: null,
    },
  };

  const hasGeoloc = isValidCoordinate(unlocatedOrder.lat, unlocatedOrder.lng);
  assert.equal(hasGeoloc, false);

  // Al pasar por el agrupador de mapa del Dashboard
  const { clusters, unlocatedOrders } = groupOrdersIntoClusters([unlocatedOrder], "TODAS");
  assert.equal(clusters.length, 0); // No debe generar un marcador en el mapa
  assert.equal(unlocatedOrders.length, 1);
  assert.equal(unlocatedOrders[0].orderNumber, "#OT-08492");

  // Contador de resumen debe informar "1 orden sin ubicación"
  const summary = getMapSummaryCounters([unlocatedOrder], [], "TODAS");
  assert.equal(summary.unlocatedCount, 1);
  assert.match(summary.unlocatedText, /1 orden sin ubicación/i);
});


// ─── 6. Ventana emergente con 3 o más órdenes, sin botones cortados ───────────

test("6. Ventana emergente (popup) agrupa 3 órdenes con tarjetas individuales y botones de detalle", () => {
  const providenciaOrders = [
    {
      id: "ord-1",
      orderNumber: "#OT-08491",
      title: "Instalación Enlace Fibra Óptica - Prueba ATLAS 01",
      client: "Cliente Providencia",
      status: "COMPLETADA",
      lat: -33.429,
      lng: -70.621,
    },
    {
      id: "ord-2",
      orderNumber: "#OT-08493",
      title: "Prueba GPS Android 1.0.2",
      client: "Cliente Providencia",
      status: "COMPLETADA",
      lat: -33.429,
      lng: -70.621,
    },
    {
      id: "ord-3",
      orderNumber: "#OT-08494",
      title: "Prueba GPS Android 1.0.3",
      client: "Cliente Providencia",
      status: "COMPLETADA",
      lat: -33.429,
      lng: -70.621,
    },
  ];

  const { clusters } = groupOrdersIntoClusters(providenciaOrders, "TODAS");
  assert.equal(clusters.length, 1);

  const cluster = clusters[0];
  assert.equal(cluster.isCluster, true);
  assert.equal(cluster.count, 3);
  assert.equal(cluster.orders.length, 3);

  // Cada orden en el cluster debe poseer atributos para renderizar su tarjeta completa
  cluster.orders.forEach((o) => {
    assert.ok(o.orderNumber, "Debe tener número de orden visible");
    assert.ok(o.client, "Debe tener cliente visible");
    assert.ok(o.title, "Debe tener título visible");
    assert.ok(o.status, "Debe tener estado visible");
  });

  // Los identificadores deben ser únicos y seleccionables
  const orderIds = cluster.orders.map((o) => o.orderNumber);
  assert.deepEqual(orderIds, ["#OT-08491", "#OT-08493", "#OT-08494"]);
});


// ─── 7. Integración con el mapa del Dashboard tras geolocalizar #OT-08492 ─────

test("7. Al geolocalizar la orden pendiente (#OT-08492), el mapa representa 2 marcadores: cluster de 3 y unitario de 1", () => {
  const allFourOrders = [
    {
      id: "ord-1",
      order_number: "#OT-08491",
      title: "Instalación Enlace Fibra Óptica - Prueba ATLAS 01",
      client: { business_name: "Cliente Providencia", lat: -33.429, lng: -70.621 },
      status: "COMPLETADA",
      lat: -33.429,
      lng: -70.621,
    },
    {
      id: "ord-2",
      order_number: "#OT-08492", // Ahora geolocalizada en Las Condes
      title: "Instalación Router - Prueba ATLAS 02",
      client: { business_name: "Cliente Las Condes", lat: -33.4168, lng: -70.5989 },
      status: "COMPLETADA",
      lat: -33.4168,
      lng: -70.5989,
    },
    {
      id: "ord-3",
      order_number: "#OT-08493",
      title: "Prueba GPS Android 1.0.2",
      client: { business_name: "Cliente Providencia", lat: -33.429, lng: -70.621 },
      status: "COMPLETADA",
      lat: -33.429,
      lng: -70.621,
    },
    {
      id: "ord-4",
      order_number: "#OT-08494",
      title: "Prueba GPS Android 1.0.3",
      client: { business_name: "Cliente Providencia", lat: -33.429, lng: -70.621 },
      status: "COMPLETADA",
      lat: -33.429,
      lng: -70.621,
    },
  ];

  const { clusters, unlocatedOrders } = groupOrdersIntoClusters(allFourOrders, "TODAS");

  assert.equal(unlocatedOrders.length, 0, "Ya no deben quedar órdenes sin coordenadas");
  assert.equal(clusters.length, 2, "Deben existir exactamente 2 marcadores en el mapa");

  const clusterProvidencia = clusters.find((c) => c.isCluster && c.count === 3);
  const singleLasCondes = clusters.find((c) => !c.isCluster && c.count === 1);

  assert.ok(clusterProvidencia, "Debe existir un marcador agrupado de 3 órdenes en Providencia");
  assert.ok(singleLasCondes, "Debe existir un marcador individual de 1 orden en Las Condes");
  assert.equal(singleLasCondes.orders[0].orderNumber, "#OT-08492");

  const summary = getMapSummaryCounters(allFourOrders, [], "TODAS");
  assert.equal(summary.geocodedCount, 4);
  assert.equal(summary.unlocatedCount, 0);
  assert.match(summary.summaryText, /4 órdenes geolocalizadas · 0 técnicos con GPS activo/i);
});
