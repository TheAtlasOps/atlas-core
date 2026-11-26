/**
 * frontend/src/components/ui/LiveTrackingMap.jsx
 *
 * Mapa de seguimiento en tiempo real y simulación interactiva V2 para el Portal Cliente (ATLAS FSM).
 * - Reutiliza el motor centralizado V2 (routeTrackingManager.js y routeSimulation.js).
 * - Muestra la camioneta ATLAS 3D isométrica con baliza estroboscópica y orientación vial fluida.
 * - Trazado por calles de Santiago (OSRM): tramo recorrido naranja corporativo (#f97316) y pendiente gris neutro.
 * - Desacoplamiento de cámara: auto-encuadre inicial y seguimiento suave con desactivación al arrastrar (dragstart).
 * - Soporta GPS satelital verificado (GPS EN VIVO) y simulación claramente identificada como MODO DEMOSTRACIÓN.
 * - Sincronizado inter-pestañas mediante localStorage con el Dashboard de despacho.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useTheme } from "../../hooks/useTheme";
import {
  DEMO_ORIGIN,
  calculateBearing,
  calculateHaversineDistanceMeters,
  formatDistance,
  makeOriginIcon,
  makeDestinationIcon,
  makeVehicleIcon,
} from "../../lib/routeSimulation";
import {
  getSafeOrderId,
  startTracking,
  restartTracking,
  getTracking,
  retryTrackingRoute,
  formatCountdown,
  useRouteTracking,
} from "../../lib/routeTrackingManager";
import {
  Sparkles,
  Navigation,
  Clock,
  RotateCcw,
  Maximize2,
  RefreshCw,
  AlertCircle,
  LocateFixed,
} from "lucide-react";

/** Auto-encuadre inicial de la ruta completa sin bloquear interacciones posteriores */
function RouteBoundsFitter({ points, fallbackPoints }) {
  const map = useMap();
  const fittedStageRef = useRef("none");
  const userInteractedRef = useRef(false);

  useMapEvents({
    dragstart: () => {
      userInteractedRef.current = true;
    },
  });

  useEffect(() => {
    if (userInteractedRef.current) return;

    const hasRealRoute = Array.isArray(points) && points.length >= 2;
    const pts = hasRealRoute ? points : fallbackPoints;
    if (!pts || pts.length < 2) return;

    if (hasRealRoute && fittedStageRef.current === "route") return;
    if (!hasRealRoute && fittedStageRef.current !== "none") return;

    try {
      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
      fittedStageRef.current = hasRealRoute ? "route" : "fallback";
    } catch {
      // Ignorar si el contenedor no está listo en el DOM
    }
  }, [map, points, fallbackPoints]);

  return null;
}

/** Controlador suave de cámara del vehículo móvil; se desactiva si el usuario arrastra el mapa */
function VehicleCameraController({ currentCoord, followVehicle, onDisableFollow }) {
  const map = useMap();
  const isPopupOpenRef = useRef(false);
  const lastPanTimeRef = useRef(0);

  useEffect(() => {
    if (!map) return;
    const handlePopupOpen = () => {
      isPopupOpenRef.current = true;
    };
    const handlePopupClose = () => {
      isPopupOpenRef.current = false;
    };
    map.on("popupopen", handlePopupOpen);
    map.on("popupclose", handlePopupClose);
    return () => {
      map.off("popupopen", handlePopupOpen);
      map.off("popupclose", handlePopupClose);
    };
  }, [map]);

  useMapEvents({
    dragstart: () => {
      if (onDisableFollow) {
        onDisableFollow();
      }
    },
  });

  useEffect(() => {
    if (!followVehicle || !currentCoord || !map) return;
    if (isPopupOpenRef.current) return;

    const now = Date.now();
    if (now - lastPanTimeRef.current < 750) return;
    lastPanTimeRef.current = now;

    try {
      map.panTo(currentCoord, { animate: true, duration: 0.6 });
    } catch {
      // Ignorar
    }
  }, [map, currentCoord, followVehicle]);

  useEffect(() => {
    if (followVehicle) {
      lastPanTimeRef.current = 0;
    }
  }, [followVehicle]);

  return null;
}

/** Disparador manual para re-encuadrar la ruta completa a petición del usuario */
function RouteFitTrigger({ triggerFit, points, fallbackPoints, onDoneFit }) {
  const map = useMap();
  useEffect(() => {
    if (triggerFit) {
      const pts = points && points.length >= 2 ? points : fallbackPoints;
      if (pts && pts.length >= 2) {
        try {
          const bounds = L.latLngBounds(pts);
          map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
        } catch {
          // Ignorar
        }
      }
      if (onDoneFit) onDoneFit();
    }
  }, [map, triggerFit, points, fallbackPoints, onDoneFit]);
  return null;
}

