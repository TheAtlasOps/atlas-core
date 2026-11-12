import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Navigation,
  MapPin,
  Clock,
  Gauge,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Zap,
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
  fetchStreetRoute,
  calculateBearing,
  formatDistance,
  formatEta,
} from "../../lib/routeSimulation";
import { extractOrderCoordinates } from "../../lib/mapClustering";

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

// ─── Iconos Leaflet personalizados de alta definición ────────────────────────
function makeOriginIcon() {
  return L.divIcon({
    className: "atlas-sim-origin-icon",
    html: `
      <div style="
        position: relative;
        width: 34px; height: 34px; border-radius: 10px;
        background: #0f172a; border: 2px solid #38bdf8;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.6);
        display: flex; align-items: center; justify-content: center;
        color: #38bdf8; font-size: 16px;
      ">
        🏢
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function makeDestinationIcon(color = "#f97316") {
  return L.divIcon({
    className: "atlas-sim-dest-icon",
    html: `
      <div style="
        position: relative;
        width: 36px; height: 36px; border-radius: 9999px;
        background: #0f172a; border: 2.5px solid ${color};
        box-shadow: 0 6px 14px rgba(249, 115, 22, 0.45);
        display: flex; align-items: center; justify-content: center;
        color: #ffffff; font-size: 17px;
      ">
        📍
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function makeVehicleIcon(bearing = 0, isMoving = false, isArrived = false) {
  const pulseHtml = isMoving
    ? `<span style="
        position: absolute; inset: -6px; border-radius: 9999px;
        border: 2px solid #f97316; opacity: 0.75;
        animation: atlasPing 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></span>`
    : "";

  const borderColor = isArrived ? "#10b981" : "#f97316";
  const iconSymbol = isArrived ? "✅" : "🚐";

  return L.divIcon({
    className: "atlas-sim-vehicle-icon",
    html: `
      <div style="
        position: relative;
        width: 42px; height: 42px; border-radius: 9999px;
        background: #0f172a; border: 3px solid ${borderColor};
        box-shadow: 0 6px 16px rgba(249, 115, 22, 0.55);
        display: flex; align-items: center; justify-content: center;
        transform: rotate(${Math.round(bearing)}deg);
        transition: transform 0.18s ease-out;
      ">
        ${pulseHtml}
        <span style="
          font-size: 20px;
          transform: rotate(-${Math.round(bearing)}deg);
          display: inline-block;
        ">${iconSymbol}</span>
      </div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -22],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: Modal de Simulación de Ruta
// ═══════════════════════════════════════════════════════════════════════════════
export default function RouteSimulationModal({ order, onClose }) {
  const { isDark } = useTheme();

  // Coordenadas del destino
  const destinationCoords = useMemo(() => {
    if (!order) return null;
    const { lat, lng, isValid } = extractOrderCoordinates(order);
    if (isValid) return { lat, lng };

    // Si la orden no tiene coordenadas válidas, no usar destino ficticio
    return null;
  }, [order]);

  // Estado de ruta
  const [routeData, setRouteData] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [routeError, setRouteError] = useState(null);

  // Estado de la simulación
  const [simStatus, setSimStatus] = useState("PREPARADO"); // "PREPARADO" | "EN_RUTA" | "PAUSADO" | "LLEGADA_AL_SITIO"
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(2); // 1x, 2x, 4x

  // Animación loop ref
  const animFrameRef = useRef(null);
  const lastTickTimeRef = useRef(null);

  // Cargar ruta al abrir modal
  const loadRoute = useCallback(async () => {
    if (!destinationCoords) {
      setRouteError(
        "Esta orden de trabajo no cuenta con coordenadas geográficas registradas. No es posible iniciar la simulación de ruta sin un destino válido."
      );
      setIsLoadingRoute(false);
      return;
    }

    setIsLoadingRoute(true);
    setRouteError(null);
    setSimStatus("PREPARADO");
    setCurrentIndex(0);

    try {
      const data = await fetchStreetRoute(DEMO_ORIGIN, destinationCoords, {
        timeoutMs: 4000,
      });
      setRouteData(data);
    } catch (err) {
      setRouteError(err.message || "Error al calcular la ruta por calles.");
    } finally {
      setIsLoadingRoute(false);
    }
  }, [destinationCoords]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  // Vértices de la ruta interpolada memoizados
  const routePoints = useMemo(
    () => routeData?.interpolatedCoordinates || [],
    [routeData]
  );
  const totalSteps = routePoints.length;

  // Posición actual del vehículo
  const currentCoord = useMemo(() => {
    if (totalSteps === 0) return [DEMO_ORIGIN.lat, DEMO_ORIGIN.lng];
    const safeIndex = Math.min(Math.max(0, currentIndex), totalSteps - 1);
    return routePoints[safeIndex] || [DEMO_ORIGIN.lat, DEMO_ORIGIN.lng];
  }, [routePoints, currentIndex, totalSteps]);

  // Rumbo / orientación hacia el siguiente punto
  const vehicleBearing = useMemo(() => {
    if (totalSteps < 2) return 0;
    const targetIdx = Math.min(currentIndex + 3, totalSteps - 1);
    const startPt = routePoints[currentIndex];
    const endPt = routePoints[targetIdx];
    return calculateBearing(startPt, endPt);
  }, [routePoints, currentIndex, totalSteps]);

  // Segmento ya recorrido (para pintar rastro verde)
  const traveledSegment = useMemo(() => {
    if (totalSteps === 0 || currentIndex === 0) return [];
    return routePoints.slice(0, currentIndex + 1);
  }, [routePoints, currentIndex, totalSteps]);

  // Métricas dinámicas calculadas a partir del avance
  const progressPercent = useMemo(() => {
    if (totalSteps <= 1) return 0;
    return Math.min(100, Math.round((currentIndex / (totalSteps - 1)) * 100));
  }, [currentIndex, totalSteps]);

  const remainingDistanceMeters = useMemo(() => {
    if (!routeData) return 0;
    const ratio = Math.max(0, 1 - currentIndex / Math.max(1, totalSteps - 1));
    return Math.round(routeData.distanceMeters * ratio);
  }, [routeData, currentIndex, totalSteps]);

  const remainingSeconds = useMemo(() => {
    if (!routeData) return 0;
    const ratio = Math.max(0, 1 - currentIndex / Math.max(1, totalSteps - 1));
    return Math.round(routeData.durationSeconds * ratio);
  }, [routeData, currentIndex, totalSteps]);

  // ─── Loop de animación controlado por requestAnimationFrame ─────────────────
  useEffect(() => {
    if (simStatus !== "EN_RUTA") {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTickTimeRef.current = null;
      return;
    }

    // Intervalo de avance por paso en ms (ajustado según velocidad)
    // totalSteps ~260. A 1x queremos ~26 segundos total (100ms por paso)
    // A 2x queremos ~13 segundos (50ms por paso)
    // A 4x queremos ~6.5 segundos (25ms por paso)
    const stepIntervalMs = Math.max(20, Math.round(75 / speedMultiplier));

    const loop = (timestamp) => {
      if (!lastTickTimeRef.current) {
        lastTickTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastTickTimeRef.current;

      if (elapsed >= stepIntervalMs) {
        const stepsToAdvance = Math.max(1, Math.floor(elapsed / stepIntervalMs));
        lastTickTimeRef.current = timestamp;

        setCurrentIndex((prev) => {
          const next = prev + stepsToAdvance;
          if (next >= totalSteps - 1) {
            setSimStatus("LLEGADA_AL_SITIO");
            return totalSteps - 1;
          }
          return next;
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [simStatus, speedMultiplier, totalSteps]);

  // ─── Controladores de usuario ──────────────────────────────────────────────
  function handlePlayPause() {
    if (!routeData || !destinationCoords) return;
    if (simStatus === "EN_RUTA") {
      setSimStatus("PAUSADO");
    } else if (simStatus === "LLEGADA_AL_SITIO") {
      setCurrentIndex(0);
      setSimStatus("EN_RUTA");
    } else {
      setSimStatus("EN_RUTA");
    }
  }

  function handleReset() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setCurrentIndex(0);
    setSimStatus("PREPARADO");
  }

  // Cerrar modal y limpiar animación
  const handleClose = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    onClose();
  };

  // Etiqueta visual de estado
  const statusMeta = useMemo(() => {
    switch (simStatus) {
      case "PREPARADO":
        return {
          label: "Vehículo en base",
          sublabel: "Listo para iniciar recorrido",
          badgeClass: "bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300 border-slate-300 dark:border-gray-700",
          dotColor: "bg-slate-400",
        };
      case "EN_RUTA":
        return {
          label: "En ruta hacia el domicilio",
          sublabel: "Desplazándose por vías habilitadas",
          badgeClass: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-300 dark:border-orange-800",
          dotColor: "bg-orange-500 animate-ping",
        };
      case "PAUSADO":
        return {
          label: "Simulación pausada",
          sublabel: "Telemetría detenida",
          badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300 dark:border-amber-800",
          dotColor: "bg-amber-500",
        };
      case "LLEGADA_AL_SITIO":
        return {
          label: "Llegada al sitio",
          sublabel: "Vehículo en domicilio del cliente",
          badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800",
          dotColor: "bg-emerald-500",
        };
      default:
        return {
          label: simStatus,
          sublabel: "",
          badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
          dotColor: "bg-slate-400",
        };
    }
  }, [simStatus]);

  if (!order) return null;

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
                  Modo demostración · Recorrido simulado
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-gray-400">
                {order.orderNumber || order.id} · {order.client || "Cliente"} — {order.address || "Dirección sin especificar"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Cerrar modal de simulación"
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
                Trazando geometría real desde Providencia hasta el destino
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
                  onClick={loadRoute}
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
                <Marker position={[DEMO_ORIGIN.lat, DEMO_ORIGIN.lng]} icon={makeOriginIcon()}>
                  <Popup>
                    <div className="text-xs">
                      <strong className="block text-slate-900 font-bold">{DEMO_ORIGIN.label}</strong>
                      <span className="text-slate-500">{DEMO_ORIGIN.address}</span>
                      <span className="mt-1 block text-[10px] text-orange-600 font-semibold">Punto de salida del especialista</span>
                    </div>
                  </Popup>
                </Marker>

                {/* Marcador Destino: Cliente de la OT */}
                {destinationCoords && (
                  <Marker
                    position={[destinationCoords.lat, destinationCoords.lng]}
                    icon={makeDestinationIcon()}
                  >
                    <Popup>
                      <div className="text-xs">
                        <strong className="block text-slate-900 font-bold">Destino: {order.client || "Cliente"}</strong>
                        <span className="text-slate-500">{order.address}</span>
                        <span className="mt-1 block text-[10px] text-slate-600 font-medium">
                          Orden #{order.orderNumber || order.id}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Marcador Móvil: Vehículo simulado */}
                <Marker
                  position={currentCoord}
                  icon={makeVehicleIcon(vehicleBearing, simStatus === "EN_RUTA", simStatus === "LLEGADA_AL_SITIO")}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong className="block text-slate-900 font-bold">Móvil Técnico ATLAS</strong>
                      <span className="text-slate-600">
                        {simStatus === "LLEGADA_AL_SITIO" ? "Llegada al domicilio completada" : "En desplazamiento asistido por OSRM"}
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
                <span className={`h-2.5 w-2.5 rounded-full ${statusMeta.dotColor} shrink-0`} />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {statusMeta.label}
                </span>
              </div>
            </div>

            {/* Distancia restante */}
            <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-800/50 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Distancia</span>
                <MapPin className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="mt-1">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  {simStatus === "LLEGADA_AL_SITIO" ? "0 m" : formatDistance(remainingDistanceMeters)}
                </span>
                <span className="text-[10px] text-slate-400 ml-1">restantes</span>
              </div>
            </div>

            {/* ETA aproximada */}
            <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-800/50 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">ETA estimación</span>
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="mt-1">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  {simStatus === "LLEGADA_AL_SITIO" ? "¡En sitio!" : formatEta(remainingSeconds)}
                </span>
                <span className="text-[10px] text-slate-400 ml-1">
                  {simStatus === "LLEGADA_AL_SITIO" ? "" : "estimado"}
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
                  {currentIndex + 1}/{totalSteps || 1}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de progreso animada */}
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                simStatus === "LLEGADA_AL_SITIO" ? "bg-emerald-500" : "bg-orange-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* ─── 4. Barra de Controles de Demostración ─── */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Controles de reproducción */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePlayPause}
                disabled={isLoadingRoute || Boolean(routeError)}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  simStatus === "EN_RUTA"
                    ? "bg-amber-500 hover:bg-amber-600 active:bg-amber-700"
                    : simStatus === "LLEGADA_AL_SITIO"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-orange-500 hover:bg-orange-600 active:bg-orange-700"
                }`}
              >
                {simStatus === "EN_RUTA" ? (
                  <>
                    <Pause className="h-4 w-4" />
                    <span>Pausar</span>
                  </>
                ) : simStatus === "LLEGADA_AL_SITIO" ? (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    <span>Repetir viaje</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Iniciar simulación</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isLoadingRoute || Boolean(routeError) || currentIndex === 0}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-750 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 text-slate-500" />
                <span>Reiniciar</span>
              </button>
            </div>

            {/* Selector de velocidad */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-gray-800 p-1 rounded-xl border border-slate-200 dark:border-gray-700">
              <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 px-2 uppercase">
                Velocidad:
              </span>
              {[1, 2, 4].map((mult) => (
                <button
                  key={mult}
                  type="button"
                  onClick={() => setSpeedMultiplier(mult)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    speedMultiplier === mult
                      ? "bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-400 shadow-2xs"
                      : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {mult}×
                </button>
              ))}
            </div>

            {/* Aviso de presentación */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-gray-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Simulación local · Sin efectos persistentes en BD</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
