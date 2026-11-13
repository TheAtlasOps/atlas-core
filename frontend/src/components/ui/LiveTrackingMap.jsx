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
  const hasFittedRef = useRef(false);

  useEffect(() => {
    const pts = points && points.length >= 2 ? points : fallbackPoints;
    if (!pts || pts.length < 2) return;
    if (hasFittedRef.current) return;

    try {
      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
      hasFittedRef.current = true;
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

  // 3. Inicio del seguimiento simulado V2 si no es GPS en vivo y está activo
  useEffect(() => {
    if (!isLiveGps && isDemoActive && safeOrderId && destinationCoords) {
      if (!getTracking(safeOrderId)) {
        startTracking(
          order || {
            id: safeOrderId,
            order_id: safeOrderId,
            order_number: order?.order_number || safeOrderId,
            client: order?.client || "Cliente",
            address: address || order?.address || "Dirección en Santiago",
            technician: technicianName || order?.technician || "Especialista en terreno",
            lat: destinationCoords.lat,
            lng: destinationCoords.lng,
          }
        );
      }
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
    if (destinationCoords) {
      pts.push([DEMO_ORIGIN.lat, DEMO_ORIGIN.lng]);
      pts.push([destinationCoords.lat, destinationCoords.lng]);
    } else if (clientPos) {
      pts.push(clientPos);
    }
    if (techPos) {
      pts.push(techPos);
    }
    return pts;
  }, [destinationCoords, clientPos, techPos]);

  // Telemetría según modo GPS real o Simulación V2
  const isSimulated = !isLiveGps;
  const currentCoord = isLiveGps
    ? techPos || (destinationCoords ? [destinationCoords.lat, destinationCoords.lng] : null)
    : snapshot?.currentCoord || (destinationCoords ? [DEMO_ORIGIN.lat, DEMO_ORIGIN.lng] : null);

  const vehicleBearing = isLiveGps ? 0 : snapshot?.bearing || 0;
  const isArrived = isLiveGps ? false : Boolean(snapshot?.isArrived);
  const progressPercent = isLiveGps ? 0 : snapshot?.progressPercent || 0;
  const remainingSeconds = isLiveGps ? 0 : snapshot?.remainingSeconds || 0;
  const remainingDistanceMeters = isLiveGps ? 0 : snapshot?.remainingDistanceMeters || 0;
  const traveledSegment = isLiveGps ? [] : snapshot?.traveledSegment || [];
  const pendingSegment = isLiveGps ? [] : snapshot?.pendingSegment || [];

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ── BARRA SUPERIOR DE ESTADO Y TELEMETRÍA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-100/90 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700/80 text-xs">
        <div className="flex items-center gap-2">
          {isLiveGps ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              GPS en Vivo · Satelital
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30">
              <Sparkles className="h-3 w-3 text-orange-500" />
              Modo Demostración · Seguimiento V2
            </span>
          )}

          <span className="text-[11px] text-slate-500 dark:text-gray-400 truncate max-w-[200px] sm:max-w-none">
            {isLiveGps
              ? "Ubicación reportada por antena GPS del especialista"
              : "Recorrido determinista por calles de Santiago (OSRM)"}
          </span>
        </div>

        {/* Acciones interactivas del mapa */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setFollowVehicle((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
              followVehicle
                ? "bg-orange-500 text-white shadow-2xs"
                : "bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-600 hover:bg-slate-50"
            }`}
            title="Activar o desactivar seguimiento automático de cámara"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            <span>{followVehicle ? "Siguiendo móvil" : "Seguir móvil"}</span>
          </button>

          <button
            type="button"
            onClick={() => setTriggerFitRoute(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            title="Ajustar zoom para ver origen y destino"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ver ruta</span>
          </button>

          {isSimulated && (
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 hover:bg-orange-100 transition-colors cursor-pointer"
              title="Reiniciar simulación desde la base ATLAS"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Repetir</span>
            </button>
          )}
        </div>
      </div>

      {/* ── TARJETA DE PROGRESO Y ESTIMACIONES (MODO DEMOSTRACIÓN V2) ── */}
      {isSimulated && snapshot && (
        <div className="p-3.5 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 shadow-2xs flex flex-col gap-2.5 transition-colors">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">
                {isArrived ? "Especialista en destino" : "En camino al domicilio"}
              </span>
              <span className="text-[11px] font-mono text-orange-600 dark:text-orange-400 font-bold">
                {progressPercent}%
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3 text-orange-500" />
                <strong>{formatCountdown(remainingSeconds)}</strong>
              </span>
              <span className="inline-flex items-center gap-1">
                <Navigation className="h-3 w-3 text-slate-400" />
                <span>{formatDistance(remainingDistanceMeters)}</span>
              </span>
            </div>
          </div>

          {/* Barra de progreso visual continua */}
          <div className="w-full bg-slate-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ${
                isArrived ? "bg-emerald-500" : "bg-orange-500"
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
                <div className="text-xs font-sans">
                  <strong className="block text-slate-900 font-bold">{DEMO_ORIGIN.label}</strong>
                  <span className="text-slate-500">{DEMO_ORIGIN.address}</span>
                  <span className="mt-1 block text-[10px] text-orange-600 font-semibold">
                    Punto de salida del especialista
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
                <div className="text-xs font-sans">
                  <strong className="block text-slate-900 font-bold">Destino del Servicio</strong>
                  <span className="text-slate-600 block">{address || "Dirección del cliente"}</span>
                  {order?.order_number && (
                    <span className="mt-1 block text-[10px] text-orange-600 font-medium">
                      Orden #{order.order_number}
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
                <div className="text-xs font-sans">
                  <strong className="block text-slate-900 font-bold">
                    {technicianName || "Especialista ATLAS"}
                  </strong>
                  <span className="text-slate-600 block">
                    {isLiveGps
                      ? "Señal GPS satelital activa"
                      : isArrived
                      ? "Llegada al destino registrada · Pendiente de atención presencial"
                      : "En camino a su domicilio (Modo Demostración)"}
                  </span>
                  <span className="text-[10px] text-orange-600 font-semibold block mt-1">
                    Móvil de servicio técnico
                  </span>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Nota legal / Transparencia de la simulación */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400 px-1">
        <div className="flex items-center gap-1.5">
          <Navigation className="h-3.5 w-3.5 text-orange-500" />
          <span>
            {isLiveGps
              ? "Actualización periódica vía telemetría móvil"
              : "Simulación de demostración · No sustituye reportes contractuales"}
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
