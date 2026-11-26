/**
 * frontend/src/tests/customerPortalTrackingV2.test.js
 *
 * Pruebas unitarias y de integración para el seguimiento V2 en el Portal Cliente (ATLAS FSM).
 * Valida:
 * 1. Reutilización del motor V2 y cálculo de snapshots de telemetría deterministas.
 * 2. Sincronización inter-pestañas (Dashboard <-> Portal Cliente) vía localStorage.
 * 3. Iconografía profesional: Camioneta ATLAS 3D isométrica, baliza estroboscópica y orientación vial.
 * 4. Polilíneas de trazado: tramo recorrido naranja corporativo (#f97316) y pendiente gris neutro.
 * 5. Desacoplamiento de cámara: auto-encuadre inicial y liberación en dragstart sin atrapar al usuario.
 * 6. Transparencia y ética de datos: separación estricta entre GPS Satelital y Modo Demostración.
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEMO_ORIGIN,
  calculateHaversineDistanceMeters,
  makeVehicleIcon,
  makeOriginIcon,
  makeDestinationIcon,
} from "../lib/routeSimulation.js";

import {
  extractSharedRouteStartedAt,
  startTracking,
  restartTracking,
  resetAllTrackings,
  computeTrackingSnapshot,
  getSafeOrderId,
} from "../lib/routeTrackingManager.js";

import { mapApiSummaryToTrackingOrder } from "../lib/magicLinksData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock básico de Leaflet para validar la generación de HTML de iconos divIcon
const mockLeaflet = {
  divIcon: (config) => ({
    ...config,
    _isLeafletIcon: true,
  }),
};

describe("ATLAS FSM — Seguimiento V2 en Portal Cliente", () => {
  beforeEach(() => {
    resetAllTrackings();
  });

  afterEach(() => {
    resetAllTrackings();
  });

  test("1. mapApiSummaryToTrackingOrder normaliza id y order_id para compatibilidad con el motor de tracking", () => {
    const apiSummary = {
      order_id: 8498,
      order_number: "OT-08498",
      service_type: "Mantenimiento Preventivo Enlace",
      status: "COMPLETADA",
      status_key: "completada",
      client_name: "BancoEstado",
      client_company: "BancoEstado Casa Matriz",
      address: "Morandé 25, Santiago Centro",
      technician_name: "Técnico Prueba ATLAS 01",
      lat: -33.4445,
      lng: -70.654,
    };

    const order = mapApiSummaryToTrackingOrder(apiSummary);
    assert.equal(order.id, 8498, "order.id debe coincidir con order_id");
    assert.equal(order.order_id, 8498, "order.order_id debe estar presente");
    assert.equal(getSafeOrderId(order), "8498", "getSafeOrderId debe extraer el id como string");
    assert.equal(order.technician.name, "Técnico Prueba ATLAS 01", "Nombre del técnico mapeado correctamente");
  });

  test("2. startTracking en Portal Cliente inicializa seguimiento con origen en Base Providencia y destino del cliente", () => {
    const mockOrder = {
      id: "8498",
      order_number: "OT-08498",
      client: "BancoEstado",
      address: "Morandé 25",
      lat: -33.4445,
      lng: -70.654,
      technician: { name: "Técnico Prueba ATLAS 01" },
    };

    const tracking = startTracking(mockOrder);
    assert.ok(tracking, "El tracking debe crearse satisfactoriamente");
    assert.equal(tracking.orderId, "8498");
    assert.equal(tracking.technicianName, "Técnico Prueba ATLAS 01");
    assert.equal(tracking.origin.lat, DEMO_ORIGIN.lat, "Origen debe ser la Base Providencia");
    assert.equal(tracking.destination.lat, -33.4445, "Destino debe ser la latitud del cliente");
    assert.equal(tracking.destination.lng, -70.654, "Destino debe ser la longitud del cliente");
  });

  test("3. Sincronización inter-pestañas: startTracking reutiliza timestamp previo de localStorage si está activo", () => {
    // Simular que el Dashboard inició el tracking hace 45 segundos en la clave 'atlas_sim_started_at_8498'
    const now = Date.now();
    const elapsed45s = now - 45000;

    // Inyectar almacenamiento simulado en window
    const originalWindow = globalThis.window;
    const storageMap = new Map();
    storageMap.set("atlas_sim_started_at_8498", String(elapsed45s));

    globalThis.window = {
      localStorage: {
        getItem: (k) => storageMap.get(k) || null,
        setItem: (k, v) => storageMap.set(k, String(v)),
        removeItem: (k) => storageMap.delete(k),
        key: (i) => Array.from(storageMap.keys())[i],
        get length() {
          return storageMap.size;
        },
      },
    };

    try {
      const mockOrder = {
        id: "8498",
        lat: -33.4445,
        lng: -70.654,
      };

      const record = startTracking(mockOrder);
      assert.equal(record.startedAt, elapsed45s, "Debe sincronizar y adoptar el timestamp de la otra pestaña");

      // El progreso calculado debe rondar ~25% (45s / 180s)
      const snapshot = computeTrackingSnapshot(record, now);
      assert.equal(snapshot.progressPercent, 25, "El progreso debe reflejar exactamente los 45s transcurridos");
      assert.equal(snapshot.remainingSeconds, 135, "Deben quedar 135 segundos (180 - 45)");
    } finally {
      globalThis.window = originalWindow;
    }
  });

  test("4. restartTracking actualiza localStorage para sincronizar el reinicio con pestañas hermanas", () => {
    const storageMap = new Map();
    const originalWindow = globalThis.window;

    globalThis.window = {
      localStorage: {
        getItem: (k) => storageMap.get(k) || null,
        setItem: (k, v) => storageMap.set(k, String(v)),
        removeItem: (k) => storageMap.delete(k),
        key: (i) => Array.from(storageMap.keys())[i],
        get length() {
          return storageMap.size;
        },
      },
    };

    try {
      const mockOrder = { id: "8498", lat: -33.4445, lng: -70.654 };
      startTracking(mockOrder);

      const restarted = restartTracking("8498");
      assert.ok(restarted);
      const savedInStorage = storageMap.get("atlas_sim_started_at_8498");
      assert.ok(savedInStorage, "restartTracking debe actualizar la clave en localStorage");
      assert.equal(savedInStorage, String(restarted.startedAt));
    } finally {
      globalThis.window = originalWindow;
    }
  });

  test("5. makeVehicleIcon genera la camioneta ATLAS 3D isométrica, sin emojis improvisados 🚐", () => {
    const iconMoving = makeVehicleIcon(90, true, false, mockLeaflet);
    assert.ok(iconMoving, "Debe generar el icono Leaflet");
    assert.ok(!iconMoving.html.includes("🚐"), "No debe usar emoji 🚐 como vehículo");
    assert.ok(iconMoving.className.includes("atlas-sim-vehicle-icon"), "Debe tener la clase corporativa atlas-sim-vehicle-icon");
    assert.ok(iconMoving.html.includes("atlasBeaconStrobe"), "Debe incluir la baliza estroboscópica animada mientras se desplaza");

    const iconArrived = makeVehicleIcon(90, false, true, mockLeaflet);
    assert.ok(!iconArrived.html.includes("atlasBeaconStrobe"), "No debe parpadear la baliza al arribar a destino");
    assert.ok(iconArrived.html.includes("✓"), "Debe mostrar el check de arribo");
  });

  test("6. makeOriginIcon y makeDestinationIcon generan puntos de referencia con estilo ATLAS", () => {
    const originIcon = makeOriginIcon(mockLeaflet);
    assert.ok(originIcon.className.includes("atlas-sim-origin-icon"));

    const destIcon = makeDestinationIcon("#f97316", mockLeaflet);
    assert.ok(destIcon.className.includes("atlas-sim-dest-icon"));
    assert.ok(destIcon.html.includes("#f97316"), "Debe usar el naranja corporativo");
  });

  test("7. LiveTrackingMap.jsx implementa desacoplamiento de cámara, disclaimer de demo y polilíneas corporativas", () => {
    const mapComponentPath = path.resolve(__dirname, "../components/ui/LiveTrackingMap.jsx");
    const content = fs.readFileSync(mapComponentPath, "utf-8");

    // Verificación de polilíneas
    assert.ok(content.includes('color: "#f97316"'), "Tramo recorrido debe usar naranja #f97316");
    assert.ok(
      content.includes('color: isDark ? "#475569" : "#94a3b8"'),
      "Tramo pendiente debe usar gris neutro adaptativo al tema"
    );

    // Verificación de desacoplamiento de cámara en dragstart
    assert.ok(content.includes("useMapEvents"), "Debe usar useMapEvents para detectar gestos del usuario");
    assert.ok(content.includes("dragstart"), "Debe escuchar dragstart para liberar la cámara al arrastrar");
    assert.ok(content.includes("followVehicle"), "Debe permitir alternar seguimiento de cámara libremente");

    // Verificación de rótulo claro de MODO DEMOSTRACIÓN y GPS EN VIVO
    assert.ok(
      content.includes("Modo Demostración · Seguimiento V2"),
      "Debe identificar claramente el seguimiento simulado como MODO DEMOSTRACIÓN"
    );
    assert.ok(
      content.includes("GPS en Vivo · Satelital"),
      "Debe identificar el modo GPS satelital cuando exists señal real verificada"
    );

    // Verificación de controles interactivos visibles y etiquetas consistentes con V2
    assert.ok(content.includes("Seguir vehículo"), "Debe tener botón Seguir vehículo");
    assert.ok(content.includes("Siguiendo vehículo"), "Debe reflejar estado Siguiendo vehículo");
    assert.ok(content.includes("Ver ruta completa"), "Debe tener botón Ver ruta completa siempre visible");
    assert.ok(!content.includes('hidden sm:inline">Ver ruta'), "No debe ocultar la etiqueta Ver ruta completa en móviles");
    assert.ok(content.includes("Repetir"), "Debe tener botón para reiniciar la demostración");

    // Verificación de contraste en popups para tema claro/oscuro
    assert.ok(content.includes("dark:text-white"), "Los popups deben incluir texto contrastado para modo oscuro");
    assert.ok(content.includes("dark:text-gray-300"), "Los detalles en popups deben ser legibles en modo oscuro");
  });

  test("8. CustomerTrackingView.jsx integra LiveTrackingMap con toggle de previsualización para órdenes en cualquier estado", () => {
    const viewPath = path.resolve(__dirname, "../pages/CustomerTrackingView.jsx");
    const content = fs.readFileSync(viewPath, "utf-8");

    // Verificación de importación de LiveTrackingMap
    assert.ok(content.includes("LiveTrackingMap"), "Debe importar LiveTrackingMap");

    // Verificación del botón de previsualización para órdenes no en ruta
    assert.ok(
      content.includes("Previsualizar recorrido técnico (Modo Demostración)"),
      "Debe permitir previsualizar el recorrido para demostración en órdenes no en tránsito"
    );
    assert.ok(content.includes("isDemoPreviewActive"), "Debe gestionar estado de previsualización demo");

    // Verificación de que no expone acciones mutables de órdenes ni controles de edición
    assert.ok(!content.includes("api.orders.updateStatus"), "Portal Cliente no debe permitir modificar estados de órdenes");
    assert.ok(!content.includes("api.orders.delete"), "Portal Cliente no debe permitir eliminar órdenes");
  });

  test("9. Sincronización cross-sesión con route_started_at y status_history sin reiniciar al abrir Magic Link", () => {
    const startedMs = Date.now() - 90_000;
    const orderFromPortal = {
      id: "8501",
      order_number: "#OT-8501",
      lat: -33.43,
      lng: -70.61,
      route_started_at: new Date(startedMs).toISOString(),
    };
    const orderFromAdmin = {
      id: "8501",
      order_number: "#OT-8501",
      lat: -33.43,
      lng: -70.61,
      status_history: [
        { new_status: "CONFIRMADA", created_at: new Date(startedMs - 300_000).toISOString() },
        { new_status: "EN_RUTA", created_at: new Date(startedMs).toISOString() },
      ],
    };

    const portalRec = startTracking(orderFromPortal);
    assert.ok(portalRec);
    assert.equal(portalRec.startedAt, extractSharedRouteStartedAt(orderFromAdmin));

    // Ruta completada (>= 180s) debe permanecer al 100% / arribado sin reiniciarse a 0%
    resetAllTrackings();
    const expiredMs = Date.now() - 240_000;
    const finishedRec = startTracking({
      id: "8502",
      order_number: "#OT-8502",
      lat: -33.43,
      lng: -70.61,
      route_started_at: new Date(expiredMs).toISOString(),
    });
    assert.ok(finishedRec);
    assert.equal(finishedRec.startedAt, expiredMs);
    assert.equal(finishedRec.isArrived, true);

    const snap = computeTrackingSnapshot(finishedRec, Date.now());
    assert.equal(snap.progressPercent, 100);
    assert.equal(snap.isArrived, true);

    // Reinicio manual no debe ser sobrescrito por polling posterior
    const replayed = restartTracking("8502");
    assert.ok(replayed.isManualReplay);
    const afterPoll = startTracking({
      id: "8502",
      order_number: "#OT-8502",
      lat: -33.43,
      lng: -70.61,
      route_started_at: new Date(expiredMs).toISOString(),
    });
    assert.equal(afterPoll.startedAt, replayed.startedAt);
  });

  test("10. calculateHaversineDistanceMeters calcula distancia métrica consistente para GPS real", () => {
    const samePointDist = calculateHaversineDistanceMeters(DEMO_ORIGIN, DEMO_ORIGIN);
    assert.equal(samePointDist, 0);

    const provToLasCondes = calculateHaversineDistanceMeters(DEMO_ORIGIN, {
      lat: -33.4092,
      lng: -70.5675,
    });
    assert.ok(provToLasCondes > 3000 && provToLasCondes < 6000, "Distancia estimada Providencia-Las Condes debe ser realista");
  });
});
