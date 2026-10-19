import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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

// ─── AI Insights Data ────────────────────────────────────────────────────────
const insights = [
  {
    title: "Sobrecarga de tecnicos detectada",
    body: "3 tecnicos tienen mas de 5 OT asignadas hoy. Considera redistribuir 4 ordenes para equilibrar la carga.",
  },
  {
    title: "Riesgo de incumplimiento de SLA",
    body: "La OT 'Instalacion fibra - Providencia' lleva 2 dias de retraso. Prioriza su resolucion para mantener el SLA.",
  },
  {
    title: "Oportunidad de eficiencia",
    body: "Agrupar las 3 OT del sector Las Condes podria reducir el tiempo de desplazamiento en ~40 min.",
  },
];

// ─── Mock: Marcadores del mapa (coordenadas reales de Santiago) ──────────────
const MAP_MARKERS = [
  {
    id: 1,
    orderNumber: "#OT-08491",
    title: "Instalación fibra óptica — Providencia",
    label: "Providencia",
    lat: -33.432,
    lng: -70.6093,
    status: "EN_RUTA",
    hex: "#f97316",
  },
  {
    id: 2,
    orderNumber: "#OT-08493",
    title: "Revisión antena 4G — Las Condes",
    label: "Las Condes",
    lat: -33.4103,
    lng: -70.5684,
    status: "EN_SITIO",
    hex: "#f97316",
  },
  {
    id: 3,
    orderNumber: "#OT-08495",
    title: "Activación Magic Link — Ñuñoa",
    label: "Ñuñoa",
    lat: -33.4569,
    lng: -70.599,
    status: "COMPLETADA",
    hex: "#34d399",
  },
  {
    id: 4,
    orderNumber: "#OT-08492",
    title: "Cambio de SIM corporativa — Santiago Centro",
    label: "Santiago Centro",
    lat: -33.4489,
    lng: -70.6693,
    status: "CONFIRMADA",
    hex: "#60a5fa",
  },
];

function getMarkerHexByStatus(status, fallbackHex) {
  if (fallbackHex) return fallbackHex;
  const s = (status || "").toUpperCase();
  if (s === "COMPLETADA" || s === "COMPLETADO") return "#34d399";
  if (s === "EN_RUTA" || s === "EN_SITIO" || s === "EN CAMINO") return "#f97316";
  if (s === "CANCELADA" || s === "REAGENDADA") return "#f87171";
  return "#60a5fa";
}

