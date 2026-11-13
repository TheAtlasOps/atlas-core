/**
 * frontend/src/lib/routeTrackingManager.js
 *
 * Motor centralizado y administrador de estado en frontend para el seguimiento
 * simulado automático de técnicos hacia órdenes de trabajo en estado "En ruta" (ATLAS FSM V2).
 *
 * Mejoras V2:
 * - Motor desacoplado del ciclo de renderizado de React: un solo ticker central para toda la aplicación.
 * - computeTrackingSnapshot 100% puro: sin efectos secundarios ni mutaciones durante el cálculo.
 * - Notificaciones centralizadas y deterministas: exactamente una emisión al cumplirse el tiempo de simulación.
 * - Interpolación continua suave entre waypoints: movimiento fluido y llegada milimétrica exacta al destino.
 * - Suavizado angular de orientación (slerp / EMA) para giros orgánicos sin sacudidas ni volteos bruscos.
 * - Continuidad garantizada en segundo plano y compatibilidad con Page Visibility API.
 */

import { useState, useEffect } from "react";
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

export function getSafeTechnicianName(order) {
  if (!order) return "Especialista en terreno";
  if (typeof order.technician_name === "string" && order.technician_name.trim()) {
    return order.technician_name.trim();
  }
  if (typeof order.assigneeName === "string" && order.assigneeName.trim()) {
    return order.assigneeName.trim();
  }
  if (typeof order.assignee === "string" && order.assignee.trim()) {
    return order.assignee.trim();
  }
  if (typeof order.technician === "string" && order.technician.trim()) {
    return order.technician.trim();
  }
  if (typeof order.technician_summary?.full_name === "string" && order.technician_summary.full_name.trim()) {
    return order.technician_summary.full_name.trim();
  }
  const assigned = order.assigned_technician || order.technician;
  if (assigned) {
    if (typeof assigned.full_name === "string" && assigned.full_name.trim()) {
      return assigned.full_name.trim();
    }
    if (typeof assigned.name === "string" && assigned.name.trim()) {
      return assigned.name.trim();
    }
    if (assigned.user) {
      const u = assigned.user;
      const fn = `${u.first_name || ""} ${u.last_name || ""}`.trim();
      if (fn) return fn;
    }
  }
  return "Especialista en terreno";
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

/**
 * Suaviza un ángulo en grados hacia un ángulo objetivo considerando la discontinuidad 360/0.
 */
export function smoothAngle(currentAngle, targetAngle, alpha = 0.22) {
  if (currentAngle === null || currentAngle === undefined || isNaN(currentAngle)) {
    return targetAngle;
  }
  let diff = (targetAngle - currentAngle + 180) % 360 - 180;
  if (diff < -180) diff += 360;
  return ((currentAngle + diff * alpha) % 360 + 360) % 360;
}

// ─── Almacén central de seguimiento y motor de simulación ─────────────────────

const activeTrackings = new Map();
const listeners = new Set();
let onTrackingCompletedCallback = null;
let engineTimerId = null;

export function setOnTrackingCompleted(callback) {
  onTrackingCompletedCallback = callback;
}

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
 * Verifica y dispara las notificaciones centralizadas de finalización para las órdenes
 * que hayan alcanzado o superado su duración de simulación.
 * Retorna true si hubo alguna finalización nueva.
 */
export function checkAndNotifyCompletion(target = null, now = Date.now()) {
  let currentTime = now;
  let recordsToCheck = [];

  if (target && typeof target === "object") {
    recordsToCheck = [target];
  } else if (typeof target === "number") {
    currentTime = target;
    recordsToCheck = Array.from(activeTrackings.values());
  } else {
    recordsToCheck = Array.from(activeTrackings.values());
  }

  let anyCompleted = false;

  for (const record of recordsToCheck) {
    if (!record || record.hasNotifiedCompletion) continue;
    const elapsedMs = Math.max(0, currentTime - record.startedAt);
    if (elapsedMs >= record.durationMs) {
      record.hasNotifiedCompletion = true;
      record.isArrived = true;
      anyCompleted = true;

      if (typeof onTrackingCompletedCallback === "function") {
        try {
          onTrackingCompletedCallback(record);
        } catch (err) {
          console.warn("[ATLAS routeTrackingManager] Error en callback de finalización:", err);
        }
      }
    }
  }

  return anyCompleted;
}

/**
 * Ciclo principal de actualización del motor de simulación.
 */
function stepEngine() {
  const now = Date.now();
  checkAndNotifyCompletion(now);

  notifyListeners();

  // Comprobar si aún queda alguna orden en tránsito sin arribar
  let hasPending = false;
  for (const record of activeTrackings.values()) {
    if (record && !record.hasNotifiedCompletion) {
      hasPending = true;
      break;
    }
  }

  if (hasPending && typeof window !== "undefined") {
    if (typeof document !== "undefined" && document.hidden) {
      engineTimerId = setTimeout(stepEngine, 400);
    } else {
      engineTimerId = requestAnimationFrame(stepEngine);
    }
  } else {
    engineTimerId = null;
  }
}

export function ensureEngineRunning() {
  if (engineTimerId !== null) return;
  let hasPending = false;
  for (const record of activeTrackings.values()) {
    if (record && !record.hasNotifiedCompletion) {
      hasPending = true;
      break;
    }
  }
  if (hasPending && typeof window !== "undefined") {
    engineTimerId = requestAnimationFrame(stepEngine);
  }
}

// Recuperación fluida ante cambio de visibilidad de la pestaña (Page Visibility API)
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      if (engineTimerId !== null) {
        clearTimeout(engineTimerId);
        cancelAnimationFrame(engineTimerId);
        engineTimerId = null;
      }
      stepEngine();
    }
  });
}

