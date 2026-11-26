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
  startTracking,
  restartTracking,
  applySharedTrackingTimestamp,
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

    // Verificación de rótulo discreto de demostración y GPS EN VIVO
    assert.ok(
      content.includes("Recorrido en curso · Demostración"),
      "Debe identificar discretamente el seguimiento simulado como demostración"
    );
    assert.ok(
      content.includes("GPS en Vivo · Satelital"),
      "Debe identificar el modo GPS satelital cuando existe señal real verificada"
    );

    // Verificación de controles interactivos visibles y eliminación de Repetir / Repetición local en Portal Cliente
    assert.ok(content.includes("Seguir vehículo"), "Debe tener botón Seguir vehículo");
    assert.ok(content.includes("Siguiendo vehículo"), "Debe reflejar estado Siguiendo vehículo");
    assert.ok(content.includes("Ver ruta completa"), "Debe tener botón Ver ruta completa siempre visible");
    assert.ok(!content.includes('hidden sm:inline">Ver ruta'), "No debe ocultar la etiqueta Ver ruta completa en móviles");
    assert.ok(!content.includes("Repetir"), "Portal Cliente no debe mostrar botón Repetir");
    assert.ok(!content.includes("Repetición local"), "Portal Cliente no debe mostrar mensajes de repetición local");

    // Verificación de contraste en popups para tema claro/oscuro
    assert.ok(content.includes("dark:text-white"), "Los popups deben incluir texto contrastado para modo oscuro");
    assert.ok(content.includes("dark:text-gray-300"), "Los detalles en popups deben ser legibles en modo oscuro");
  });

  test("8. CustomerTrackingView.jsx sigue automáticamente el modo activo del administrador sin selector ni preview manual", () => {
    const viewPath = path.resolve(__dirname, "../pages/CustomerTrackingView.jsx");
    const content = fs.readFileSync(viewPath, "utf-8");

    // Verificación de importación de LiveTrackingMap
    assert.ok(content.includes("LiveTrackingMap"), "Debe importar LiveTrackingMap");

    // Verificación de que no expone selector GPS/Simulación ni preview manual en el Portal Cliente
    assert.ok(!content.includes("preferredTrackingMode"), "Portal Cliente no debe incluir selector GPS vs Simulación V2");
    assert.ok(!content.includes("Simulación V2 (Demo)"), "Portal Cliente no debe mostrar botón de selector Simulación V2");
    assert.ok(!content.includes("isDemoPreviewActive"), "Portal Cliente no debe permitir activar manualmente simulaciones locales");
    assert.ok(content.includes("active_tracking_mode"), "Portal Cliente debe respetar active_tracking_mode del backend");

    // Verificación de que no expone acciones mutables de órdenes ni controles de edición
    assert.ok(!content.includes("api.orders.updateStatus"), "Portal Cliente no debe permitir modificar estados de órdenes");
    assert.ok(!content.includes("api.orders.delete"), "Portal Cliente no debe permitir eliminar órdenes");
    assert.ok(!content.includes("syncTrackingSimulation"), "Portal Cliente no debe invocar endpoints administrativos");
  });

  test("9. Dos sesiones independientes (Admin <-> Portal Cliente) comparten inicio, avance, repetición y finalización de 180s", () => {
    const startedMs = Date.now() - 60_000;
    const naiveIso = new Date(startedMs).toISOString().replace("Z", "");

    // Sesión Admin (GET /orders)
    const adminOrder = {
      id: "8501",
      order_number: "#OT-8501",
      status: "EN_RUTA",
      tracking_mode: "SIMULATION",
      simulation_started_at: new Date(startedMs).toISOString(),
      lat: -33.43,
      lng: -70.61,
      status_history: [
        { new_status: "CONFIRMADA", created_at: new Date(startedMs - 300_000).toISOString() },
        { new_status: "EN_RUTA", created_at: naiveIso },
      ],
    };

    // Sesión Cliente independiente (GET /client/order-summary o /client/tracking)
    const clientSummaryOrder = mapApiSummaryToTrackingOrder({
      order_id: "8501",
      order_number: "#OT-8501",
      status: "En ruta",
      status_key: "en_ruta",
      service_type: "INSTALACION",
      address: "Av. Apoquindo 4500",
      comuna: "Las Condes",
      lat: -33.43,
      lng: -70.61,
      tracking_mode: "SIMULATION",
      active_tracking_mode: "SIMULATION",
      route_started_at: new Date(startedMs).toISOString(),
      timeline_steps: [],
      is_confirmed: false,
      is_completed: false,
    });

    const adminRec = startTracking(adminOrder);
    const adminSnapBeforeReload = computeTrackingSnapshot(adminRec, startedMs + 60_000);

    // Simular segunda sesión independiente limpia (sin localStorage compartido)
    resetAllTrackings();
    const portalRec = startTracking(clientSummaryOrder);
    const portalSnap = computeTrackingSnapshot(portalRec, startedMs + 60_000);

    assert.equal(portalRec.startedAt, adminRec.startedAt);
    assert.equal(portalSnap.progressPercent, adminSnapBeforeReload.progressPercent);
    assert.equal(portalSnap.remainingSeconds, adminSnapBeforeReload.remainingSeconds);

    // Simular recarga cuando el recorrido ya finalizó (>= 180s) -> ambos ven 100% sin reiniciarse
    const afterFinishTs = startedMs + 200_000;
    const finishedSnap = computeTrackingSnapshot(portalRec, afterFinishTs);
    assert.equal(finishedSnap.progressPercent, 100);
    assert.equal(finishedSnap.isArrived, true);

    // Simular que el Administrador presiona Repetir -> nuevo simulation_started_at desde backend
    const replayStartedMs = Date.now() - 5_000;
    const updatedFromAdminRestart = applySharedTrackingTimestamp(
      "8501",
      new Date(replayStartedMs).toISOString()
    );
    assert.equal(updatedFromAdminRestart.startedAt, replayStartedMs);
    assert.equal(updatedFromAdminRestart.isArrived, false);

    // El polling del Portal Cliente recibe el nuevo route_started_at y reinicia automáticamente el mismo ciclo
    const syncedPortalRec = startTracking({
      ...clientSummaryOrder,
      route_started_at: new Date(replayStartedMs).toISOString(),
    });
    assert.equal(syncedPortalRec.startedAt, replayStartedMs);
    assert.equal(syncedPortalRec.isArrived, false);

    const syncedSnap = computeTrackingSnapshot(syncedPortalRec, replayStartedMs + 5_000);
    assert.ok(syncedSnap.progressPercent >= 2 && syncedSnap.progressPercent <= 5);
  });

  test("10. GPS real evita DEMO_ORIGIN/rutas ficticias y RouteSimulationModal persiste inicio y repetición en backend", () => {
    const mapPath = path.resolve(__dirname, "../components/ui/LiveTrackingMap.jsx");
    const mapContent = fs.readFileSync(mapPath, "utf-8");
    const modalPath = path.resolve(__dirname, "../components/ui/RouteSimulationModal.jsx");
    const modalContent = fs.readFileSync(modalPath, "utf-8");

    assert.ok(!mapContent.includes("liveTotalReferenceMeters"), "GPS real no debe calcular progreso usando DEMO_ORIGIN");
    assert.ok(!mapContent.includes("liveProgressPercent"), "GPS real no debe inventar porcentaje de ruta desde DEMO_ORIGIN");
    assert.ok(mapContent.includes("en línea recta aprox."), "GPS real debe identificar estimaciones directas en línea recta");

    assert.ok(modalContent.includes("syncTrackingSimulation"), "Admin debe persistir start/restart en backend para sincronizar dispositivos");
    assert.ok(modalContent.includes("Modo GPS automático"), "Admin debe poder devolver control a GPS automático");

    const samePointDist = calculateHaversineDistanceMeters(DEMO_ORIGIN, DEMO_ORIGIN);
    assert.equal(samePointDist, 0);

    const provToLasCondes = calculateHaversineDistanceMeters(DEMO_ORIGIN, {
      lat: -33.4092,
      lng: -70.5675,
    });
    assert.ok(provToLasCondes > 3000 && provToLasCondes < 6000, "Distancia estimada Providencia-Las Condes debe ser realista");
  });
});
