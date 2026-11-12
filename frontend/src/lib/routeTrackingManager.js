/**
 * frontend/src/lib/routeTrackingManager.js
 *
 * Administrador de estado compartido en frontend para el seguimiento simulado
 * automático de técnicos hacia órdenes de trabajo en estado "En ruta" (ATLAS FSM).
 *
 * Características:
 * - Duración fija de 3 minutos reales (180 segundos).
 * - Progreso calculado a partir de timestamps (wall-clock time), inmune a cierres de modal
 *   o cambios de vista/página dentro de la sesión.
 * - Sin peticiones innecesarias ni bucles duplicados en segundo plano.
 * - Manejo seguro de campos para evitar React Minified Error #31 (objetos como hijos).
 */

import { useState, useEffect, useMemo } from "react";
import {
  DEMO_ORIGIN,
  fetchStreetRoute,
  calculateBearing,
} from "./routeSimulation.js";
import { extractOrderCoordinates } from "./mapClustering.js";

export const SIMULATION_DURATION_SECONDS = 180; // 3 minutos reales
export const SIMULATION_DURATION_MS = SIMULATION_DURATION_SECONDS * 1000;

// ─── Extracción segura de datos para evitar objetos como hijos en React ──────

export function getSafeClientName(order) {
  if (!order) return "Cliente Corporativo";
  if (typeof order.client === "string" && order.client.trim()) {
    return order.client.trim();
  }
  if (typeof order.client?.business_name === "string" && order.client.business_name.trim()) {
    return order.client.business_name.trim();
  }
  if (typeof order.client?.name === "string" && order.client.name.trim()) {
    return order.client.name.trim();
  }
  if (typeof order.clientName === "string" && order.clientName.trim()) {
    return order.clientName.trim();
  }
  return "Cliente Corporativo";
}

export function getSafeAddress(order) {
  if (!order) return "Dirección sin especificar";
  if (typeof order.address === "string" && order.address.trim()) {
    return order.address.trim();
  }
  if (typeof order.address_override === "string" && order.address_override.trim()) {
    return order.address_override.trim();
  }
  if (typeof order.client?.address === "string" && order.client.address.trim()) {
    return order.client.address.trim();
  }
  if (typeof order.location === "string" && order.location.trim()) {
    return order.location.trim();
  }
  return "Dirección sin especificar";
}

export function getSafeOrderNumber(order) {
  if (!order) return "OT-???";
  const num = order.order_number ?? order.orderNumber ?? order.id;
  if (num === null || num === undefined) return "OT-???";
  return String(num);
}

export function getSafeOrderId(order) {
  if (!order) return null;
  const id = order.id ?? order.order_number ?? order.orderNumber;
  return id !== null && id !== undefined ? String(id) : null;
}

/**
 * Normaliza y comprueba si un estado corresponde a "En ruta"
 */
export function isEnRutaStatus(status) {
  if (!status || typeof status !== "string") return false;
  const s = status.trim().toUpperCase().replace(/[\s_-]+/g, "_");
  return s === "EN_RUTA" || s === "EN_CAMINO" || s === "EN_TRANSITO";
}