/**
 * Inicia el seguimiento automático simulado para una orden en ruta.
 * Si ya se encuentra en seguimiento, conserva el `startedAt` original.
 */
export function startTracking(order, { isInitialLoad = false } = {}) {
  const orderId = getSafeOrderId(order);
  if (!orderId) return null;

  if (activeTrackings.has(orderId)) {
    ensureEngineRunning();
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
    technicianName: getSafeTechnicianName(order),
    origin: DEMO_ORIGIN,
    destination: { lat, lng },
    startedAt: Date.now(),
    durationMs: SIMULATION_DURATION_MS,
    routeData: null,
    isLoadingRoute: true,
    routeError: null,
    isInitialLoad: Boolean(isInitialLoad),
    hasNotifiedCompletion: false,
    isArrived: false,
    lastBearing: null,
    rawOrder: order,
  };

  activeTrackings.set(orderId, record);
  ensureEngineRunning();
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
      ensureEngineRunning();
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
      ensureEngineRunning();
    })
    .catch((err) => {
      const rec = activeTrackings.get(orderId);
      if (!rec) return;
      rec.isLoadingRoute = false;
      rec.routeError = err.message || "Error al calcular la ruta por calles.";
      notifyListeners();
    });
}

/**
 * Reinicia la simulación local de una orden (botón 'Repetir demo').
 * No modifica BD, Neon ni estados operativos reales.
 */
export function restartTracking(orderId) {
  if (!orderId) return null;
  const current = activeTrackings.get(String(orderId));
  if (!current) return null;
  current.startedAt = Date.now();
  current.hasNotifiedCompletion = false;
  current.isArrived = false;
  current.lastBearing = null;
  ensureEngineRunning();
  notifyListeners();
  return current;
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
 * Calcula una instantánea de telemetría determinista a partir de un timestamp (`now`).
 * Función 100% PURA: no produce efectos secundarios ni mutaciones de notificación.
 */
export function computeTrackingSnapshot(record, now = Date.now()) {
  if (!record) return null;

  const elapsedMs = Math.max(0, now - record.startedAt);
  const progress = Math.min(1, elapsedMs / record.durationMs);
  const isArrived = elapsedMs >= record.durationMs;
  const remainingSeconds = Math.max(0, Math.ceil((record.durationMs - elapsedMs) / 1000));

  const totalSteps = record.routeData?.interpolatedCoordinates?.length || 0;
  const coordinates = record.routeData?.interpolatedCoordinates || [];

  let currentCoord = [record.origin.lat, record.origin.lng];
  let traveledSegment = [];
  let pendingSegment = [];
  let bearing = record.lastBearing || 0;

  if (totalSteps > 0) {
    if (isArrived || progress >= 1) {
      // Arribo exacto milimétrico al destino
      currentCoord = [record.destination.lat, record.destination.lng];
      traveledSegment = [...coordinates, [record.destination.lat, record.destination.lng]];
      pendingSegment = [];
      bearing = record.lastBearing || 0;
    } else {
      // Interpolación continua sub-segmento para movimiento ultra-suave
      const floatIndex = progress * (totalSteps - 1);
      const i0 = Math.floor(floatIndex);
      const i1 = Math.min(i0 + 1, totalSteps - 1);
      const ratio = floatIndex - i0;

      const p0 = coordinates[i0];
      const p1 = coordinates[i1];

      currentCoord = [
        p0[0] + (p1[0] - p0[0]) * ratio,
        p0[1] + (p1[1] - p0[1]) * ratio,
      ];

      // El tramo recorrido termina exactamente en currentCoord
      traveledSegment = [...coordinates.slice(0, i0 + 1), currentCoord];

      // El tramo pendiente inicia exactamente en currentCoord hacia el destino
      pendingSegment = [currentCoord, ...coordinates.slice(i1)];

      // Suavizado continuo de orientación hacia el rumbo vial venidero
      if (totalSteps > 1) {
        const lookAhead = Math.min(i0 + 3, totalSteps - 1);
        const targetPt = coordinates[lookAhead];
        const rawBearing = calculateBearing(currentCoord, targetPt);
        bearing = smoothAngle(record.lastBearing ?? rawBearing, rawBearing, 0.25);
        record.lastBearing = bearing;
      }
    }
  }

  const remainingDistanceMeters = record.routeData
    ? isArrived
      ? 0
      : Math.round(record.routeData.distanceMeters * (1 - progress))
    : 0;

  const currentIndex =
    totalSteps > 0 ? Math.min(totalSteps - 1, Math.floor(progress * (totalSteps - 1))) : 0;

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
    pendingSegment,
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

  for (const o of orders) {
    if (!o) continue;
    const orderId = getSafeOrderId(o);
    if (!orderId) continue;

    if (isEnRutaStatus(o.status)) {
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
  if (engineTimerId !== null) {
    clearTimeout(engineTimerId);
    cancelAnimationFrame(engineTimerId);
    engineTimerId = null;
  }
  notifyListeners();
}

/**
 * Hook React para acceder al estado de seguimiento de una orden.
 * Se suscribe al motor centralizado sin crear bucles de requestAnimationFrame locales.
 */
export function useRouteTracking(orderId) {
  const safeId = orderId !== null && orderId !== undefined ? String(orderId) : null;
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToTrackings(() => setTick((t) => t + 1));
    return unsubscribe;
  }, []);

  const record = safeId ? getTracking(safeId) : null;
  if (!record) return null;
  return computeTrackingSnapshot(record, Date.now());
}
