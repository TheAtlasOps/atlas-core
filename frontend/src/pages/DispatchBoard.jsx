import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowUpRight,
  Plus,
  ClipboardList,
  Users,
  CreditCard,
  X,
  Maximize2,
  CheckCircle2,
  Map,
  Search,
  Filter,
  Cpu,
  Database,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import KpiGrid from "../components/layout/KpiGrid";
import { useTheme } from "../hooks/useTheme";
import NewWorkOrderModal from "../components/ui/NewWorkOrderModal";
import HardwareInventoryModal from "../components/ui/HardwareInventoryModal";
import WorkOrderDetailDrawer from "../components/ui/WorkOrderDetailDrawer";
import {
  AVAILABLE_STATUS_FILTERS,
  getMarkerHexByStatus,
  groupOrdersIntoClusters,
  getMapSummaryCounters,
  getSignalFreshness,
  makeSingleOrderIcon,
  makeClusterIcon,
  makeTechnicianIcon,
  isValidCoordinate,
} from "../lib/mapClustering";
import {
  SERVICE_TYPES,
  formatChileanDateTime,
  mapServiceEnumToTag,
  buildActivitiesFromOrders,
} from "../lib/workOrderOptions";
import { useWorkOrders } from "../context/WorkOrderContext";
import { api } from "../lib/api";

const STATUS_OPTIONS = [
  "En camino",
  "Completada",
  "Programada",
  "Por coordinar",
  "Reagendada",
];

function FilterPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 ${
        active
          ? "border-orange-500 bg-orange-500 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800"
      }`}
    >
      {label}
    </button>
  );
}

// Componente auxiliar para ajustar encuadre a marcadores reales
function MapAutoBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (!markers || markers.length === 0) return;
    const valid = markers.filter(
      (m) =>
        typeof m.lat === "number" &&
        !isNaN(m.lat) &&
        typeof m.lng === "number" &&
        !isNaN(m.lng)
    );
    if (valid.length > 0) {
      const bounds = L.latLngBounds(valid.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
    }
  }, [map, markers]);
  return null;
}

// Recalcula el tamaño del canvas al abrir el modal expandido
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tarjeta 1 — Zonas activas (Mapa real react-leaflet con clustering y filtros)
// ═══════════════════════════════════════════════════════════════════════════════
export function ActiveZonesCard({
  isLoading,
  error,
  orders = [],
  markers = [],
  technicianMarkers = [],
  onSelectOrderId,
}) {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState("TODAS");
  const [showUnlocatedModal, setShowUnlocatedModal] = useState(false);

  // Considerar orders si están provistas, con fallback a markers
  const allOrdersList = useMemo(() => {
    return Array.isArray(orders) && orders.length > 0 ? orders : markers;
  }, [orders, markers]);

  // Agrupación de marcadores según coordenadas exactas y filtro de estado activo
  const { clusters, unlocatedOrders } = useMemo(
    () => groupOrdersIntoClusters(allOrdersList, statusFilter),
    [allOrdersList, statusFilter]
  );

  // Técnicos con coordenadas válidas
  const validTechMarkers = useMemo(
    () => technicianMarkers.filter((t) => isValidCoordinate(t.lat, t.lng)),
    [technicianMarkers]
  );

  // Puntos geográficos para encuadre automático del mapa
  const allMapPoints = useMemo(
    () => [
      ...clusters.map((c) => ({ lat: c.lat, lng: c.lng })),
      ...validTechMarkers.map((t) => ({ lat: t.lat, lng: t.lng })),
    ],
    [clusters, validTechMarkers]
  );

  // Contadores del encabezado
  const summary = useMemo(
    () => getMapSummaryCounters(allOrdersList, validTechMarkers, statusFilter),
    [allOrdersList, validTechMarkers, statusFilter]
  );

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3.5">
        {/* Encabezado con contadores y botón expandir */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Distribución geográfica de órdenes y técnicos en terreno
              </h2>
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"
                aria-label="En vivo"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{summary.summaryText}</span>
              {summary.unlocatedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowUnlocatedModal((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
                  title="Ver órdenes sin coordenadas registradas"
                >
                  <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{summary.unlocatedText}</span>
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            aria-label="Expandir mapa"
            title="Expandir mapa a pantalla completa"
            className="flex items-center justify-center rounded-md p-1.5 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shrink-0"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Barra de filtros por estado */}
        <div className="flex flex-wrap items-center gap-1.5 py-0.5" role="toolbar" aria-label="Filtros de estado en mapa">
          {AVAILABLE_STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {f.id !== "TODAS" && (
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: f.color }}
                  />
                )}
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Alerta desplegable de órdenes sin ubicación */}
        {showUnlocatedModal && unlocatedOrders.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                Órdenes sin coordenadas ({unlocatedOrders.length})
              </span>
              <button
                type="button"
                onClick={() => setShowUnlocatedModal(false)}
                className="text-amber-700 dark:text-amber-400 hover:opacity-75 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <ul className="divide-y divide-amber-500/20 max-h-28 overflow-y-auto pr-1">
              {unlocatedOrders.map((uo) => (
                <li key={uo.id} className="py-1 flex items-center justify-between gap-2 text-[11px]">
                  <div className="truncate">
                    <span className="font-semibold">{uo.orderNumber}</span>: {uo.title} ({uo.client})
                  </div>
                  {onSelectOrderId && (
                    <button
                      type="button"
                      onClick={() => onSelectOrderId(uo.orderNumber || uo.id)}
                      className="shrink-0 font-semibold underline text-amber-800 dark:text-amber-300 hover:text-amber-900 cursor-pointer"
                    >
                      Ver OT
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mapa Leaflet interactivo */}
        {isLoading ? (
          <div className="relative flex h-[250px] w-full items-center justify-center rounded-lg bg-slate-200 dark:bg-gray-800 animate-pulse">
            <Map className="h-8 w-8 text-slate-300 dark:text-gray-700" />
          </div>
        ) : (
          <>
            <div className="relative rounded-lg overflow-hidden border border-border z-0 isolate h-[250px] w-full">
              {allMapPoints.length === 0 && (
                <div className="absolute inset-x-4 top-4 z-[400] flex items-center justify-center rounded-lg bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-xs border border-border">
                  <span>
                    {error
                      ? "No se pudieron sincronizar las ubicaciones geográficas"
                      : "No hay órdenes ni técnicos con ubicación registrada para este filtro"}
                  </span>
                </div>
              )}
              <MapContainer
                center={[-33.4372, -70.6506]}
                zoom={12}
                scrollWheelZoom={false}
                style={{
                  height: "100%",
                  width: "100%",
                  background: isDark ? "#1a1a1a" : "#f1f5f9",
                }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
                />
                <MapAutoBounds markers={allMapPoints} />

                {/* Marcadores de Órdenes agrupadas (Clusters) y marcadores individuales */}
                {clusters.map((cluster) => {
                  const icon = cluster.isCluster
                    ? makeClusterIcon(cluster.count, cluster.color, L)
                    : makeSingleOrderIcon(cluster.color, L);

                  return (
                    <Marker
                      key={cluster.id}
                      position={[cluster.lat, cluster.lng]}
                      icon={icon}
                    >
                      <Popup minWidth={cluster.isCluster ? 310 : 200} maxWidth={360}>
                        {cluster.isCluster ? (
                          <div className="text-slate-900 dark:text-gray-100" style={{ fontSize: "12px", lineHeight: "1.4" }}>
                            <div className="border-b border-slate-200 dark:border-gray-700 pb-2 mb-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <strong className="font-bold text-slate-900 dark:text-white text-xs">
                                  Ubicación agrupada
                                </strong>
                                <span className="rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 px-2 py-0.5 text-[10px] font-extrabold shadow-2xs">
                                  {cluster.count} órdenes
                                </span>
                              </div>
                              <span className="block text-slate-500 dark:text-gray-400 text-[10px] truncate mt-0.5">
                                {cluster.orders[0]?.client || "Misma dirección"}
                              </span>
                            </div>
                            <div className="max-h-[210px] overflow-y-auto space-y-2.5 pr-2.5 atlas-map-popup-scroll">
                              {cluster.orders.map((o) => (
                                <div
                                  key={o.id}
                                  className="rounded-lg border border-slate-200/90 dark:border-gray-700/80 bg-slate-50/90 dark:bg-gray-800/80 p-2.5 shadow-2xs space-y-1"
                                >
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="font-bold text-slate-900 dark:text-white text-xs">{o.orderNumber}</span>
                                    <span
                                      className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white shadow-2xs shrink-0"
                                      style={{ backgroundColor: getMarkerHexByStatus(o.status) }}
                                    >
                                      {o.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-semibold text-slate-800 dark:text-gray-200 truncate">{o.client}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-gray-400 line-clamp-2 leading-tight">{o.title}</p>
                                  {onSelectOrderId && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isExpanded) setIsExpanded(false);
                                        onSelectOrderId(o.orderNumber || o.id);
                                      }}
                                      className="mt-2 w-full rounded-md bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-[11px] font-semibold py-1.5 px-2.5 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                    >
                                      <span>Ver detalle de la orden</span>
                                      <ExternalLink className="h-3 w-3 shrink-0" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          (() => {
                            const o = cluster.orders[0];
                            return (
                              <div className="text-slate-900 dark:text-gray-100 p-0.5" style={{ fontSize: "12px", lineHeight: "1.4", minWidth: "180px" }}>
                                <div className="flex items-center justify-between gap-1.5">
                                  <strong className="block text-slate-900 dark:text-white font-bold text-xs">
                                    {o.orderNumber}
                                  </strong>
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white shadow-2xs shrink-0"
                                    style={{ backgroundColor: cluster.color }}
                                  >
                                    {o.status}
                                  </span>
                                </div>
                                <span className="block text-slate-800 dark:text-gray-200 font-semibold text-[11px] mt-1.5 truncate">
                                  {o.client}
                                </span>
                                <span className="block text-slate-500 dark:text-gray-400 text-[10px] mt-0.5 line-clamp-2 leading-tight">
                                  {o.title}
                                </span>
                                {onSelectOrderId && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isExpanded) setIsExpanded(false);
                                      onSelectOrderId(o.orderNumber || o.id);
                                    }}
                                    className="mt-2.5 w-full rounded-md bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-[11px] font-semibold py-1.5 px-2.5 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                  >
                                    <span>Ver detalle de la orden</span>
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                  </button>
                                )}
                              </div>
                            );
                          })()
                        )}
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Marcadores de Técnicos con GPS */}
                {validTechMarkers.map((t) => {
                  const freshness = getSignalFreshness(t.lastLocationAt);
                  const techIcon = makeTechnicianIcon({
                    isRecent: freshness.isRecent,
                    isStale: freshness.isStale,
                    initials: t.initials || "TC",
                  }, L);
                  return (
                    <Marker key={t.id} position={[t.lat, t.lng]} icon={techIcon}>
                      <Popup minWidth={170}>
                        <div style={{ fontSize: "12px", lineHeight: "1.5" }}>
                          <div className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🚐 {t.name}</span>
                            {t.vehiclePlate && (
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1 py-0.5 rounded ml-1">
                                {t.vehiclePlate}
                              </span>
                            )}
                          </div>
                          {t.orderNumber ? (
                            <span className="block text-slate-600 text-[11px] mt-0.5">
                              OT en curso: <strong className="text-orange-600">{t.orderNumber}</strong>
                            </span>
                          ) : (
                            <span className="block text-slate-500 text-[11px] mt-0.5">Sin OT activa</span>
                          )}
                          <span className="block text-[11px] font-semibold text-slate-700 mt-1">
                            Estado: {t.status || "En terreno"}
                          </span>
                          <span
                            className="block text-[10px] font-medium mt-1"
                            style={{ color: freshness.isRecent ? "#059669" : freshness.isStale ? "#d97706" : "#64748b" }}
                          >
                            ● {freshness.label}
                          </span>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Leyenda de colores */}
            <div className="flex flex-wrap gap-2.5 items-center text-xs">
              <LegendDot color="bg-emerald-500" label="Técnico GPS en vivo" />
              <LegendDot color="bg-amber-500" label="Técnico señal >5m" />
              <LegendDot color="bg-blue-500" label="OT Confirmada" />
              <LegendDot color="bg-orange-500" label="OT En ruta" />
              <LegendDot color="bg-purple-500" label="OT En sitio" />
              <LegendDot color="bg-emerald-500" label="OT Completada" />
              <LegendDot color="bg-rose-500" label="OT Cancelada" />
            </div>
          </>
        )}
      </div>

      {/* Modal de Mapa Expandido */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#1e1e1e] overflow-hidden">
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Distribución geográfica de órdenes y técnicos en terreno
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{summary.summaryText}</span>
                  {summary.unlocatedCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      ({summary.unlocatedText})
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Cerrar mapa"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Barra de filtros en vista expandida */}
            <div className="flex flex-wrap items-center gap-1.5 px-6 py-2.5 border-b border-border bg-slate-50 dark:bg-card">
              <span className="text-xs font-semibold text-slate-700 dark:text-gray-300 mr-1">Filtrar estado:</span>
              {AVAILABLE_STATUS_FILTERS.map((f) => {
                const isActive = statusFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                        : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700"
                    }`}
                  >
                    {f.id !== "TODAS" && (
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: f.color }}
                      />
                    )}
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mapa interactivo expandido */}
            <div className="relative flex-1 w-full z-0 isolate">
              {allMapPoints.length === 0 && (
                <div className="absolute inset-x-6 top-6 z-[400] flex items-center justify-center rounded-lg bg-background/90 px-4 py-2.5 text-xs text-muted-foreground shadow-sm backdrop-blur-xs border border-border">
                  <span>No hay órdenes ni técnicos con ubicación registrada para el filtro seleccionado</span>
                </div>
              )}
              <MapContainer
                center={[-33.4372, -70.6506]}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
                zoomControl={true}
              >
                <TileLayer
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
                />
                <MapAutoBounds markers={allMapPoints} />
                <MapResizeHandler />

                {/* Marcadores agrupados y unitarios */}
                {clusters.map((cluster) => {
                  const icon = cluster.isCluster
                    ? makeClusterIcon(cluster.count, cluster.color, L)
                    : makeSingleOrderIcon(cluster.color, L);

                  return (
                    <Marker
                      key={cluster.id}
                      position={[cluster.lat, cluster.lng]}
                      icon={icon}
                    >
                      <Popup minWidth={cluster.isCluster ? 330 : 220} maxWidth={400}>
                        {cluster.isCluster ? (
                          <div className="text-slate-900 dark:text-gray-100" style={{ fontSize: "12px", lineHeight: "1.4" }}>
                            <div className="border-b border-slate-200 dark:border-gray-700 pb-2 mb-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <strong className="font-bold text-slate-900 dark:text-white text-sm">
                                  Ubicación agrupada
                                </strong>
                                <span className="rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 px-2.5 py-0.5 text-xs font-bold shadow-2xs">
                                  {cluster.count} órdenes
                                </span>
                              </div>
                              <p className="text-slate-500 dark:text-gray-400 text-xs mt-0.5 truncate">
                                {cluster.orders[0]?.client || "Misma dirección"}
                              </p>
                            </div>
                            <div className="max-h-[320px] overflow-y-auto space-y-2.5 pr-2.5 atlas-map-popup-scroll">
                              {cluster.orders.map((o) => (
                                <div
                                  key={o.id}
                                  className="rounded-lg border border-slate-200/90 dark:border-gray-700/80 bg-slate-50/90 dark:bg-gray-800/80 p-3 shadow-2xs space-y-1.5"
                                >
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="font-bold text-slate-900 dark:text-white text-xs">{o.orderNumber}</span>
                                    <span
                                      className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white shadow-2xs shrink-0"
                                      style={{ backgroundColor: getMarkerHexByStatus(o.status) }}
                                    >
                                      {o.status}
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-800 dark:text-gray-200 truncate">{o.client}</p>
                                  <p className="text-[11px] text-slate-500 dark:text-gray-400 line-clamp-2 leading-tight">{o.title}</p>
                                  {onSelectOrderId && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsExpanded(false);
                                        onSelectOrderId(o.orderNumber || o.id);
                                      }}
                                      className="mt-2 w-full rounded-md bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-semibold py-1.5 px-3 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                    >
                                      <span>Ver detalle de la orden</span>
                                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          (() => {
                            const o = cluster.orders[0];
                            return (
                              <div className="text-slate-900 dark:text-gray-100 p-0.5" style={{ fontSize: "12px", minWidth: "200px" }}>
                                <div className="flex items-center justify-between gap-1.5">
                                  <p className="font-bold text-slate-900 dark:text-white text-sm">{o.orderNumber}</p>
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white shadow-2xs shrink-0"
                                    style={{ backgroundColor: cluster.color }}
                                  >
                                    {o.status}
                                  </span>
                                </div>
                                <p className="font-semibold text-slate-800 dark:text-gray-200 text-xs mt-1.5 truncate">{o.client}</p>
                                <p className="text-slate-500 dark:text-gray-400 text-[11px] mt-0.5 line-clamp-2 leading-tight">{o.title}</p>
                                {onSelectOrderId && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsExpanded(false);
                                      onSelectOrderId(o.orderNumber || o.id);
                                    }}
                                    className="mt-2.5 w-full rounded-md bg-orange-500 hover:bg-orange-600 active:bg-orange-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                  >
                                    <span>Ver detalle de la orden</span>
                                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                  </button>
                                )}
                              </div>
                            );
                          })()
                        )}
                      </Popup>
                    </Marker>
                  );
                })}

                {validTechMarkers.map((t) => {
                  const freshness = getSignalFreshness(t.lastLocationAt);
                  const techIcon = makeTechnicianIcon({
                    isRecent: freshness.isRecent,
                    isStale: freshness.isStale,
                    initials: t.initials || "TC",
                  }, L);
                  return (
                    <Marker key={t.id} position={[t.lat, t.lng]} icon={techIcon}>
                      <Popup minWidth={180}>
                        <div style={{ fontSize: "12px", minWidth: "180px" }}>
                          <p className="font-bold text-slate-900 text-sm">🚐 {t.name}</p>
                          {t.vehiclePlate && (
                            <p className="text-[11px] font-mono text-slate-600">Patente: {t.vehiclePlate}</p>
                          )}
                          {t.orderNumber && (
                            <p className="text-orange-600 font-semibold text-xs mt-1">OT activa: {t.orderNumber}</p>
                          )}
                          <p className="text-slate-500 text-[11px] mt-0.5">Estado: {t.status || "En terreno"}</p>
                          <p
                            className="mt-1 text-[10px] font-semibold"
                            style={{ color: freshness.isRecent ? "#059669" : freshness.isStale ? "#d97706" : "#64748b" }}
                          >
                            ● {freshness.label}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Pie con leyenda */}
            <div className="flex items-center justify-between border-t border-border px-6 py-3 bg-slate-50 dark:bg-card">
              <div className="flex flex-wrap gap-4 text-xs">
                <LegendDot color="bg-emerald-500" label="Técnico GPS en vivo" />
                <LegendDot color="bg-amber-500" label="Técnico GPS (>5m)" />
                <LegendDot color="bg-blue-500" label="OT Confirmada" />
                <LegendDot color="bg-orange-500" label="OT En ruta" />
                <LegendDot color="bg-purple-500" label="OT En sitio" />
                <LegendDot color="bg-emerald-500" label="OT Completada" />
                <LegendDot color="bg-rose-500" label="OT Cancelada" />
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                Cerrar vista
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

const CIRCUMFERENCE = 251.2;

// ═══════════════════════════════════════════════════════════════════════════════
// Tarjeta 2 — Estado de visitas (Donut Chart SVG nativo sincronizado con KPIs)
// ═══════════════════════════════════════════════════════════════════════════════
function DonutChartCard({ isLoading, error, statusCounts = {} }) {
  const dynamicSegments = useMemo(
    () => [
      {
        label: "Completadas",
        value: statusCounts?.completadas ?? 0,
        color: "#22c55e",
        strokeColor: "#22c55e",
      },
      {
        label: "En Ruta",
        value: statusCounts?.enRuta ?? 0,
        color: "#3b82f6",
        strokeColor: "#3b82f6",
      },
      {
        label: "Pendientes",
        value: statusCounts?.pendientes ?? 0,
        color: "#f59e0b",
        strokeColor: "#f59e0b",
      },
      {
        label: "Canceladas",
        value: statusCounts?.canceladas ?? 0,
        color: "#ef4444",
        strokeColor: "#ef4444",
      },
    ],
    [
      statusCounts?.completadas,
      statusCounts?.enRuta,
      statusCounts?.pendientes,
      statusCounts?.canceladas,
    ]
  );

  const total = dynamicSegments.reduce((acc, s) => acc + s.value, 0);

  let accumulated = 0;
  const segments = dynamicSegments.map((seg) => {
    const dash = total > 0 ? (seg.value / total) * CIRCUMFERENCE : 0;
    const offset = CIRCUMFERENCE - accumulated;
    accumulated += dash;
    return { ...seg, dash, offset };
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col h-full">
      <div className="shrink-0">
        <h2 className="text-sm font-semibold text-foreground">
          Estado de visitas
        </h2>
        <p className="text-xs text-muted-foreground">
          Distribución del ciclo operativo actual
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4 py-1">
        {isLoading ? (
          <>
            <div className="flex items-center justify-center py-1">
              <div className="w-[150px] h-[150px] rounded-full bg-slate-200 dark:bg-gray-800 animate-pulse" />
            </div>
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-slate-200 dark:bg-gray-700 animate-pulse shrink-0" />
                    <div
                      className="h-3 animate-pulse rounded bg-slate-200 dark:bg-gray-800"
                      style={{ width: `${60 + i * 12}px` }}
                    />
                  </div>
                  <div className="h-3 w-8 animate-pulse rounded bg-slate-100/70 dark:bg-gray-800/70" />
                </div>
              ))}
            </div>
          </>
        ) : error && total === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center py-6">
            <p className="text-xs font-semibold text-rose-500">
              No se pudo obtener la distribución de estados
            </p>
            <p className="text-[11px] text-muted-foreground">{error}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center py-1">
              <div className="relative flex items-center justify-center">
                <svg
                  width="150"
                  height="150"
                  viewBox="0 0 100 100"
                  className="-rotate-90"
                  aria-label="Gráfico donut de estado de visitas"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="11"
                    className="text-slate-900/10 dark:text-white/5"
                  />
                  {segments.map((seg) => (
                    <circle
                      key={seg.label}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={seg.strokeColor}
                      strokeWidth="11"
                      strokeDasharray={`${seg.dash} ${CIRCUMFERENCE - seg.dash}`}
                      strokeDashoffset={seg.offset}
                      strokeLinecap="butt"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none p-2">
                  <span
                    className={`font-bold tracking-tight text-foreground leading-none ${
                      total >= 1000
                        ? "text-xl"
                        : total >= 100
                        ? "text-2xl"
                        : "text-3xl"
                    }`}
                  >
                    {total}
                  </span>
                  <span className="mt-1 max-w-[76px] text-[10px] leading-tight font-medium text-muted-foreground text-center">
                    {total === 0 ? "Sin órdenes" : "órdenes registradas"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {dynamicSegments.map((seg) => (
                <div
                  key={seg.label}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {seg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground tabular-nums">
                      {seg.value}
                    </span>
                    <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
                      {total > 0 ? Math.round((seg.value / total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tarjeta 3 — Próximas visitas
// ═══════════════════════════════════════════════════════════════════════════════
function UpcomingVisitsCard({ isLoading, error, visits = [], onSelectOrderId }) {
  const isEmpty = visits.length === 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Próximas visitas
          </h2>
          <p className="text-xs text-muted-foreground">Agenda operativa de visitas registradas</p>
        </div>
        <Link
          to="/work-orders"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Ver todas
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="w-12 h-4 rounded bg-slate-200 dark:bg-gray-800 animate-pulse shrink-0" />
              <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-gray-800 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-slate-100/70 dark:bg-gray-800/70 animate-pulse" />
                </div>
                <div className="h-5 w-16 rounded-full bg-slate-100/70 dark:bg-gray-800/70 animate-pulse shrink-0" />
              </div>
            </div>
          ))}
        </div>
      ) : error && isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-xs font-semibold text-rose-500">
            No se pudieron sincronizar las visitas programadas
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{error}</p>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-slate-500 dark:text-gray-400" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            No hay visitas registradas.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <ol className="flex flex-col divide-y divide-border overflow-y-auto max-h-[250px] pr-1.5 scrollbar-kanban">
            {visits.map((visit, idx) => (
              <li
                key={visit.id || idx}
                onClick={() => onSelectOrderId?.(visit.id)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer rounded-lg px-2.5 -mx-2 hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors"
                title={`Auditar ${visit.id}`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="w-16 shrink-0 text-xs text-orange-600 dark:text-orange-400 font-bold tabular-nums font-mono pt-0.5">
                    {visit.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug" title={visit.service}>
                      {visit.service}
                    </p>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{visit.client}</span>
                      {visit.technician && (
                        <span>
                          · Técnico: <strong className="text-foreground/90 font-medium">{visit.technician}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center pl-8 sm:pl-0">
                  {visit.time && (
                    <span className="text-xs text-slate-500 dark:text-gray-400 font-mono">
                      {visit.time}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${visit.statusStyle}`}
                  >
                    {visit.status}
                  </span>
                </div>
              </li>
            ))}
          </ol>
          {visits.length > 4 && (
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>{visits.length} órdenes registradas</span>
              <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                Desliza para ver más
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Skeleton — Tabla de actividad reciente
// ═══════════════════════════════════════════════════════════════════════════════
function ActivityTableSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-b border-border">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-52 animate-pulse rounded bg-slate-200 dark:bg-gray-800" />
          <div className="h-3 w-72 animate-pulse rounded bg-slate-100/80 dark:bg-gray-800/80" />
        </div>
        <div className="h-3 w-24 animate-pulse rounded bg-slate-100/60 dark:bg-gray-800/60" />
      </div>

      <div className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 px-5 py-4">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100/80 dark:bg-gray-800/80" />
            <div className="h-4 w-28 animate-pulse rounded bg-slate-100/80 dark:bg-gray-800/80" />
            <div className="h-4 w-48 animate-pulse rounded bg-slate-100/80 dark:bg-gray-800/80" />
            <div className="h-4 w-10 animate-pulse rounded bg-slate-100/60 dark:bg-gray-800/60 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tabla — Registro de actividad reciente con paginación real desde backend
// ═══════════════════════════════════════════════════════════════════════════════
function ActivityTable({
  log = [],
  pagination = { page: 1, size: 10, total: 0, pages: 1 },
  onPageChange,
  onSizeChange,
  isLoading = false,
  error = null,
  onSelectOrderId,
  onRetry,
}) {
  const startRecord = pagination.total > 0 ? (pagination.page - 1) * pagination.size + 1 : 0;
  const endRecord = Math.min(pagination.page * pagination.size, pagination.total);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Registro de actividad reciente
          </h2>
          <p className="text-xs text-muted-foreground">
            Últimas acciones registradas por los usuarios del sistema · Haz clic en una fila para ver auditoría
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground font-medium hidden md:inline">
            Bitácora en tiempo real (America/Santiago)
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-gray-300 border border-border">
            Total: {pagination.total} {pagination.total === 1 ? "registro" : "registros"}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-kanban relative min-h-[140px]">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-2xs flex items-center justify-center z-10 transition-opacity">
            <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2 shadow-sm text-xs font-medium text-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-orange-500" />
              <span>Cargando registros...</span>
            </div>
          </div>
        )}
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 w-28">
                ID Orden
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Realizado por
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Acción
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 text-right w-24">
                Hora
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {error && log.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-8 text-center text-xs text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                    <span className="font-semibold text-rose-500">
                      No se pudo sincronizar la bitácora de actividad
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {error}
                    </span>
                    {onRetry && (
                      <button
                        type="button"
                        onClick={onRetry}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reintentar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : log.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-8 text-center text-xs text-muted-foreground"
                >
                  No hay actividad reciente registrada
                </td>
              </tr>
            ) : (
              log.map((row, idx) => (
                <tr
                  key={row.historyId || row.id || idx}
                  onClick={() => onSelectOrderId?.(row.id)}
                  className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                    {row.id}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-900 dark:text-white font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>{row.performer || row.technician}</span>
                      {row.performerRole && (
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300 border border-border">
                          {row.performerRole}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500 dark:text-gray-400">
                    {row.action}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 dark:text-gray-400 font-mono tabular-nums text-right whitespace-nowrap">
                    {row.time}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Barra de Paginación ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-border bg-slate-50/50 dark:bg-card/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Registros por página:</span>
          <select
            value={pagination.size}
            onChange={(e) => onSizeChange?.(Number(e.target.value))}
            disabled={isLoading}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            aria-label="Registros por página"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-slate-400 dark:text-gray-500">·</span>
          <span>
            {pagination.total > 0
              ? `Mostrando ${startRecord} - ${endRecord} de ${pagination.total}`
              : "0 registros"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium mr-1">
            Página {pagination.page} de {Math.max(1, pagination.pages)}
          </span>
          <button
            type="button"
            onClick={() => onPageChange?.(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-slate-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Anterior</span>
          </button>
          <button
            type="button"
            onClick={() => onPageChange?.(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages || isLoading}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-slate-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Página siguiente"
          >
            <span>Siguiente</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Panel lateral — Atlas AI Field Insights (Respaldado por datos reales de Neon DB)
// ═══════════════════════════════════════════════════════════════════════════════
function AiInsights({
  isLoading,
  columns,
  hardwareInventory,
  techniciansCount,
  onRecalculate,
}) {
  const dataBackedInsights = useMemo(() => {
    const asignadas = columns.find((c) => c.id === "asignada")?.tasks || [];
    const enRuta = columns.find((c) => c.id === "en-transito")?.tasks || [];
    const completadas = columns.find((c) => c.id === "completada")?.tasks || [];
    const activeTasks = [...asignadas, ...enRuta];

    // 1. Análisis real de carga por técnico
    const loadByTech = {};
    for (const t of activeTasks) {
      const name = t.assigneeName || t.assignee || "Sin asignar";
      loadByTech[name] = loadByTech[name] || [];
      loadByTech[name].push(t.orderId);
    }
    const sortedTechs = Object.entries(loadByTech).sort(
      (a, b) => b[1].length - a[1].length
    );
    const topTech = sortedTechs[0];
    const topTechName = topTech ? topTech[0] : null;
    const topTechOrders = topTech ? topTech[1] : [];

    // 2. Análisis real de órdenes críticas pendientes de inicio de ruta (IDLE / Asignada)
    const urgentPending = asignadas.filter((t) =>
      ["URGENTE", "ALTA", "Urgente", "Alta"].includes(t.priority)
    );
    const urgentIds = urgentPending.map((t) => t.orderId).join(", ");

    // 3. Análisis real de stock de SIMs y Routers en inventario
    const sims = hardwareInventory.filter((i) => i.deviceType === "SIM");
    const availSims = sims.filter((i) => i.status === "DISPONIBLE").length;
    const faultySims = sims.filter((i) => i.status === "DEFECTUOSA").length;
    const routers = hardwareInventory.filter((i) => i.deviceType === "Router");
    const availRouters = routers.filter((i) => i.status === "DISPONIBLE").length;

    return [
      {
        id: "workload",
        badge:
          topTechOrders.length > 0
            ? `${topTechOrders.length} de ${activeTasks.length} OT activas`
            : `${activeTasks.length} OT activas`,
        title:
          topTechOrders.length > 0
            ? "Concentración de carga en técnico"
            : "Distribución de carga técnica",
        body:
          topTechOrders.length > 0
            ? `${topTechName} concentra ${topTechOrders.length} órdenes activas (${topTechOrders.join(
                ", "
              )}) de un total de ${
                activeTasks.length
              } en curso, mientras hay ${techniciansCount} técnicos disponibles en plataforma.`
            : activeTasks.length > 0
              ? `Carga operativa distribuida. ${activeTasks.length} órdenes activas en curso con ${techniciansCount} técnicos disponibles.`
              : `No se registran órdenes de trabajo activas en curso en este momento.`,
      },
      {
        id: "sla-priority",
        badge:
          urgentPending.length > 0
            ? `${urgentPending.length} OT Alta/Urgente en espera`
            : `${enRuta.length} OT en tránsito`,
        title:
          urgentPending.length > 0
            ? "Órdenes prioritarias pendientes de ruta"
            : "Seguimiento de SLA en terreno",
        body:
          urgentPending.length > 0
            ? `Las órdenes ${urgentIds} tienen prioridad Urgente/Alta pero continúan en columna Asignada sin iniciar desplazamiento. Prioriza su salida a terreno.`
            : `Actualmente hay ${enRuta.length} órdenes en ruta y ${completadas.length} completadas en el tablero operativo.`,
      },
      {
        id: "inventory-stock",
        badge: `${availSims}/${sims.length} SIMs · ${availRouters}/${routers.length} Routers`,
        title: "Disponibilidad de inventario y hardware",
        body: `Stock actual en bodega: ${availSims} de ${sims.length} SIMs disponibles (${
          sims.length > 0 ? Math.round((availSims / sims.length) * 100) : 0
        }%)${
          faultySims > 0 ? `, ${faultySims} SIM reportada DEFECTUOSA` : ""
        } y ${availRouters} de ${
          routers.length
        } Routers disponibles para vinculación.`,
      },
    ];
  }, [columns, hardwareInventory, techniciansCount]);

  return (
    <aside className="rounded-xl border border-border border-t-2 border-t-primary bg-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Alertas operativas
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Reglas y diagnósticos sobre datos reales
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
          <Database className="h-2.5 w-2.5" />
          Datos en vivo
        </span>
      </div>

      {isLoading ? (
        <div className="mt-2 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-md bg-slate-200 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="mt-1 flex flex-col gap-3">
          {dataBackedInsights.map((insight) => (
            <div
              key={insight.id}
              className="rounded-lg border border-border bg-background/40 p-3"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="shrink-0 rounded-md bg-orange-500/10 px-2 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                    {insight.badge}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1" />
                  <h3 className="text-xs font-semibold text-foreground leading-snug">
                    {insight.title}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-3">
                  {insight.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onRecalculate}
        className="mt-1 w-full rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
      >
        Recalcular con datos actuales
      </button>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Vista principal — DispatchBoard
// ═══════════════════════════════════════════════════════════════════════════════
const normalize = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function DispatchBoard() {
  const {
    columns,
    visitsList,
    activityList,
    hardwareInventory,
    refreshOrders,
    refreshHardwareInventory,
    toast,
    setToast,
    createWorkOrder,
  } = useWorkOrders();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [serviceFilter, setServiceFilter] = useState(null);

  const [kpis, setKpis] = useState(null);
  const [techniciansList, setTechniciansList] = useState([]);
  const [dashboardOrders, setDashboardOrders] = useState([]);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [technicianMarkers, setTechnicianMarkers] = useState([]);
  const [activityLog, setActivityLog] = useState(null);
  const [activityPagination, setActivityPagination] = useState({
    page: 1,
    size: 10,
    total: 0,
    pages: 1,
  });
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivityPage = useCallback(
    async (targetPage = 1, targetSize = activityPagination.size) => {
      try {
        setIsActivityLoading(true);
        setActivityError(null);
        const res = await api.orders.getActivityLog({ page: targetPage, size: targetSize });
        if (res) {
          const rawItems = res.items || (Array.isArray(res) ? res : []);
          const mapped = rawItems.map((item) => ({
            id: item.order_number || item.order_id,
            historyId: item.id,
            performer: item.technician_name || "Coordinación",
            performerRole: item.performer_role || null,
            technician: item.technician_name || "Coordinación",
            client: item.client_name || "Cliente Corporativo",
            action: item.action,
            status: item.new_status,
            serviceType: mapServiceEnumToTag(item.service_type),
            time: formatChileanDateTime(item.created_at) || "",
            rawTimestamp: new Date(item.created_at).getTime(),
          }));
          setActivityLog(mapped);
          setActivityPagination({
            page: res.page || targetPage,
            size: res.size || targetSize,
            total: res.total !== undefined ? res.total : mapped.length,
            pages: res.pages || Math.max(1, Math.ceil((res.total !== undefined ? res.total : mapped.length) / targetSize)),
          });
        }
      } catch (err) {
        setActivityError(err.message || "Error al actualizar la bitácora de actividad.");
      } finally {
        setIsActivityLoading(false);
      }
    },
    [activityPagination.size]
  );

  const handleActivityPageChange = useCallback(
    (newPage) => {
      if (newPage < 1 || newPage > activityPagination.pages) return;
      fetchActivityPage(newPage, activityPagination.size);
    },
    [activityPagination.pages, activityPagination.size, fetchActivityPage]
  );

  const handleActivitySizeChange = useCallback(
    (newSize) => {
      fetchActivityPage(1, newSize);
    },
    [fetchActivityPage]
  );

  const loadDashboard = useCallback(async () => {
    let cancelled = false;
    try {
      setIsLoading(true);
      setApiError(null);
      setActivityError(null);
      const [kpisRes, ordersData, techsData, activityRes] = await Promise.allSettled([
        api.orders.getKpis(),
        api.orders.getAll({ size: 50 }),
        api.orders.getTechnicians(),
        api.orders.getActivityLog
          ? api.orders.getActivityLog({ page: 1, size: 10 })
          : Promise.reject(new Error("No endpoint")),
      ]);

      if (cancelled) return;

      const isKpisRejected = kpisRes.status === "rejected";
      const isOrdersRejected = ordersData.status === "rejected";

      if (isKpisRejected && isOrdersRejected) {
        setApiError(
          "Error de conexión con el backend de Render / Neon. No se pudieron obtener los datos actualizados del tablero."
        );
      } else if (isKpisRejected) {
        setApiError("Advertencia: No se pudieron sincronizar las métricas KPI desde la API.");
      }

      if (kpisRes.status === "fulfilled" && kpisRes.value) {
        setKpis(kpisRes.value);
      }
      if (
        techsData.status === "fulfilled" &&
        Array.isArray(techsData.value)
      ) {
        setTechniciansList(techsData.value);
        const tMarkers = techsData.value
          .filter((t) => {
            const lat = parseFloat(t.current_lat);
            const lng = parseFloat(t.current_lng);
            return (
              !isNaN(lat) &&
              !isNaN(lng) &&
              t.current_lat !== null &&
              t.current_lng !== null &&
              lat >= -90 &&
              lat <= 90 &&
              lng >= -180 &&
              lng <= 180
            );
          })
          .map((t) => ({
            id: `tech-${t.id}`,
            technicianId: t.id,
            name: t.full_name || "Técnico en terreno",
            initials: t.initials || "TC",
            vehiclePlate: t.vehicle_plate,
            orderNumber: t.active_order_number,
            status: t.active_order_status || (t.is_available ? "Disponible" : "En terreno"),
            lat: parseFloat(t.current_lat),
            lng: parseFloat(t.current_lng),
            lastLocationAt: t.last_location_at,
          }));
        setTechnicianMarkers(tMarkers);
      }

      if (
        ordersData.status === "fulfilled" &&
        Array.isArray(ordersData.value?.items)
      ) {
        setDashboardOrders(ordersData.value.items);
        const markers = ordersData.value.items
          .filter((o) => {
            const lat = parseFloat(o.lat);
            const lng = parseFloat(o.lng);
            return (
              !isNaN(lat) &&
              !isNaN(lng) &&
              o.lat !== null &&
              o.lng !== null &&
              lat >= -90 &&
              lat <= 90 &&
              lng >= -180 &&
              lng <= 180
            );
          })
          .map((o) => ({
            id: o.id,
            orderNumber: o.order_number,
            title: o.title,
            client:
              o.client?.business_name ||
              o.client?.name ||
              o.client_name ||
              "Cliente Corporativo",
            lat: parseFloat(o.lat),
            lng: parseFloat(o.lng),
            status: o.status,
          }));
        setMapMarkers(markers);
      } else {
        setDashboardOrders([]);
        setMapMarkers([]);
      }

      // Actividad verificable:
      if (activityRes.status === "fulfilled" && activityRes.value) {
        const val = activityRes.value;
        const rawItems = val.items || (Array.isArray(val) ? val : []);
        const mapped = rawItems.map((item) => ({
          id: item.order_number || item.order_id,
          historyId: item.id,
          performer: item.technician_name || "Coordinación",
          performerRole: item.performer_role || null,
          technician: item.technician_name || "Coordinación",
          client: item.client_name || "Cliente Corporativo",
          action: item.action,
          status: item.new_status,
          serviceType: mapServiceEnumToTag(item.service_type),
          time: formatChileanDateTime(item.created_at) || "",
          rawTimestamp: new Date(item.created_at).getTime(),
        }));
        setActivityLog(mapped);
        setActivityPagination({
          page: val.page || 1,
          size: val.size || 10,
          total: val.total !== undefined ? val.total : rawItems.length,
          pages: val.pages || Math.max(1, Math.ceil((val.total !== undefined ? val.total : rawItems.length) / (val.size || 10))),
        });
      } else if (ordersData.status === "fulfilled" && Array.isArray(ordersData.value?.items)) {
        const fromOrders = buildActivitiesFromOrders(ordersData.value.items);
        setActivityLog(fromOrders.slice(0, 10));
        setActivityPagination({
          page: 1,
          size: 10,
          total: fromOrders.length,
          pages: Math.max(1, Math.ceil(fromOrders.length / 10)),
        });
      }
    } catch (err) {
      setApiError(err.message || "Error al cargar los datos del tablero.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Polling silencioso en segundo plano para actualizar telemetría GPS cada 30s sin recargar la pantalla
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const data = await api.orders.getTechnicians();
        if (Array.isArray(data)) {
          setTechniciansList(data);
          const tMarkers = data
            .filter((t) => {
              const lat = parseFloat(t.current_lat);
              const lng = parseFloat(t.current_lng);
              return (
                !isNaN(lat) &&
                !isNaN(lng) &&
                t.current_lat !== null &&
                t.current_lng !== null &&
                lat >= -90 &&
                lat <= 90 &&
                lng >= -180 &&
                lng <= 180
              );
            })
            .map((t) => ({
              id: `tech-${t.id}`,
              technicianId: t.id,
              name: t.full_name || "Técnico en terreno",
              initials: t.initials || "TC",
              vehiclePlate: t.vehicle_plate,
              orderNumber: t.active_order_number,
              status: t.active_order_status || (t.is_available ? "Disponible" : "En terreno"),
              lat: parseFloat(t.current_lat),
              lng: parseFloat(t.current_lng),
              lastLocationAt: t.last_location_at,
            }));
          setTechnicianMarkers(tMarkers);
        }
      } catch {
        // Continuar silenciosamente sin interrumpir la interacción del usuario
      }
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const activeFilterCount = (statusFilter ? 1 : 0) + (serviceFilter ? 1 : 0);
  const hasActiveFilters = Boolean(search.trim()) || activeFilterCount > 0;
  const q = normalize(search.trim());

  const handleSelectOrderId = (orderId) => {
    for (const col of columns) {
      const found = col.tasks.find((t) => t.orderId === orderId || t.id === orderId || t.order_number === orderId);
      if (found) {
        setSelectedOrder({ ...found, columnStatus: col.label });
        return;
      }
    }
    const visit = visitsList.find((v) => v.id === orderId || v.orderId === orderId || v.order_number === orderId);
    if (visit) {
      setSelectedOrder({
        orderId: visit.id,
        title: visit.service,
        client: visit.client,
        clientName: visit.client,
        location: visit.client,
        priority: "MEDIA",
        assignee: visit.technician,
        assigneeName: visit.technician,
        tag: visit.serviceType,
        columnStatus: visit.status,
      });
      return;
    }
    // Fallback con las órdenes completas cargadas desde el backend para el dashboard
    const rawOrder = dashboardOrders.find(
      (o) => o.id === orderId || o.order_number === orderId || o.orderNumber === orderId
    );
    if (rawOrder) {
      setSelectedOrder({
        ...rawOrder,
        orderId: rawOrder.order_number || rawOrder.id,
        order_number: rawOrder.order_number || rawOrder.id,
        title: rawOrder.title || rawOrder.service || "Servicio técnico",
        client: rawOrder.client?.business_name || rawOrder.client?.name || rawOrder.client_name || "Cliente Corporativo",
        clientName: rawOrder.client?.business_name || rawOrder.client?.name || rawOrder.client_name || "Cliente Corporativo",
        location: rawOrder.client?.address || rawOrder.address_override || "Santiago",
        assignee: rawOrder.technician_summary?.full_name || "Sin asignar",
        assigneeName: rawOrder.technician_summary?.full_name || "Sin asignar",
        tag: rawOrder.tag || rawOrder.service_type || "SERVICIO",
        columnStatus: rawOrder.status,
      });
    }
  };

  // Conteos unificados con kpis.status_distribution como única fuente de verdad
  const statusCounts = useMemo(() => {
    const dist = kpis?.status_distribution;
    if (dist) {
      return {
        pendientes: (dist.CONFIRMADA || 0) + (dist.IDLE || 0),
        enRuta: (dist.EN_RUTA || 0) + (dist.EN_SITIO || 0),
        completadas: dist.COMPLETADA || 0,
        canceladas: dist.CANCELADA || 0,
      };
    }

    const asignadasCol = columns.find((c) => c.id === "asignada")?.tasks || [];
    const enTransitoCol =
      columns.find((c) => c.id === "en-transito")?.tasks || [];
    const completadasCol =
      columns.find((c) => c.id === "completada")?.tasks || [];

    return {
      pendientes: asignadasCol.length,
      enRuta: enTransitoCol.length,
      completadas: completadasCol.length,
      canceladas: 0,
    };
  }, [kpis, columns]);

  const activeOrdersCount = statusCounts.pendientes + statusCounts.enRuta;
  const completedOrdersCount = statusCounts.completadas;
  const totalCycleOrders =
    activeOrdersCount + completedOrdersCount + statusCounts.canceladas;

  // Técnicos disponibles y técnicos con órdenes activas asignadas (sin fallbacks hardcodeados)
  const techStats = useMemo(() => {
    const availableCount =
      techniciansList.length > 0
        ? techniciansList.filter((t) => t.is_available !== false).length
        : kpis?.technicians_in_field ?? 0;

    const activeTasks = [
      ...(columns.find((c) => c.id === "asignada")?.tasks || []),
      ...(columns.find((c) => c.id === "en-transito")?.tasks || []),
    ];
    const activeTechNames = new Set(
      activeTasks
        .map((t) => t.assigneeName || t.assignee)
        .filter((name) => name && name !== "Sin asignar")
    );
    return {
      availableCount,
      assignedActiveCount: activeTechNames.size,
    };
  }, [techniciansList, kpis, columns]);

  // Stock real de SIMs desde hardwareInventory (sin fallbacks duros)
  const simStats = useMemo(() => {
    const sims = hardwareInventory.filter((i) => i.deviceType === "SIM");
    const totalSims = sims.length;
    const availSims = sims.filter((i) => i.status === "DISPONIBLE").length;
    const activeSims = sims.filter((i) =>
      ["INSTALADA", "ASIGNADA_TECNICO"].includes(i.status)
    ).length;
    const faultySims = sims.filter((i) =>
      ["DEFECTUOSA", "BAJA"].includes(i.status)
    ).length;
    const rate =
      totalSims > 0
        ? Math.round((availSims / totalSims) * 100)
        : (kpis?.available_sims_rate != null ? Math.round(kpis.available_sims_rate) : 0);

    return {
      totalSims,
      availSims,
      activeSims,
      faultySims,
      rate,
    };
  }, [hardwareInventory, kpis]);

  const isKpiError = Boolean(apiError && !kpis);

  const dynamicKpiData = useMemo(() => {
    if (isKpiError) {
      return [
        {
          label: "Órdenes Activas",
          value: "—",
          delta: "No disponible (sin conexión)",
          icon: ClipboardList,
          isError: true,
        },
        {
          label: "Técnicos en Terreno",
          value: "—",
          delta: "No disponible (sin conexión)",
          icon: Users,
          isError: true,
        },
        {
          label: "SIMs Disponibles",
          value: "—",
          delta: "No disponible (sin conexión)",
          icon: CreditCard,
          isError: true,
        },
        {
          label: "Órdenes Completadas",
          value: "—",
          delta: "No disponible (sin conexión)",
          icon: CheckCircle2,
          isError: true,
        },
      ];
    }

    return [
      {
        label: "Órdenes Activas",
        value: String(activeOrdersCount),
        delta: `${statusCounts.enRuta} en ruta · ${statusCounts.pendientes} pendientes`,
        icon: ClipboardList,
      },
      {
        label: "Técnicos en Terreno",
        value: `${statusCounts.enRuta} en ruta`,
        delta: `${techStats.availableCount} técnicos disponibles en total`,
        icon: Users,
      },
      {
        label: "SIMs Disponibles",
        value:
          simStats.totalSims > 0
            ? `${simStats.availSims} / ${simStats.totalSims} (${simStats.rate}%)`
            : `${simStats.rate}%`,
        delta: `${simStats.availSims} libres · ${simStats.activeSims} activas · ${simStats.faultySims} falla`,
        icon: CreditCard,
      },
      {
        label: "Órdenes Completadas",
        value: String(completedOrdersCount),
        delta: `${completedOrdersCount} de ${totalCycleOrders} órdenes registradas`,
        icon: CheckCircle2,
      },
    ];
  }, [
    isKpiError,
    activeOrdersCount,
    statusCounts.enRuta,
    statusCounts.pendientes,
    techStats,
    simStats,
    completedOrdersCount,
    totalCycleOrders,
  ]);

  const filteredVisits = visitsList.filter((visit) => {
    if (statusFilter && normalize(visit.status) !== normalize(statusFilter))
      return false;
    if (
      serviceFilter &&
      normalize(visit.serviceType) !== normalize(serviceFilter)
    )
      return false;
    if (q) {
      return (
        normalize(visit.id).includes(q) ||
        normalize(visit.service).includes(q) ||
        normalize(visit.client).includes(q) ||
        normalize(visit.technician).includes(q) ||
        normalize(visit.status).includes(q) ||
        normalize(visit.serviceType).includes(q)
      );
    }
    return true;
  });

  const displayActivities = activityLog !== null ? activityLog : activityList;
  const filteredActivityLog = displayActivities.filter((row) => {
    if (statusFilter && normalize(row.status) !== normalize(statusFilter))
      return false;
    if (
      serviceFilter &&
      normalize(row.serviceType) !== normalize(serviceFilter)
    )
      return false;
    if (q) {
      return (
        normalize(row.id).includes(q) ||
        normalize(row.technician).includes(q) ||
        normalize(row.action).includes(q) ||
        normalize(row.status).includes(q) ||
        normalize(row.serviceType).includes(q)
      );
    }
    return true;
  });

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter(null);
    setServiceFilter(null);
  };

  const handleCreateOT = (order, apiCreated) => {
    createWorkOrder(order, apiCreated);
  };

  return (
    <>
      {/* ── Toast de confirmación ── */}
      {toast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-white p-4 shadow-2xl dark:border-emerald-500/40 dark:bg-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-900 dark:text-white">
              {toast.title}
            </p>
            <p className="text-slate-500 dark:text-gray-400">
              {toast.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" />
          </button>
        </aside>
      )}

      {/* ── Modal nueva / editar OT ── */}
      <NewWorkOrderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingOrder(null);
        }}
        initialOrder={editingOrder}
        onCreate={handleCreateOT}
        onUpdate={() => {
          setToast({
            title: "Orden actualizada",
            description: "Los cambios de ubicación y datos técnicos se guardaron exitosamente en Neon.",
            type: "success",
          });
        }}
      />

      {/* ── Modal Inventario SIM / Routers ── */}
      <HardwareInventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
      />

      {/* ── Drawer lateral de Auditoría de OT ── */}
      <WorkOrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOpenInventoryModal={() => setIsInventoryOpen(true)}
        onEditOrder={(order) => {
          setSelectedOrder(null);
          setEditingOrder(order);
          setIsModalOpen(true);
        }}
      />

      {/* ── Layout principal ── */}
      <div className="flex flex-col gap-6">
        {/* Cabecera + búsqueda, filtros, Inventario y botón Nueva OT */}
        <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-balance">
                    Tablero de Despacho
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Estado en tiempo real de las órdenes de trabajo Entel.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Input de búsqueda con lupa */}
                  <div className="relative w-full sm:w-72">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-gray-500"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar OT, cliente o técnico..."
                      aria-label="Buscar OT, cliente o técnico"
                      className="w-full rounded-lg border border-slate-200 bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700"
                    />
                  </div>

                  {/* Botón de Filtros */}
                  <button
                    type="button"
                    onClick={() => setShowFilters((v) => !v)}
                    aria-expanded={showFilters}
                    aria-controls="dispatch-filters"
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-150 ${
                      showFilters || activeFilterCount > 0
                        ? "border-orange-500/50 bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
                        : "border-slate-200 dark:border-gray-700 bg-card text-muted-foreground hover:border-slate-300 dark:hover:border-gray-600 hover:text-foreground"
                    }`}
                  >
                    <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                    Filtros
                    {activeFilterCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* Botón Inventario SIM / Routers */}
                  <button
                    id="btn-hardware-inventory"
                    type="button"
                    onClick={() => setIsInventoryOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] hover:border-orange-500/60 dark:hover:border-orange-500/60 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white transition-colors shadow-xs"
                  >
                    <Cpu className="h-4 w-4 text-orange-500" aria-hidden="true" />
                    Inventario SIM / Routers
                  </button>

                  {/* Botón Nueva OT */}
                  <button
                    id="btn-new-ot"
                    onClick={() => {
                      setEditingOrder(null);
                      setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-2 text-sm font-semibold text-white active:scale-95 transition-all duration-150 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva OT
                  </button>
                </div>
              </div>

              {/* Panel de filtros rápidos (pills) */}
              {showFilters && (
                <div
                  id="dispatch-filters"
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-card p-4 dark:border-gray-700"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-28 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Estado
                    </span>
                    {STATUS_OPTIONS.map((status) => (
                      <FilterPill
                        key={status}
                        label={status}
                        active={statusFilter === status}
                        onClick={() =>
                          setStatusFilter((cur) =>
                            cur === status ? null : status
                          )
                        }
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-28 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Tipo de servicio
                    </span>
                    {SERVICE_TYPES.map((service) => (
                      <FilterPill
                        key={service}
                        label={service}
                        active={serviceFilter === service}
                        onClick={() =>
                          setServiceFilter((cur) =>
                            cur === service ? null : service
                          )
                        }
                      />
                    ))}
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter(null);
                        setServiceFilter(null);
                      }}
                      className="inline-flex items-center gap-1 self-start text-xs font-medium text-orange-600 hover:underline dark:text-orange-400"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                      Limpiar filtros
                    </button>
                  )}
                </div>
              )}

              {/* Barra de feedback de filtros activos */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-orange-500/10 border border-orange-500/20 px-3.5 py-2 text-xs text-orange-700 dark:text-orange-300">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">Filtros activos:</span>
                    <span>{filteredVisits.length} visitas registradas</span>
                    <span>·</span>
                    <span>{filteredActivityLog.length} actividades</span>
                    {search.trim() && (
                      <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[11px] font-medium">
                        Texto: &quot;{search.trim()}&quot;
                      </span>
                    )}
                    {statusFilter && (
                      <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[11px] font-medium">
                        Estado: {statusFilter}
                      </span>
                    )}
                    {serviceFilter && (
                      <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[11px] font-medium">
                        Servicio: {serviceFilter}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    Limpiar todo
                  </button>
                </div>
              )}
            </div>

            {/* Banner de error o advertencia de conexión */}
            {apiError && (
              <div
                role="alert"
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-700 dark:text-rose-300"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
                  <div>
                    <p className="text-xs font-semibold">Problema de conexión con la API en tiempo real</p>
                    <p className="text-[11px] text-rose-600/90 dark:text-rose-300/90">{apiError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    loadDashboard();
                    refreshOrders?.();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-200 hover:bg-rose-500/30 transition-colors shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reintentar conexión
                </button>
              </div>
            )}

        {/* KPIs — muestra skeleton mientras carga */}
        <KpiGrid metrics={dynamicKpiData} isLoading={isLoading} error={apiError} />

        {/* Sección analítica y operativa — Columnas izquierda y derecha perfectamente alineadas */}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* Fila 1: Mapa geoespacial y Distribución de estado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActiveZonesCard
                isLoading={isLoading}
                error={apiError}
                orders={dashboardOrders}
                markers={mapMarkers}
                technicianMarkers={technicianMarkers}
                onSelectOrderId={handleSelectOrderId}
              />
              <DonutChartCard
                isLoading={isLoading}
                error={apiError}
                statusCounts={statusCounts}
              />
            </div>

            {/* Fila 2: Agenda operativa de visitas con ancho completo para máxima legibilidad */}
            <div className="w-full">
              <UpcomingVisitsCard
                isLoading={isLoading}
                error={apiError}
                visits={filteredVisits}
                onSelectOrderId={handleSelectOrderId}
              />
            </div>
          </div>

          {/* Panel lateral AI respaldado por datos reales */}
          <div className="w-full xl:w-80 xl:shrink-0">
            <AiInsights
              isLoading={isLoading}
              columns={columns}
              hardwareInventory={hardwareInventory}
              techniciansCount={techStats.availableCount}
              onRecalculate={() => {
                refreshOrders?.();
                refreshHardwareInventory?.();
              }}
            />
          </div>
        </div>

        {/* ── Tabla de actividad — skeleton mientras carga ── */}
        {isLoading ? (
          <ActivityTableSkeleton />
        ) : (
          <ActivityTable
            log={filteredActivityLog}
            pagination={activityPagination}
            onPageChange={handleActivityPageChange}
            onSizeChange={handleActivitySizeChange}
            isLoading={isActivityLoading}
            error={activityError || apiError}
            onSelectOrderId={handleSelectOrderId}
            onRetry={() => fetchActivityPage(activityPagination.page, activityPagination.size)}
          />
        )}
      </div>
    </>
  );
}