// divIcon personalizado: círculo con color de estado + halo
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
function ActiveZonesCard({ isLoading, markers = MAP_MARKERS }) {
  const { isDark } = useTheme();
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      {/* Header — siempre visible */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Zonas activas
            </h2>
            <p className="text-xs text-muted-foreground">
              Distribución geográfica de OT
            </p>
          </div>
          <span
            className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0"
            aria-label="En vivo"
          />
        </div>
        <button
          type="button"
          aria-label="Expandir mapa"
          className="flex items-center justify-center rounded-md p-1 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        /* ── Skeleton del mapa ── */
        <div className="relative flex h-75 items-center justify-center rounded-lg bg-slate-200 dark:bg-gray-800 animate-pulse">
          <Map className="h-8 w-8 text-slate-300 dark:text-gray-700" />
        </div>
      ) : (
        <>
          {/* Contenedor del mapa — overflow-hidden e isolate para respetar el stacking context */}
          <div
            className="relative rounded-lg overflow-hidden border border-border z-0 isolate"
            style={{ height: "200px" }}
          >
            <MapContainer
              center={[-33.4489, -70.6693]}
              zoom={12}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%", background: isDark ? "#0d0d0d" : "#e2e8f0" }}
              zoomControl={false}
              attributionControl={false}
            >
              {/* TileLayer según tema — CartoDB rastertiles (libre, sin API key, sin marca de agua) */}
              <TileLayer
                key={isDark ? "dark" : "light"}
                url={`https://{s}.basemaps.cartocdn.com/rastertiles/${isDark ? "dark_all" : "light_all"}/{z}/{x}/{y}.png`}
                subdomains="abcd"
                maxZoom={19}
              />

              {/* Marcadores con divIcon personalizados */}
              {markers.map((m) => {
                const hex = getMarkerHexByStatus(m.status, m.hex);
                return (
                  <Marker key={m.id} position={[m.lat, m.lng]} icon={makeIcon(hex)}>
                    <Popup>
                      <div
                        style={{
                          fontSize: "12px",
                          lineHeight: "1.5",
                          minWidth: "120px",
                        }}
                      >
                        <strong>
                          {m.orderNumber
                            ? `${m.orderNumber} · ${m.title || m.label || ""}`
                            : m.label}
                        </strong>
                        <br />
                        <span style={{ color: hex }}>{m.status}</span>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Leyenda */}
          <div className="flex flex-wrap gap-3">
            <LegendDot color="bg-primary"     label="En camino / En sitio" />
            <LegendDot color="bg-emerald-400" label="Completada" />
            <LegendDot color="bg-blue-400"    label="Confirmada" />
            <LegendDot color="bg-rose-400"    label="Cancelada" />
          </div>
        </>
      )}
    </div>
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

// ─── Mock: Donut chart ────────────────────────────────────────────────────────
// Circunferencia del SVG: r=40 → 2π·40 ≈ 251.2
const CIRCUMFERENCE = 251.2;
const DONUT_SEGMENTS = [
  { label: "En camino", value: 38, color: "#f97316", strokeColor: "#f97316" }, // orange-500
  { label: "Completadas", value: 29, color: "#34d399", strokeColor: "#34d399" }, // emerald-400
  { label: "Programadas", value: 22, color: "#60a5fa", strokeColor: "#60a5fa" }, // blue-400
  { label: "Reagendadas", value: 11, color: "#f87171", strokeColor: "#f87171" }, // red-400
];

// ─── Mock: Próximas visitas ───────────────────────────────────────────────────
const UPCOMING_VISITS = [
  {
    id: "#OT-08491",
    time: "14:00",
    service: "Instalación fibra óptica",
    serviceType: "Fibra",
    client: "Sr. Ramírez — Providencia",
    status: "En camino",
    statusStyle: "bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/25",
    technician: "Juan Rivas",
  },
  {
    id: "#OT-08492",
    time: "14:30",
    service: "Cambio de SIM corporativa",
    serviceType: "SIM",
    client: "Entel HQ — Santiago Centro",
    status: "Programada",
    statusStyle: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25",
    technician: "Luis Pinto",
  },
  {
    id: "#OT-08494",
    time: "15:15",
    service: "Diagnóstico router empresarial",
    serviceType: "Hardware",
    client: "Banco Estado — Las Condes",
    status: "Programada",
    statusStyle: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25",
    technician: "Tomás Castro",
  },
  {
    id: "#OT-08493",
    time: "16:00",
    service: "Revisión antena 4G",
    serviceType: "Red",
    client: "Torre Entel — Las Condes",
    status: "Reagendada",
    statusStyle: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/25",
    technician: "María Kovalenko",
  },
  {
    id: "#OT-08495",
    time: "17:30",
    service: "Activación Magic Link",
    serviceType: "Magic Link",
    client: "PYME Clientes — Ñuñoa",
    status: "Programada",
    statusStyle: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25",
    technician: "Elena Kravets",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Tarjeta 2 — Estado de visitas (Donut Chart SVG nativo)
// ═══════════════════════════════════════════════════════════════════════════════
function DonutChartCard({ isLoading }) {
  const total = DONUT_SEGMENTS.reduce((acc, s) => acc + s.value, 0);

  // Calculamos stroke-dasharray y stroke-dashoffset para cada segmento
  let accumulated = 0;
  const segments = DONUT_SEGMENTS.map((seg) => {
    const dash = (seg.value / total) * CIRCUMFERENCE;
    const offset = CIRCUMFERENCE - accumulated;
    accumulated += dash;
    return { ...seg, dash, offset };
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      {/* Header — siempre visible */}
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Estado de visitas
        </h2>
        <p className="text-xs text-muted-foreground">
          Distribución del estado actual
        </p>
      </div>

      {isLoading ? (
        /* ── Skeleton del donut ── */
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
        /* ── Gráfico real ── */
        <>
          {/* Donut SVG */}
          <div className="flex items-center justify-center py-2">
            <div className="relative">
              <svg
                width="140"
                height="140"
                viewBox="0 0 100 100"
                className="-rotate-90"
                aria-label="Gráfico donut de estado de visitas"
              >
                {/* Track de fondo */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-slate-900/10 dark:text-white/5"
                />
                {/* Segmentos */}
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
              {/* Centro del donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground tabular-nums">
                  {total}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  visitas hoy
                </span>
              </div>
            </div>
          </div>

          {/* Leyenda con valores */}
          <div className="flex flex-col gap-2">
            {DONUT_SEGMENTS.map((seg) => (
              <div key={seg.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-xs text-muted-foreground">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground tabular-nums">
                    {seg.value}
                  </span>
                  <span className="text-[10px] text-muted-foreground w-7 text-right tabular-nums">
                    {Math.round((seg.value / total) * 100)}%
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
function UpcomingVisitsCard({ isLoading, visits = UPCOMING_VISITS, onSelectOrderId }) {
  const isEmpty = visits.length === 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      {/* Header — siempre visible */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Próximas visitas
          </h2>
          <p className="text-xs text-muted-foreground">Agenda del día — hoy</p>
        </div>
        <a
          href="/work-orders"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Ver todas
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {isLoading ? (
        /* ── Skeleton de filas de visita ── */
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              {/* Skeleton hora */}
              <div className="w-12 h-4 rounded bg-slate-200 dark:bg-gray-800 animate-pulse shrink-0" />
              {/* Skeleton detalle + pill */}
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
        /* ── Empty State ── */
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-slate-500 dark:text-gray-400" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            No se encontraron visitas
            <br />
            para los filtros o búsqueda aplicados.
          </p>
        </div>
      ) : (
        /* ── Lista de visitas ── */
        <ol className="flex flex-col divide-y divide-border">
          {visits.map((visit, idx) => (
            <li
              key={idx}
              onClick={() => onSelectOrderId?.(visit.id)}
              className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer rounded-lg px-1.5 -mx-1.5 hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors"
              title={`Auditar ${visit.id}`}
            >
              {/* Hora */}
              <span className="w-10 shrink-0 text-xs text-muted-foreground tabular-nums font-mono pt-0.5">
                {visit.time}
              </span>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-snug truncate">
                  {visit.service}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {visit.client} {visit.technician && `· Técnico: ${visit.technician}`}
                </p>
              </div>
              {/* Pill de estado */}
              <span
                className={`
                  shrink-0 self-center rounded-full px-2 py-0.5
                  text-[10px] font-semibold uppercase tracking-wide
                  ${visit.statusStyle}
                `}
              >
                {visit.status}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ─── Mock: Registro de actividad reciente ────────────────────────────────────
const ACTIVITY_LOG = [
  {
    id: "#OT-08491",
    technician: "Juan Rivas",
    action: "Marcó visita como completada",
    status: "Completada",
    serviceType: "Fibra",
    time: "13:52",
  },
  {
    id: "#OT-08495",
    technician: "Elena Kravets",
    action: "Inició desplazamiento hacia el lugar",
    status: "En camino",
    serviceType: "Magic Link",
    time: "13:47",
  },
  {
    id: "#OT-08492",
    technician: "Luis Pinto",
    action: "Aceptó la OT asignada",
    status: "Programada",
    serviceType: "SIM",
    time: "13:30",
  },
  {
    id: "#OT-08496",
    technician: "Elena Kravets",
    action: "Actualizó estado a En Tránsito",
    status: "En camino",
    serviceType: "Red",
    time: "13:15",
  },
  {
    id: "#OT-08499",
    technician: "Luis Pinto",
    action: "Marcó visita como completada",
    status: "Completada",
    serviceType: "Hardware",
    time: "12:58",
  },
  {
    id: "#OT-08493",
    technician: "María Kovalenko",
    action: "Aceptó la OT asignada",
    status: "Programada",
    serviceType: "Red",
    time: "12:40",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Skeleton — Tabla de actividad reciente
// ═══════════════════════════════════════════════════════════════════════════════
function ActivityTableSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Encabezado idéntico al real */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-gray-700">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-52 animate-pulse rounded bg-slate-200 dark:bg-gray-800" />
          <div className="h-3 w-72 animate-pulse rounded bg-slate-100/80 dark:bg-gray-800/80" />
        </div>
        <div className="h-3 w-24 animate-pulse rounded bg-slate-100/60 dark:bg-gray-800/60" />
      </div>

      {/* Filas skeleton */}
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
function ActivityTable({ log = ACTIVITY_LOG, onSelectOrderId }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Encabezado de la sección */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-gray-700">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Registro de actividad reciente
          </h2>
          <p className="text-xs text-muted-foreground">
            Últimas acciones registradas por los técnicos · Haz clic en una fila para ver auditoría
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          Hoy · {new Date().toLocaleDateString("es-CL")}
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto scrollbar-kanban">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-gray-700">
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400 w-28">
                ID Orden
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                Técnico
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                Acción
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400 text-right w-20">
                Hora
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/60">
            {log.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-xs text-muted-foreground">
                  No se registraron actividades que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              log.map((row, idx) => (
                <tr
                  key={idx}
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
// Panel lateral — Atlas AI Field Insights (sin cambios)
// ═══════════════════════════════════════════════════════════════════════════════
function AiInsights({ isLoading }) {
  return (
    <aside className="rounded-xl border border-border border-t-2 border-t-primary bg-card p-5 h-full flex flex-col">
      {/* Header — siempre visible */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Atlas AI - Field Insights
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Optimizaciones generadas por IA
          </p>
        </div>
      </div>

      {isLoading ? (
        /* ── Skeleton de tarjetas de insight ── */
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-md bg-slate-200 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      ) : (
        /* ── Tarjetas reales ── */
        <div className="mt-4 flex flex-col gap-3">
          {insights.map((insight) => (
            <div
              key={insight.title}
              className="rounded-lg border border-border bg-background/40 p-3"
            >
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <p className="text-sm font-medium text-foreground">
                  {insight.title}
                </p>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                {insight.body}
              </p>
            </div>
          ))}
        </div>
      )}

      <button className="mt-auto pt-4 w-full rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
        Generar mas insights
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
    toast,
    setToast,
    createWorkOrder,
    totalOrders,
  } = useWorkOrders();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [serviceFilter, setServiceFilter] = useState(null);

  const [kpis, setKpis] = useState(null);
  const [mapMarkers, setMapMarkers] = useState(MAP_MARKERS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        setIsLoading(true);
        const [kpisRes, ordersData] = await Promise.all([
          api.orders.getKpis(),
          api.orders.getAll({ size: 50 }),
        ]);

        if (!cancelled) {
          if (kpisRes) {
            setKpis(kpisRes);
          }
          if (ordersData?.items?.length) {
            const markers = ordersData.items
              .filter((o) => o.lat && o.lng)
              .map((o) => ({
                id: o.id,
                orderNumber: o.order_number,
                title: o.title,
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
        // Fallback a datos Mock si el backend no está disponible (ej. Vercel)
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
        location: visit.client,
        priority: "MEDIA",
        assigneeName: visit.technician,
        tag: visit.serviceType,
        columnStatus: visit.status,
      });
    }
  };

  const completedMockCount = useMemo(() => {
    const completedCol = columns.find((c) => c.id === "completada");
    return completedCol ? completedCol.tasks.length : 3;
  }, [columns]);

  // 4 KPIs conectados a kpis.active_orders, kpis.technicians_in_field, kpis.available_sims_rate y kpis.completed_today con fallback
  const dynamicKpiData = useMemo(
    () => [
      {
        label: "Ordenes Activas",
        value: String(kpis?.active_orders ?? totalOrders),
        delta: "+3 esta semana",
        icon: ClipboardList,
      },
      {
        label: "Tecnicos en Campo",
        value: String(kpis?.technicians_in_field ?? 128),
        delta: "Activos en ruta RM",
        icon: Users,
      },
      {
        label: "SIMs Disponibles",
        value:
          kpis?.available_sims_rate !== undefined
            ? `${kpis.available_sims_rate}%`
            : "99.8%",
        delta: "Stock operativo Entel",
        icon: CreditCard,
      },
      {
        label: "Completadas Hoy",
        value: String(kpis?.completed_today ?? completedMockCount),
        delta: "SLA en cumplimiento",
        icon: CheckCircle2,
      },
    ],
    [kpis, totalOrders, completedMockCount]
  );

  const filteredVisits = visitsList.filter((visit) => {
    if (statusFilter && normalize(visit.status) !== normalize(statusFilter)) return false;
    if (serviceFilter && normalize(visit.serviceType) !== normalize(serviceFilter)) return false;
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
    if (statusFilter && normalize(row.status) !== normalize(statusFilter)) return false;
    if (serviceFilter && normalize(row.serviceType) !== normalize(serviceFilter)) return false;
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
        {/* Bloque superior: contenido central + sidebar AI */}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch">
          <div className="flex-1 flex flex-col gap-6">
            {/* Cabecera + búsqueda, filtros, Inventario y botón Nueva OT */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-balance">
                    Dispatch Board
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Estado en tiempo real de las ordenes de trabajo Entel.
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
                          setStatusFilter((cur) => (cur === status ? null : status))
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
                          setServiceFilter((cur) => (cur === service ? null : service))
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
                    <span>{filteredVisits.length} visitas</span>
                    <span>·</span>
                    <span>{filteredActivityLog.length} actividades</span>
                    {search.trim() && (
                      <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[11px] font-medium">
                        Texto: "{search.trim()}"
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

            {/* Cuadrícula analítica de 3 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ActiveZonesCard isLoading={isLoading} markers={mapMarkers} />
              <DonutChartCard isLoading={isLoading} />
              <UpcomingVisitsCard
                isLoading={isLoading}
                visits={filteredVisits}
                onSelectOrderId={handleSelectOrderId}
              />
            </div>
          </div>

          {/* Panel lateral AI */}
          <div className="w-full xl:w-80 xl:shrink-0">
            <AiInsights isLoading={isLoading} />
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
