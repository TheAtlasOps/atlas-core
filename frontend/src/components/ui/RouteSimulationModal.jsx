/**
 * frontend/src/components/ui/RouteSimulationModal.jsx
 *
 * Visor de seguimiento simulado de técnico en ruta (ATLAS FSM).
 * Diseñado para la presentación académica:
 * - Se activa automáticamente con órdenes en estado "En ruta".
 * - Duración exacta de 3 minutos (180 segundos).
 * - Progreso determinista calculado por timestamps (wall-clock time), permitiendo
 *   cerrar el visor o navegar por el dashboard sin reiniciar la simulación.
 * - Manejo 100% seguro de datos de orden para evitar React Minified Error #31.
 * - Protegido por SimulationErrorBoundary contra fallos en Leaflet/OSRM.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Navigation,
  MapPin,
  Clock,
  Gauge,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Zap,
  RotateCcw,
  UserCheck,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useTheme } from "../../hooks/useTheme";
import {
  DEMO_ORIGIN,
  formatDistance,
  makeOriginIcon,
  makeDestinationIcon,
  makeVehicleIcon,
} from "../../lib/routeSimulation";
import { extractOrderCoordinates } from "../../lib/mapClustering";
import {
  getSafeOrderId,
  getSafeOrderNumber,
  getSafeClientName,
  getSafeAddress,
  getSafeTechnicianName,
  startTracking,
  restartTracking,
  getTracking,
  retryTrackingRoute,
  computeTrackingSnapshot,
  subscribeToTrackings,
  formatCountdown,
  SIMULATION_DURATION_SECONDS,
} from "../../lib/routeTrackingManager";
import SimulationErrorBoundary from "./SimulationErrorBoundary";

// ─── Componente para autoencuadre de la ruta en Leaflet ──────────────────────
function RouteBoundsFitter({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length < 2) return;
    try {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
      map.invalidateSize();
    } catch {
      // Ignorar si el mapa aún no está listo
    }
  }, [map, points]);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE INTERNO DEL VISOR
// ═══════════════════════════════════════════════════════════════════════════════
function RouteSimulationModalInner({ order, onClose }) {
  const { isDark } = useTheme();

  // 1. Extracción segura de valores primitivos
  const orderId = useMemo(() => getSafeOrderId(order), [order]);
  const orderNumber = useMemo(() => getSafeOrderNumber(order), [order]);
  const clientName = useMemo(() => getSafeClientName(order), [order]);
  const clientAddress = useMemo(() => getSafeAddress(order), [order]);
  const technicianName = useMemo(() => getSafeTechnicianName(order), [order]);

  const destinationCoords = useMemo(() => {
    if (!order) return null;
    const { lat, lng, isValid } = extractOrderCoordinates(order);
    if (isValid) return { lat, lng };
    return null;
  }, [order]);

  // 2. Registro de seguimiento automático en frontend
  const [trackingRecord, setTrackingRecord] = useState(() => {
    if (!order) return null;
    let rec = orderId ? getTracking(orderId) : null;
    if (!rec && destinationCoords) {
      rec = startTracking(order);
    }
    return rec;
  });

  // Suscribirse a actualizaciones del almacén de seguimiento
  useEffect(() => {
    const unsubscribe = subscribeToTrackings(() => {
      if (orderId) {
        const rec = getTracking(orderId);
        setTrackingRecord(rec ? { ...rec } : null);
      }
    });
    return unsubscribe;
  }, [orderId]);

  // Si no había seguimiento activo al montar pero la orden tiene coordenadas válidas
  useEffect(() => {
    if (!trackingRecord && order && destinationCoords) {
      const rec = startTracking(order);
      if (rec) setTrackingRecord({ ...rec });
    }
  }, [trackingRecord, order, destinationCoords]);

  // 3. Estado dinámico de telemetría actualizado en tiempo real
  const [snapshot, setSnapshot] = useState(() => {
    return trackingRecord ? computeTrackingSnapshot(trackingRecord, Date.now()) : null;
  });

  // Loop de actualización visual vía requestAnimationFrame mientras el visor esté abierto
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!trackingRecord || !trackingRecord.routeData) {
      setSnapshot(trackingRecord ? computeTrackingSnapshot(trackingRecord, Date.now()) : null);
      return;
    }

    const updateLoop = () => {
      const current = getTracking(orderId) || trackingRecord;
      const snap = computeTrackingSnapshot(current, Date.now());
      setSnapshot(snap);
      animFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [trackingRecord, orderId]);

  // Manejo de reintento de cálculo OSRM
  const handleRetryRoute = useCallback(() => {
    if (orderId) {
      retryTrackingRoute(orderId);
    }
  }, [orderId]);

  if (!order) return null;

  const isLoadingRoute = trackingRecord ? trackingRecord.isLoadingRoute : false;
  const routeError = !destinationCoords
    ? "Esta orden de trabajo no cuenta con coordenadas geográficas registradas. No es posible iniciar la simulación de ruta sin un destino válido."
    : trackingRecord?.routeError;

  const routeData = trackingRecord?.routeData;
  const routePoints = routeData?.interpolatedCoordinates || [];
  const currentCoord = snapshot?.currentCoord || [DEMO_ORIGIN.lat, DEMO_ORIGIN.lng];
  const vehicleBearing = snapshot?.bearing || 0;
  const traveledSegment = snapshot?.traveledSegment || [];
  const progressPercent = snapshot?.progressPercent || 0;
  const remainingDistanceMeters = snapshot?.remainingDistanceMeters || 0;
  const remainingSeconds = snapshot?.remainingSeconds || 0;
  const isArrived = Boolean(snapshot?.isArrived);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="simulation-title"
    >
      <div className="relative flex flex-col w-full max-w-5xl h-[92vh] max-h-[820px] rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* ─── 1. Header con banner de modo demostración ─── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-900/90 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="simulation-title"
                  className="text-sm sm:text-base font-bold text-slate-900 dark:text-white"
                >
                  Seguimiento de Técnico en Ruta
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-orange-500 text-white shadow-2xs">
                  <Sparkles className="h-3 w-3" />
                  Modo demostración · Seguimiento simulado
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate max-w-xl">
                {orderNumber} · {clientName} — {clientAddress}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Estado real OT: EN_RUTA
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-gray-300">
                  <UserCheck className="h-3 w-3 text-slate-400" />
                  <span>Técnico asignado: <strong>{technicianName}</strong></span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Cerrar visor de simulación"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ─── 2. Cuerpo: Mapa Leaflet interactivo ─── */}
        <div className="relative flex-1 w-full bg-slate-100 dark:bg-gray-950 overflow-hidden">
          {isLoadingRoute ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-xs">
              <RefreshCw className="h-8 w-8 text-orange-500 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">
                Calculando ruta vial por calles de Santiago con OSRM…
              </p>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                Trazando geometría real desde Providencia hacia el cliente
              </p>
            </div>
          ) : routeError ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-gray-200">
                {destinationCoords ? "No se pudo trazar la ruta" : "Coordenadas no disponibles"}
              </p>
              <p className="text-xs text-slate-500 dark:text-gray-400 max-w-md mt-1 mb-4">
                {routeError}
              </p>
              {destinationCoords && (
                <button
                  type="button"
                  onClick={handleRetryRoute}
                  className="px-4 py-2 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors cursor-pointer"
                >
                  Reintentar cálculo de ruta
                </button>
              )}
            </div>
          ) : (
            <>
              <MapContainer
                center={[DEMO_ORIGIN.lat, DEMO_ORIGIN.lng]}
                zoom={13}
                style={{ height: "100%", width: "100%", background: isDark ? "#0f172a" : "#f1f5f9" }}
                scrollWheelZoom={true}
                attributionControl={true}
              >
                <TileLayer
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
                />
                <RouteBoundsFitter points={routeData?.coordinates || []} />

                {/* 1. Borde oscuro de la ruta vial */}
                {routeData?.coordinates && (
                  <Polyline
                    positions={routeData.coordinates}
                    pathOptions={{
                      color: isDark ? "#030712" : "#0f172a",
                      weight: 8,
                      opacity: 0.85,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  />
                )}

                {/* 2. Núcleo naranja brillante de la ruta */}
                {routeData?.coordinates && (
                  <Polyline
                    positions={routeData.coordinates}
                    pathOptions={{
                      color: "#f97316",
                      weight: 4.5,
                      opacity: 1,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  />
                )}

                {/* 3. Rastro verde de avance completado */}
                {traveledSegment.length > 1 && (
                  <Polyline
                    positions={traveledSegment}
                    pathOptions={{
                      color: "#10b981",
                      weight: 4.5,
                      opacity: 0.95,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  />
                )}

                {/* Marcador Origen: Base ATLAS */}
                <Marker position={[DEMO_ORIGIN.lat, DEMO_ORIGIN.lng]} icon={makeOriginIcon(L)}>
                  <Popup>
                    <div className="text-xs">
                      <strong className="block text-slate-900 font-bold">{DEMO_ORIGIN.label}</strong>
                      <span className="text-slate-500">{DEMO_ORIGIN.address}</span>
                      <span className="mt-1 block text-[10px] text-orange-600 font-semibold">
                        Punto de salida del especialista
                      </span>
                    </div>
                  </Popup>
                </Marker>

                {/* Marcador Destino: Cliente de la OT */}
                {destinationCoords && (
                  <Marker
                    position={[destinationCoords.lat, destinationCoords.lng]}
                    icon={makeDestinationIcon("#f97316", L)}
                  >
                    <Popup>
                      <div className="text-xs">
                        <strong className="block text-slate-900 font-bold">Destino: {clientName}</strong>
                        <span className="text-slate-500">{clientAddress}</span>
                        <span className="mt-1 block text-[10px] text-slate-600 font-medium">
                          Orden #{orderNumber}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Marcador Móvil: Vehículo simulado */}
                <Marker
                  position={currentCoord}
                  icon={makeVehicleIcon(vehicleBearing, !isArrived, isArrived, L)}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong className="block text-slate-900 font-bold">Móvil Técnico · Simulación</strong>
                      <span className="text-slate-600 block">
                        {isArrived
                          ? "Simulación finalizada · Pendiente de confirmación de llegada del técnico"
                          : "En desplazamiento continuo asistido por OSRM (Demo)"}
                      </span>
                      <span className="text-[10px] text-orange-600 font-semibold block mt-1">
                        Especialista: {technicianName}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>

              {/* Insignia flotante de aviso sobre el mapa */}
              {routeData?.isFallback && (
                <div className="absolute top-3 left-3 z-[400] rounded-lg bg-amber-500/90 text-white px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-xs flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Ruta de respaldo precargada (Modo presentación offline)</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── 3. Barra de Telemetría en Tiempo Real ─── */}
        <div className="border-t border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shrink-0 space-y-3">
          {/* Tarjetas de telemetría */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Estado del Móvil */}
            <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-800/50 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Estado</span>
                <Navigation className="h-3.5 w-3.5 text-orange-500" />
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    isArrived ? "bg-emerald-500" : "bg-orange-500 animate-ping"
                  }`}
                />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {isArrived ? "Simulación finalizada" : "En desplazamiento"}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-gray-400 truncate mt-0.5">
                {isArrived ? "Pendiente de confirmación de llegada del técnico" : "En ruta hacia el domicilio"}
              </span>
            </div>

            {/* Distancia restante */}
            <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-800/50 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Distancia</span>
                <MapPin className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="mt-1">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  {isArrived ? "0 m" : formatDistance(remainingDistanceMeters)}
                </span>
                <span className="text-[10px] text-slate-400 ml-1">restantes</span>
              </div>
            </div>

            {/* Tiempo restante del ciclo de 3 minutos */}
            <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-800/50 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Tiempo restante</span>
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="mt-1">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  {isArrived ? "0:00 min" : formatCountdown(remainingSeconds)}
                </span>
                <span className="text-[10px] text-slate-400 ml-1">
                  {isArrived ? "cumplidos" : `de ${SIMULATION_DURATION_SECONDS}s`}
                </span>
              </div>
            </div>

            {/* Progreso del recorrido */}
            <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-800/50 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Progreso</span>
                <Gauge className="h-3.5 w-3.5 text-purple-500" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  {progressPercent}%
                </span>
                <span className="text-[10px] text-slate-400">
                  {snapshot?.currentIndex ? snapshot.currentIndex + 1 : 1}/{routePoints.length || 1}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de progreso animada */}
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                isArrived ? "bg-emerald-500" : "bg-orange-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* ─── 4. Barra Informativa y Cierre del Visor ─── */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 text-xs font-semibold border border-slate-200 dark:border-gray-700">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isArrived ? "bg-emerald-500" : "bg-orange-500 animate-pulse"
                  }`}
                />
                <span>
                  {isArrived
                    ? "Simulación finalizada · Pendiente de confirmación de llegada del técnico"
                    : "Seguimiento automático activo · Duración fija 3 min"}
                </span>
              </div>

              {trackingRecord?.isInitialLoad && (
                <span className="text-[11px] text-slate-400 dark:text-gray-500 hidden sm:inline">
                  (Sincronizado con la sesión local)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Botón Repetir demo cuando ha finalizado */}
              {isArrived && (
                <button
                  type="button"
                  onClick={() => {
                    if (orderId) {
                      restartTracking(orderId);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Repetir demo</span>
                </button>
              )}

              <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-gray-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Simulación en frontend · Sin alterar base de datos</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-750 text-slate-700 dark:text-gray-200 transition-colors cursor-pointer border border-slate-200 dark:border-gray-700"
              >
                <span>Cerrar visor</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN PRINCIPAL PROTEGIDA CON ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════════════════════════
export default function RouteSimulationModal(props) {
  return (
    <SimulationErrorBoundary onClose={props.onClose}>
      <RouteSimulationModalInner {...props} />
    </SimulationErrorBoundary>
  );
}