/** Formatea cuenta regresiva MM:SS */
export function formatCountdown(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds <= 0) {
    return "0:00 min";
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s} min`;
}

// ─── Almacén en memoria persistente a nivel de módulo ────────────────────────

const activeTrackings = new Map();
const listeners = new Set();

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener();
    } catch (err) {
      console.warn("[ATLAS routeTrackingManager] Error en listener:", err);
    }
  }
}

/**
 * Inicia el seguimiento automático simulado para una orden en ruta.
 * Si ya se encuentra en seguimiento, conserva el `startedAt` original.
 */
export function startTracking(order, { isInitialLoad = false } = {}) {
  const orderId = getSafeOrderId(order);
  if (!orderId) return null;

  if (activeTrackings.has(orderId)) {
    return activeTrackings.get(orderId);
  }

  const { lat, lng, isValid } = extractOrderCoordinates(order);
  if (!isValid) {
    return null;
  }

  const record = {
    orderId,
    orderNumber: getSafeOrderNumber(order),
    clientName: getSafeClientName(order),
    address: getSafeAddress(order),
    origin: DEMO_ORIGIN,
    destination: { lat, lng },
    startedAt: Date.now(),
    durationMs: SIMULATION_DURATION_MS,
    routeData: null,
    isLoadingRoute: true,
    routeError: null,
    isInitialLoad: Boolean(isInitialLoad),
    rawOrder: order,
  };

  activeTrackings.set(orderId, record);
  notifyListeners();

  // Cálculo de ruta OSRM en segundo plano
  fetchStreetRoute(DEMO_ORIGIN, record.destination, { timeoutMs: 5000 })
    .then((routeData) => {
      const current = activeTrackings.get(orderId);
      if (!current) return;
      current.routeData = routeData;
      current.isLoadingRoute = false;
      current.routeError = null;
      notifyListeners();
    })
    .catch((err) => {
      const current = activeTrackings.get(orderId);
      if (!current) return;
      current.isLoadingRoute = false;
      current.routeError =
        err.message || "Error al calcular la ruta por calles para el seguimiento.";
      notifyListeners();
    });

  return record;
}

/**
 * Reintenta calcular la ruta OSRM para una orden en seguimiento
 */
export function retryTrackingRoute(orderId) {
  const current = activeTrackings.get(orderId);
  if (!current) return;

  current.isLoadingRoute = true;
  current.routeError = null;
  notifyListeners();

  fetchStreetRoute(DEMO_ORIGIN, current.destination, { timeoutMs: 5000 })
    .then((routeData) => {
      const rec = activeTrackings.get(orderId);
      if (!rec) return;
      rec.routeData = routeData;
      rec.isLoadingRoute = false;
      rec.routeError = null;
      notifyListeners();
    })
    .catch((err) => {
      const rec = activeTrackings.get(orderId);
      if (!rec) return;
      rec.isLoadingRoute = false;
      rec.routeError = err.message || "Error al calcular la ruta por calles.";
      notifyListeners();
    });
}

/** Detiene y elimina el seguimiento simulado de una orden */
export function stopTracking(orderId) {
  if (!orderId) return;
  if (activeTrackings.delete(String(orderId))) {
    notifyListeners();
  }
}

/** Obtiene el registro de seguimiento para una orden */
export function getTracking(orderId) {
  if (!orderId) return null;
  return activeTrackings.get(String(orderId)) || null;
}

/** Consulta si una orden tiene seguimiento activo */
export function hasActiveTracking(orderId) {
  if (!orderId) return false;
  return activeTrackings.has(String(orderId));
}

/**
 * Calcula una instantánea de telemetría determinista en base a un timestamp (`now`).
 * El avance es continuo a lo largo de los 180 segundos.
 */
export function computeTrackingSnapshot(record, now = Date.now()) {
  if (!record) return null;

  const elapsedMs = Math.max(0, now - record.startedAt);
  const progress = Math.min(1, elapsedMs / record.durationMs);
  const isArrived = elapsedMs >= record.durationMs;
  const remainingSeconds = Math.max(0, Math.ceil((record.durationMs - elapsedMs) / 1000));

  const totalSteps = record.routeData?.interpolatedCoordinates?.length || 0;
  const currentIndex =
    totalSteps > 0 ? Math.min(totalSteps - 1, Math.floor(progress * (totalSteps - 1))) : 0;

  const currentCoord =
    totalSteps > 0
      ? record.routeData.interpolatedCoordinates[currentIndex]
      : [record.origin.lat, record.origin.lng];

  const remainingDistanceMeters = record.routeData
    ? Math.round(record.routeData.distanceMeters * (1 - progress))
    : 0;

  const traveledSegment =
    totalSteps > 0
      ? record.routeData.interpolatedCoordinates.slice(0, currentIndex + 1)
      : [];

  let bearing = 0;
  if (totalSteps > 1 && !isArrived) {
    const targetIdx = Math.min(currentIndex + 3, totalSteps - 1);
    bearing = calculateBearing(
      record.routeData.interpolatedCoordinates[currentIndex],
      record.routeData.interpolatedCoordinates[targetIdx]
    );
  }

  return {
    ...record,
    elapsedMs,
    progress,
    progressPercent: Math.round(progress * 100),
    isArrived,
    remainingSeconds,
    remainingDistanceMeters,
    currentIndex,
    totalSteps,
    currentCoord,
    traveledSegment,
    bearing,
  };
}

/**
 * Sincroniza la lista de órdenes activas con el administrador de seguimiento.
 * - Inicia seguimiento para órdenes en "EN_RUTA" con coordenadas válidas.
 * - Detiene seguimiento para órdenes que cambiaron de estado y ya no están en "EN_RUTA".
 */
export function syncOrdersWithTracking(orders, { isInitial = false } = {}) {
  if (!Array.isArray(orders)) return;

  const currentEnRutaIds = new Set();

  for (const o of orders) {
    if (!o) continue;
    const orderId = getSafeOrderId(o);
    if (!orderId) continue;

    if (isEnRutaStatus(o.status)) {
      currentEnRutaIds.add(orderId);
      if (!activeTrackings.has(orderId)) {
        startTracking(o, { isInitialLoad: isInitial });
      }
    }
  }

  // Detener seguimiento si la orden cambió de estado (ej: COMPLETADA o EN_SITIO)
  for (const trackedId of Array.from(activeTrackings.keys())) {
    const matchingOrder = orders.find((o) => getSafeOrderId(o) === trackedId);
    if (matchingOrder && !isEnRutaStatus(matchingOrder.status)) {
      stopTracking(trackedId);
    }
  }
}

/** Suscribe un callback a cambios de estado en el administrador */
export function subscribeToTrackings(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Reinicia todos los seguimientos activos (utilizado en pruebas) */
export function resetAllTrackings() {
  activeTrackings.clear();
  notifyListeners();
}

/**
 * Hook React para acceder al estado de seguimiento de una orden
 */
export function useRouteTracking(orderId) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToTrackings(() => setTick((t) => t + 1));
    return unsubscribe;
  }, []);

  const safeId = orderId !== null && orderId !== undefined ? String(orderId) : null;
  const record = safeId ? getTracking(safeId) : null;

  return useMemo(() => {
    if (!record) return null;
    return computeTrackingSnapshot(record, Date.now());
  }, [record]);
}