export default function LiveTrackingMap({
  orderId = null,
  order = null,
  clientPos = null,
  techPos = null,
  isLiveGps = false,
  lastGpsUpdateAt = null,
  address = "",
  technicianName = "",
  isDemoActive = true,
  onRestartDemo = null,
}) {
  const { isDark } = useTheme();

  // 1. Identificador seguro de la orden
  const safeOrderId = useMemo(() => {
    return getSafeOrderId(order) || (orderId ? String(orderId) : null);
  }, [order, orderId]);

  // 2. Coordenadas de destino del cliente
  const destinationCoords = useMemo(() => {
    if (clientPos && !isNaN(clientPos[0]) && !isNaN(clientPos[1])) {
      return { lat: Number(clientPos[0]), lng: Number(clientPos[1]) };
    }
    if (order?.lat != null && order?.lng != null && !isNaN(order.lat) && !isNaN(order.lng)) {
      return { lat: Number(order.lat), lng: Number(order.lng) };
    }
    return null;
  }, [clientPos, order?.lat, order?.lng]);

  // 3. Inicio y sincronización del seguimiento simulado V2 con backend/historial
  useEffect(() => {
    if (!isLiveGps && isDemoActive && safeOrderId && destinationCoords) {
      startTracking({
        ...(order || {}),
        id: safeOrderId,
        order_id: safeOrderId,
        order_number: order?.order_number || safeOrderId,
        client: order?.client || "Cliente",
        address: address || order?.address || "Dirección en Santiago",
        technician: technicianName || order?.technician || "Especialista en terreno",
        lat: destinationCoords.lat,
        lng: destinationCoords.lng,
      });
    }
  }, [isLiveGps, isDemoActive, safeOrderId, destinationCoords, order, address, technicianName]);

  // 4. Suscripción al motor central de seguimiento V2
  const snapshot = useRouteTracking(!isLiveGps ? safeOrderId : null);
  const trackingRecord = safeOrderId ? getTracking(safeOrderId) : null;

  const [followVehicle, setFollowVehicle] = useState(true);
  const [triggerFitRoute, setTriggerFitRoute] = useState(false);

  // Manejador de reintento de cálculo OSRM
  const handleRetryRoute = useCallback(() => {
    if (safeOrderId) {
      retryTrackingRoute(safeOrderId);
    }
  }, [safeOrderId]);

  // Manejador para reiniciar la simulación
  const handleRestart = useCallback(() => {
    if (safeOrderId) {
      restartTracking(safeOrderId);
      setFollowVehicle(true);
      if (onRestartDemo) onRestartDemo();
    }
  }, [safeOrderId, onRestartDemo]);

  const isLoadingRoute = Boolean(trackingRecord?.isLoadingRoute && !isLiveGps);
  const routeError = !destinationCoords
    ? "La orden no cuenta con coordenadas de destino válidas."
    : trackingRecord?.routeError;

  const routeData = trackingRecord?.routeData;
  const routePoints = routeData?.coordinates || [];

  // Puntos de encuadre de respaldo
  const fallbackPoints = useMemo(() => {
    const pts = [];
    if (!isLiveGps && destinationCoords) {
      pts.push([DEMO_ORIGIN.lat, DEMO_ORIGIN.lng]);
      pts.push([destinationCoords.lat, destinationCoords.lng]);
    } else if (destinationCoords) {
      pts.push([destinationCoords.lat, destinationCoords.lng]);
    } else if (clientPos) {
      pts.push(clientPos);
    }
    if (techPos) {
      pts.push(techPos);
    }
    return pts;
  }, [isLiveGps, destinationCoords, clientPos, techPos]);

  // Telemetría según modo GPS real o Simulación V2
  const isSimulated = !isLiveGps;
  const currentCoord = useMemo(() => {
    if (isLiveGps) {
      return techPos || (destinationCoords ? [destinationCoords.lat, destinationCoords.lng] : null);
    }
    return (
      snapshot?.currentCoord || (destinationCoords ? [DEMO_ORIGIN.lat, DEMO_ORIGIN.lng] : null)
    );
  }, [isLiveGps, techPos, destinationCoords, snapshot?.currentCoord]);

  const liveDistanceMeters = useMemo(() => {
    if (!isLiveGps || !currentCoord || !destinationCoords) return 0;
    return calculateHaversineDistanceMeters(
      { lat: currentCoord[0], lng: currentCoord[1] },
      destinationCoords
    );
  }, [isLiveGps, currentCoord, destinationCoords]);

  const liveTotalReferenceMeters = useMemo(() => {
    if (!isLiveGps || !destinationCoords) return 1;
    const baseDist = calculateHaversineDistanceMeters(DEMO_ORIGIN, destinationCoords);
    return Math.max(liveDistanceMeters, baseDist || 1);
  }, [isLiveGps, destinationCoords, liveDistanceMeters]);

  const liveProgressPercent = isLiveGps
    ? liveDistanceMeters <= 80
      ? 100
      : Math.max(
          5,
          Math.min(99, Math.round((1 - liveDistanceMeters / liveTotalReferenceMeters) * 100))
        )
    : 0;

  const liveEtaMinutes =
    isLiveGps && liveDistanceMeters > 80 ? Math.max(1, Math.round(liveDistanceMeters / 500)) : 0;

  const vehicleBearing = isLiveGps
    ? currentCoord && destinationCoords
      ? calculateBearing(currentCoord, [destinationCoords.lat, destinationCoords.lng])
      : 0
    : snapshot?.bearing || 0;
  const isArrived = isLiveGps ? liveDistanceMeters <= 80 : Boolean(snapshot?.isArrived);
  const progressPercent = isLiveGps ? liveProgressPercent : snapshot?.progressPercent || 0;
  const remainingSeconds = isLiveGps ? liveEtaMinutes * 60 : snapshot?.remainingSeconds || 0;
  const remainingDistanceMeters = isLiveGps
    ? liveDistanceMeters
    : snapshot?.remainingDistanceMeters || 0;
  const traveledSegment = isLiveGps ? [] : snapshot?.traveledSegment || [];
  const pendingSegment = isLiveGps ? [] : snapshot?.pendingSegment || [];
  const hasTelemetry =
    (isSimulated && Boolean(snapshot)) || (isLiveGps && Boolean(currentCoord && destinationCoords));

  const liveRouteLine = useMemo(() => {
    if (!isLiveGps || !currentCoord || !destinationCoords) return [];
    return [currentCoord, [destinationCoords.lat, destinationCoords.lng]];
  }, [isLiveGps, currentCoord, destinationCoords]);

  const handleFitFullRoute = useCallback(() => {
    setFollowVehicle(false);
    setTriggerFitRoute(true);
  }, []);

  const handleToggleFollowVehicle = useCallback(() => {
    setFollowVehicle((prev) => !prev);
  }, []);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ── BARRA SUPERIOR DE ESTADO Y CONTROLES ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-100/90 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700/80 text-xs">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {isLiveGps ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              GPS en Vivo · Satelital
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30 shrink-0">
              <Sparkles className="h-3 w-3 text-orange-500" />
              Modo Demostración · Seguimiento V2
            </span>
          )}

          <span className="text-[11px] text-slate-600 dark:text-gray-300 leading-snug">
            {isLiveGps
              ? "Telemetría real del dispositivo del especialista"
              : "Recorrido simulado de 3 min por calles de Santiago (OSRM)"}
          </span>
        </div>

        {/* Acciones interactivas del mapa (siempre visibles y adaptables en móvil) */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-start sm:justify-end shrink-0">
          <button
            type="button"
            onClick={handleToggleFollowVehicle}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
              followVehicle
                ? "bg-orange-500 text-white shadow-2xs"
                : "bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600"
            }`}
            title="Activar o desactivar seguimiento automático de cámara"
          >
            <LocateFixed className="h-3.5 w-3.5 shrink-0" />
            <span>{followVehicle ? "Siguiendo vehículo" : "Seguir vehículo"}</span>
          </button>

          <button
            type="button"
            onClick={handleFitFullRoute}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors cursor-pointer shrink-0"
            title="Ajustar zoom para ver origen, vehículo y destino"
          >
            <Maximize2 className="h-3.5 w-3.5 shrink-0" />
            <span>Ver ruta completa</span>
          </button>

          {isSimulated && (
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors cursor-pointer shrink-0"
              title="Reiniciar simulación desde la base ATLAS"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span>Repetir</span>
            </button>
          )}
        </div>
      </div>

      {/* ── TARJETA DE PROGRESO Y TELEMETRÍA ── */}
      {hasTelemetry && (
        <div className="p-3.5 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 shadow-2xs flex flex-col gap-2.5 transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="font-semibold text-slate-900 dark:text-white">
                {isLiveGps
                  ? isArrived
                    ? "Especialista próximo al domicilio"
                    : "Especialista en ruta (GPS real)"
                  : isArrived
                  ? "Especialista en destino"
                  : "En camino al domicilio"}
              </span>
              <span
                className={`text-[11px] font-mono font-bold ${
                  isLiveGps
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-orange-600 dark:text-orange-400"
                }`}
              >
                {progressPercent}%
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 font-medium">
                {isLiveGps ? "Señal real" : "Demostración"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-gray-300">
              <span className="inline-flex items-center gap-1">
                <Clock className={`h-3.5 w-3.5 ${isLiveGps ? "text-emerald-500" : "text-orange-500"}`} />
                <strong>
                  {isLiveGps
                    ? isArrived
                      ? "< 1 min"
                      : `~${liveEtaMinutes} min`
                    : formatCountdown(remainingSeconds)}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1">
                <Navigation className="h-3.5 w-3.5 text-slate-400 dark:text-gray-500" />
                <span>{formatDistance(remainingDistanceMeters)}</span>
              </span>
            </div>
          </div>

          {/* Barra de progreso visual continua */}
          <div className="w-full bg-slate-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ${
                isArrived || isLiveGps ? "bg-emerald-500" : "bg-orange-500"
              }`}
              style={{ width: `${Math.max(2, Math.min(100, progressPercent))}%` }}
            />
          </div>
        </div>
      )}

      {/* ── CONTENEDOR PRINCIPAL DEL MAPA LEAFLET ── */}
      <div className="h-72 sm:h-84 md:h-96 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-gray-800 relative z-0 shadow-xs">
        {isLoadingRoute ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/85 dark:bg-gray-900/85 backdrop-blur-xs p-4 text-center">
            <RefreshCw className="h-7 w-7 text-orange-500 animate-spin mb-2" />
            <p className="text-xs font-semibold text-slate-800 dark:text-gray-200">
              Trazando ruta vial por calles de Santiago con OSRM…
            </p>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
              Conectando Base Providencia con el domicilio del cliente
            </p>
          </div>
        ) : routeError && !isLiveGps ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center bg-white/90 dark:bg-gray-900/90">
            <AlertCircle className="h-8 w-8 text-rose-500 mb-2" />
            <p className="text-xs font-bold text-slate-800 dark:text-gray-200">
              Aviso de cartografía
            </p>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 max-w-sm mt-0.5 mb-3">
              {routeError}
            </p>
            {destinationCoords && (
              <button
                type="button"
                onClick={handleRetryRoute}
                className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors cursor-pointer"
              >
                Reintentar cálculo de ruta
              </button>
            )}
          </div>
        ) : null}

        <MapContainer
          center={currentCoord || (destinationCoords ? [destinationCoords.lat, destinationCoords.lng] : [-33.4489, -70.6693])}
          zoom={14}
          style={{ height: "100%", width: "100%", background: isDark ? "#0f172a" : "#f1f5f9" }}
          scrollWheelZoom={true}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Auto-encuadre inicial suave sin bloquear zoom posterior */}
          <RouteBoundsFitter
            points={routePoints}
            fallbackPoints={fallbackPoints}
          />

          {/* Controlador de seguimiento suave de la camioneta */}
          <VehicleCameraController
            currentCoord={currentCoord}
            followVehicle={followVehicle}
            onDisableFollow={() => setFollowVehicle(false)}
          />

          {/* Gatillador manual de re-encuadre de ruta */}
          <RouteFitTrigger
            triggerFit={triggerFitRoute}
            points={routePoints}
            fallbackPoints={fallbackPoints}
            onDoneFit={() => setTriggerFitRoute(false)}
          />

          {/* 0. Ruta completa de referencia (simulada o GPS real) */}
          {isSimulated && routePoints.length > 1 && (
            <Polyline
              positions={routePoints}
              pathOptions={{
                color: isDark ? "#334155" : "#cbd5e1",
                weight: 5,
                opacity: 0.45,
                lineCap: "round",
                lineJoin: "round",
                interactive: false,
              }}
            />
          )}

          {isLiveGps && liveRouteLine.length > 1 && (
            <Polyline
              positions={liveRouteLine}
              pathOptions={{
                color: "#10b981",
                weight: 3.5,
                opacity: 0.8,
                dashArray: "6 8",
                lineCap: "round",
                lineJoin: "round",
                interactive: false,
              }}
            />
          )}

          {/* 1. Tramo pendiente: gris neutro sutil interactivo false */}
          {pendingSegment.length > 1 && (
            <Polyline
              positions={pendingSegment}
              pathOptions={{
                color: isDark ? "#475569" : "#94a3b8",
                weight: 3.5,
                opacity: 0.85,
                lineCap: "round",
                lineJoin: "round",
                interactive: false,
              }}
            />
          )}

          {/* 2. Tramo recorrido: naranja corporativo ATLAS (#f97316) */}
          {traveledSegment.length > 1 && (
            <Polyline
              positions={traveledSegment}
              pathOptions={{
                color: "#f97316",
                weight: 4,
                opacity: 1,
                lineCap: "round",
                lineJoin: "round",
                interactive: false,
              }}
            />
          )}

          {/* Marcador Origen: Base ATLAS (solo visible en modo simulación V2) */}
          {isSimulated && (
            <Marker position={[DEMO_ORIGIN.lat, DEMO_ORIGIN.lng]} icon={makeOriginIcon(L)}>
              <Popup>
                <div className="text-xs font-sans min-w-[170px] max-w-[230px] leading-relaxed">
                  <strong className="block text-slate-900 dark:text-white font-bold">
                    {DEMO_ORIGIN.label}
                  </strong>
                  <span className="text-slate-600 dark:text-gray-300 block">
                    {DEMO_ORIGIN.address}
                  </span>
                  <span className="mt-1 block text-[10px] text-orange-600 dark:text-orange-400 font-semibold">
                    Punto de salida (Modo Demostración)
                  </span>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Marcador Destino: Domicilio del Cliente */}
          {destinationCoords && (
            <Marker
              position={[destinationCoords.lat, destinationCoords.lng]}
              icon={makeDestinationIcon("#f97316", L)}
            >
              <Popup>
                <div className="text-xs font-sans min-w-[170px] max-w-[230px] leading-relaxed">
                  <strong className="block text-slate-900 dark:text-white font-bold">
                    Destino del Servicio
                  </strong>
                  <span className="text-slate-600 dark:text-gray-300 block">
                    {address || "Dirección del cliente"}
                  </span>
                  {order?.order_number && (
                    <span className="mt-1 block text-[10px] text-orange-600 dark:text-orange-400 font-semibold">
                      Orden {String(order.order_number).startsWith("#") ? order.order_number : `#${order.order_number}`}
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Marcador Móvil: Camioneta ATLAS 3D isométrica con baliza y orientación */}
          {currentCoord && (
            <Marker
              position={currentCoord}
              icon={makeVehicleIcon(vehicleBearing, !isArrived, isArrived, L)}
            >
              <Popup>
                <div className="text-xs font-sans min-w-[175px] max-w-[240px] leading-relaxed">
                  <strong className="block text-slate-900 dark:text-white font-bold">
                    {technicianName || "Especialista ATLAS"}
                  </strong>
                  <span className="text-slate-600 dark:text-gray-300 block mt-0.5">
                    {isLiveGps
                      ? isArrived
                        ? "GPS en Vivo · Especialista próximo al domicilio"
                        : "GPS en Vivo · Móvil transmitiendo señal real"
                      : isArrived
                      ? "Llegada registrada · Pendiente de atención presencial"
                      : "En camino a su domicilio (Modo Demostración · 3 min)"}
                  </span>
                  <span
                    className={`text-[10px] font-semibold block mt-1 ${
                      isLiveGps
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-orange-600 dark:text-orange-400"
                    }`}
                  >
                    {isLiveGps ? "Telemetría GPS satelital" : "Móvil de servicio técnico"}
                  </span>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Nota legal / Transparencia de la simulación vs GPS real */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-gray-400 px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Navigation className={`h-3.5 w-3.5 shrink-0 ${isLiveGps ? "text-emerald-500" : "text-orange-500"}`} />
          <span>
            {isLiveGps
              ? lastGpsUpdateAt
                ? "GPS en Vivo · Actualización periódica vía telemetría móvil"
                : "GPS en Vivo · Señal satelital activa"
              : "Modo Demostración (3 min) · Sincronizado con inicio de ruta"}
          </span>
        </div>
        {technicianName && (
          <span className="font-medium text-slate-700 dark:text-gray-300">
            {technicianName}
          </span>
        )}
      </div>
    </div>
  );
}
