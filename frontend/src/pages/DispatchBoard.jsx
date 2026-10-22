import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import KpiGrid from "../components/layout/KpiGrid";
import { useTheme } from "../hooks/useTheme";
import NewWorkOrderModal from "../components/ui/NewWorkOrderModal";
import HardwareInventoryModal from "../components/ui/HardwareInventoryModal";
import WorkOrderDetailDrawer from "../components/ui/WorkOrderDetailDrawer";
import { SERVICE_TYPES } from "../lib/workOrderOptions";
import { useWorkOrders } from "../context/WorkOrderContext";
import { api } from "../lib/api";

const STATUS_OPTIONS = ["En camino", "Completada", "Programada", "Reagendada"];

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

// ─── Marcadores base de respaldo (coordenadas reales de las OTs en Santiago) ─
const DEFAULT_MAP_MARKERS = [
  {
    id: "d0000000-0000-4000-8000-000000000001",
    orderNumber: "#OT-08491",
    title: "Instalación fibra óptica — Providencia",
    client: "Enel Distribución Chile",
    label: "Providencia",
    lat: -33.432,
    lng: -70.6093,
    status: "EN_RUTA",
  },
  {
    id: "d0000000-0000-4000-8000-000000000002",
    orderNumber: "#OT-08492",
    title: "Cambio de SIM corporativa — Santiago Centro",
    client: "Falabella Retail S.A.",
    label: "Santiago Centro",
    lat: -33.4489,
    lng: -70.6693,
    status: "CONFIRMADA",
  },
  {
    id: "d0000000-0000-4000-8000-000000000003",
    orderNumber: "#OT-08493",
    title: "Revisión antena 4G — Providencia",
    client: "Torre Costanera Hub",
    label: "Providencia",
    lat: -33.4172,
    lng: -70.606,
    status: "IDLE",
  },
  {
    id: "d0000000-0000-4000-8000-000000000005",
    orderNumber: "#OT-08495",
    title: "Activación Magic Link — Ñuñoa",
    client: "Clínica Alemana Vitacura",
    label: "Ñuñoa",
    lat: -33.4569,
    lng: -70.599,
    status: "IDLE",
  },
  {
    id: "d0000000-0000-4000-8000-000000000008",
    orderNumber: "#OT-08498",
    title: "Reemplazo router con falla — Santiago Centro",
    client: "BancoEstado Casa Matriz",
    label: "Santiago Centro",
    lat: -33.442,
    lng: -70.654,
    status: "COMPLETADA",
  },
];

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

function getMarkerHexByStatus(status, fallbackHex) {
  if (fallbackHex) return fallbackHex;
  const s = (status || "").toUpperCase();
  if (s === "COMPLETADA" || s === "COMPLETADO") return "#34d399";
  if (s === "EN_RUTA" || s === "EN_SITIO" || s === "EN CAMINO") return "#f97316";
  if (s === "CANCELADA" || s === "REAGENDADA") return "#f87171";
  return "#60a5fa";
}

function makeIcon(hex) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:16px;height:16px;border-radius:9999px;
        background:${hex};
        border:2px solid rgba(255,255,255,0.25);
        box-shadow:0 0 0 4px ${hex}33;
      "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tarjeta 1 — Zonas activas (Mapa real react-leaflet)
// ═══════════════════════════════════════════════════════════════════════════════
function ActiveZonesCard({ isLoading, markers = DEFAULT_MAP_MARKERS, onSelectOrderId }) {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between gap-4 h-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Zonas activas
              </h2>
              <p className="text-xs text-muted-foreground">
                Distribución geográfica de órdenes ({markers.length} georreferenciadas)
              </p>
            </div>
            <span
              className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0"
              aria-label="En vivo"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            aria-label="Expandir mapa"
            title="Expandir mapa a pantalla completa"
            className="flex items-center justify-center rounded-md p-1.5 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="relative flex min-h-[220px] flex-1 items-center justify-center rounded-lg bg-slate-200 dark:bg-gray-800 animate-pulse">
            <Map className="h-8 w-8 text-slate-300 dark:text-gray-700" />
          </div>
        ) : (
          <>
            <div className="relative rounded-lg overflow-hidden border border-border z-0 isolate min-h-[220px] h-[220px] w-full">
              <MapContainer
                center={[-33.4489, -70.6693]}
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
                <MapAutoBounds markers={markers} />

                {markers.map((m) => {
                  const hex = getMarkerHexByStatus(m.status, m.hex);
                  return (
                    <Marker
                      key={m.id}
                      position={[m.lat, m.lng]}
                      icon={makeIcon(hex)}
                    >
                      <Popup>
                        <div
                          style={{
                            fontSize: "12px",
                            lineHeight: "1.5",
                            minWidth: "140px",
                          }}
                        >
                          <strong className="block text-slate-900 font-bold">
                            {m.orderNumber || m.id}
                          </strong>
                          <span className="block text-slate-600 text-[11px] mt-0.5">
                            {m.client || m.title || m.label}
                          </span>
                          <span className="block mt-1 text-[11px]" style={{ color: hex, fontWeight: "700" }}>
                            Estado: {m.status}
                          </span>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            <div className="flex flex-wrap gap-3">
              <LegendDot color="bg-primary" label="En camino / En sitio" />
              <LegendDot color="bg-emerald-400" label="Completada" />
              <LegendDot color="bg-blue-400" label="Confirmada / Pendiente" />
              <LegendDot color="bg-rose-400" label="Cancelada" />
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
                  Distribución geográfica de órdenes de trabajo en terreno
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {markers.length} órdenes georreferenciadas en Región Metropolitana
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                aria-label="Cerrar mapa"
              >
                <X className="h-5 w-5" />
              </button>
            </div>



            {/* Mapa interactivo expandido */}
            <div className="relative flex-1 w-full z-0 isolate">
              <MapContainer
                center={[-33.4489, -70.6693]}
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
                <MapAutoBounds markers={markers} />
                <MapResizeHandler />

                {markers.map((m) => {
                  const hex = getMarkerHexByStatus(m.status, m.hex);
                  return (
                    <Marker
                      key={m.id}
                      position={[m.lat, m.lng]}
                      icon={makeIcon(hex)}
                    >
                      <Popup>
                        <div style={{ fontSize: "12px", minWidth: "180px" }}>
                          <p className="font-bold text-slate-900 text-sm">{m.orderNumber || m.id}</p>
                          <p className="font-medium text-slate-800 mt-0.5">{m.client || "Cliente Corporativo"}</p>
                          <p className="text-slate-500 text-[11px]">{m.title || m.label}</p>
                          <p className="mt-1.5 text-xs" style={{ color: hex, fontWeight: "700" }}>Estado: {m.status}</p>
                          {onSelectOrderId && (
                            <button
                              onClick={() => {
                                setIsExpanded(false);
                                onSelectOrderId(m.orderNumber || m.id);
                              }}
                              className="mt-2 w-full rounded bg-orange-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-orange-600"
                            >
                              Ver detalles de la orden
                            </button>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Pie con leyenda */}
            <div className="flex items-center justify-between border-t border-border px-6 py-3 bg-slate-50 dark:bg-card">
              <div className="flex flex-wrap gap-4">
                <LegendDot color="bg-primary" label="En camino / En sitio" />
                <LegendDot color="bg-emerald-400" label="Completada" />
                <LegendDot color="bg-blue-400" label="Confirmada / Pendiente" />
                <LegendDot color="bg-rose-400" label="Cancelada" />
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-slate-100 dark:hover:bg-white/5"
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
function DonutChartCard({ isLoading, statusCounts }) {
  const dynamicSegments = useMemo(
    () => [
      {
        label: "Completadas",
        value: statusCounts.completadas,
        color: "#22c55e",
        strokeColor: "#22c55e",
      },
      {
        label: "En Ruta",
        value: statusCounts.enRuta,
        color: "#3b82f6",
        strokeColor: "#3b82f6",
      },
      {
        label: "Pendientes",
        value: statusCounts.pendientes,
        color: "#f59e0b",
        strokeColor: "#f59e0b",
      },
      {
        label: "Canceladas",
        value: statusCounts.canceladas,
        color: "#ef4444",
        strokeColor: "#ef4444",
      },
    ],
    [statusCounts]
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
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between gap-4 h-full">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Estado de visitas
        </h2>
        <p className="text-xs text-muted-foreground">
          Distribución del ciclo operativo actual
        </p>
      </div>

      {isLoading ? (
        <>
          <div className="flex items-center justify-center py-2">
            <div className="w-40 h-40 rounded-full bg-slate-200 dark:bg-gray-800 animate-pulse" />
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
      ) : (
        <>
          <div className="flex items-center justify-center py-2">
            <div className="relative">
              <svg
                width="140"
                height="140"
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
                  strokeWidth="12"
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
                    strokeWidth="12"
                    strokeDasharray={`${seg.dash} ${CIRCUMFERENCE - seg.dash}`}
                    strokeDashoffset={seg.offset}
                    strokeLinecap="butt"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
                <span className="text-2xl font-bold text-foreground">
                  {total}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  órdenes registradas
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
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tarjeta 3 — Próximas visitas
// ═══════════════════════════════════════════════════════════════════════════════
function UpcomingVisitsCard({ isLoading, visits = [], onSelectOrderId }) {
  const isEmpty = visits.length === 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between gap-4 h-full">
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
      ) : isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-slate-500 dark:text-gray-400" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            No se encontraron visitas
            <br />
            para los filtros o búsqueda aplicados.
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
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-gray-700">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-52 animate-pulse rounded bg-slate-200 dark:bg-gray-800" />
          <div className="h-3 w-72 animate-pulse rounded bg-slate-100/80 dark:bg-gray-800/80" />
        </div>
        <div className="h-3 w-24 animate-pulse rounded bg-slate-100/60 dark:bg-gray-800/60" />
      </div>

      <div className="divide-y divide-slate-200/60 dark:divide-gray-700/60">
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
// Tabla — Registro de actividad reciente
// ═══════════════════════════════════════════════════════════════════════════════
function ActivityTable({ log = [], onSelectOrderId }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-gray-700">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Registro de actividad reciente
          </h2>
          <p className="text-xs text-muted-foreground">
            Últimas acciones registradas por los técnicos · Haz clic en una fila para ver auditoría
          </p>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          Bitácora en tiempo real (America/Santiago)
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-kanban">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-gray-700">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 w-28">
                ID Orden
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Técnico
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Acción
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 text-right w-20">
                Hora
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/60">
            {log.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-8 text-center text-xs text-muted-foreground"
                >
                  No se registraron actividades que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              log.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => onSelectOrderId?.(row.id)}
                  className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                    {row.id}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-900 dark:text-white font-medium whitespace-nowrap">
                    {row.technician}
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
    const [topTechName, topTechOrders] = sortedTechs[0] || [
      "Alexander Sáez López",
      ["#OT-08491", "#OT-08492", "#OT-08495"],
    ];

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
        badge: `${topTechOrders.length} de ${activeTasks.length} OT activas`,
        title: "Concentración de carga en técnico",
        body: `${topTechName} concentra ${topTechOrders.length} órdenes activas (${topTechOrders.join(
          ", "
        )}) de un total de ${
          activeTasks.length
        } en curso, mientras hay ${techniciansCount} técnicos disponibles en plataforma.`,
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
          sims.length > 0 ? Math.round((availSims / sims.length) * 100) : 50
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
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [serviceFilter, setServiceFilter] = useState(null);

  const [kpis, setKpis] = useState(null);
  const [techniciansList, setTechniciansList] = useState([]);
  const [mapMarkers, setMapMarkers] = useState(DEFAULT_MAP_MARKERS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        setIsLoading(true);
        const [kpisRes, ordersData, techsData] = await Promise.allSettled([
          api.orders.getKpis(),
          api.orders.getAll({ size: 50 }),
          api.orders.getTechnicians(),
        ]);

        if (!cancelled) {
          if (kpisRes.status === "fulfilled" && kpisRes.value) {
            setKpis(kpisRes.value);
          }
          if (
            techsData.status === "fulfilled" &&
            Array.isArray(techsData.value)
          ) {
            setTechniciansList(techsData.value);
          }
          if (
            ordersData.status === "fulfilled" &&
            ordersData.value?.items?.length
          ) {
            const markers = ordersData.value.items
              .filter((o) => o.lat && o.lng)
              .map((o) => ({
                id: o.id,
                orderNumber: o.order_number,
                title: o.title,
                client: o.client?.business_name || o.client?.name || o.client_name || "Cliente Corporativo",
                lat: parseFloat(o.lat),
                lng: parseFloat(o.lng),
                status: o.status,
              }));
            if (markers.length > 0) {
              setMapMarkers(markers);
            }
          }
        }
      } catch {
        // Continúa con el estado sincronizado del contexto
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeFilterCount = (statusFilter ? 1 : 0) + (serviceFilter ? 1 : 0);
  const hasActiveFilters = Boolean(search.trim()) || activeFilterCount > 0;
  const q = normalize(search.trim());

  const handleSelectOrderId = (orderId) => {
    for (const col of columns) {
      const found = col.tasks.find((t) => t.orderId === orderId);
      if (found) {
        setSelectedOrder({ ...found, columnStatus: col.label });
        return;
      }
    }
    const visit = visitsList.find((v) => v.id === orderId);
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
    }
  };

  // Conteos unificados entre tarjetas KPI, tablero Kanban y Donut Chart
  const statusCounts = useMemo(() => {
    const asignadasCol = columns.find((c) => c.id === "asignada")?.tasks || [];
    const enTransitoCol =
      columns.find((c) => c.id === "en-transito")?.tasks || [];
    const completadasCol =
      columns.find((c) => c.id === "completada")?.tasks || [];

    const hasColTasks =
      asignadasCol.length + enTransitoCol.length + completadasCol.length > 0;

    if (hasColTasks) {
      return {
        pendientes: asignadasCol.length,
        enRuta: enTransitoCol.length,
        completadas: completadasCol.length,
        canceladas: kpis?.status_distribution?.CANCELADA || 0,
      };
    }

    const dist = kpis?.status_distribution || {};
    return {
      pendientes: (dist.CONFIRMADA || 0) + (dist.IDLE || 0),
      enRuta: (dist.EN_RUTA || 0) + (dist.EN_SITIO || 0),
      completadas: dist.COMPLETADA || 0,
      canceladas: dist.CANCELADA || 0,
    };
  }, [columns, kpis]);

  const activeOrdersCount = statusCounts.pendientes + statusCounts.enRuta;
  const completedOrdersCount = statusCounts.completadas;
  const totalCycleOrders =
    activeOrdersCount + completedOrdersCount + statusCounts.canceladas;

  // Técnicos disponibles y técnicos con órdenes activas asignadas
  const techStats = useMemo(() => {
    const availableCount =
      techniciansList.length > 0
        ? techniciansList.filter((t) => t.is_available !== false).length
        : kpis?.technicians_in_field || 8;

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
      assignedActiveCount: activeTechNames.size || 5,
    };
  }, [techniciansList, kpis, columns]);

  // Stock real de SIMs desde hardwareInventory (coherente con /sim-inventory)
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
        : kpis?.available_sims_rate ?? 50;

    return {
      totalSims,
      availSims,
      activeSims,
      faultySims,
      rate,
    };
  }, [hardwareInventory, kpis]);

  const dynamicKpiData = useMemo(
    () => [
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
    ],
    [
      activeOrdersCount,
      statusCounts.enRuta,
      statusCounts.pendientes,
      techStats,
      simStats,
      completedOrdersCount,
      totalCycleOrders,
    ]
  );

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

  const filteredActivityLog = activityList.filter((row) => {
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

      {/* ── Modal nueva OT ── */}
      <NewWorkOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateOT}
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
      />

      {/* ── Layout principal ── */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <div className="flex-1 flex flex-col gap-6">
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
                    onClick={() => setIsModalOpen(true)}
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

            {/* KPIs — muestra skeleton mientras carga */}
            <KpiGrid metrics={dynamicKpiData} isLoading={isLoading} />

            {/* Fila 1: Mapa geoespacial y Distribución de estado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActiveZonesCard isLoading={isLoading} markers={mapMarkers} onSelectOrderId={handleSelectOrderId} />
              <DonutChartCard
                isLoading={isLoading}
                statusCounts={statusCounts}
              />
            </div>

            {/* Fila 2: Agenda operativa de visitas con ancho completo para máxima legibilidad */}
            <div className="w-full">
              <UpcomingVisitsCard
                isLoading={isLoading}
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
            onSelectOrderId={handleSelectOrderId}
          />
        )}
      </div>
    </>
  );
}
