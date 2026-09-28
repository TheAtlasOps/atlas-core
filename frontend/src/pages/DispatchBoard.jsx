import { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowUpRight,
  Plus,
  ClipboardList,
  Users,
  CreditCard,
  X,
  FilePlus,
  Maximize2,
  CheckCircle2,
  Map,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import KpiGrid from "../components/layout/KpiGrid";

// ─── KPI Data ─────────────────────────────────────────────────────────────────
const kpiData = [
  {
    label: "Ordenes Activas",
    value: "32",
    delta: "+3 esta semana",
    icon: ClipboardList,
  },
  {
    label: "Tecnicos en Campo",
    value: "128",
    delta: "-12 vs semana pasada",
    icon: Users,
  },
  {
    label: "SIMs Disponibles",
    value: "99.8%",
    delta: "Todos los sistemas operativos",
    icon: CreditCard,
  },
];

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
    label: "Providencia",
    lat: -33.432,
    lng: -70.6093,
    status: "En camino",
    hex: "#f97316",
  },
  {
    id: 2,
    label: "Las Condes",
    lat: -33.4103,
    lng: -70.5684,
    status: "En camino",
    hex: "#f97316",
  },
  {
    id: 3,
    label: "Ñuñoa",
    lat: -33.4569,
    lng: -70.599,
    status: "Completada",
    hex: "#34d399",
  },
  {
    id: 4,
    label: "Santiago Centro",
    lat: -33.4489,
    lng: -70.6693,
    status: "Programada",
    hex: "#60a5fa",
  },
];

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
function ActiveZonesCard({ isLoading }) {
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
          className="flex items-center justify-center rounded-md p-1 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        /* ── Skeleton del mapa ── */
        <div className="relative flex h-75 items-center justify-center rounded-lg bg-gray-800 animate-pulse">
          <Map className="h-8 w-8 text-gray-700" />
        </div>
      ) : (
        <>
          {/* Contenedor del mapa — overflow-hidden para respetar el border-radius */}
          <div
            className="relative rounded-lg overflow-hidden border border-border"
            style={{ height: "200px" }}
          >
            <MapContainer
              center={[-33.4489, -70.6693]}
              zoom={12}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%", background: "#0d0d0d" }}
              zoomControl={false}
              attributionControl={false}
            >
              {/* TileLayer dark mode — CartoDB rastertiles (libre, sin API key, sin marca de agua) */}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png"
                subdomains="abcd"
                maxZoom={19}
              />

              {/* Marcadores con divIcon personalizados */}
              {MAP_MARKERS.map((m) => (
                <Marker key={m.id} position={[m.lat, m.lng]} icon={makeIcon(m.hex)}>
                  <Popup>
                    <div
                      style={{
                        fontSize: "12px",
                        lineHeight: "1.5",
                        minWidth: "100px",
                      }}
                    >
                      <strong>{m.label}</strong>
                      <br />
                      <span style={{ color: m.hex }}>{m.status}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Leyenda */}
          <div className="flex flex-wrap gap-3">
            <LegendDot color="bg-primary"     label="En camino" />
            <LegendDot color="bg-emerald-400" label="Completada" />
            <LegendDot color="bg-blue-400"    label="Programada" />
            <LegendDot color="bg-rose-400"    label="Reagendada" />
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
    time: "14:00",
    service: "Instalación fibra óptica",
    client: "Sr. Ramírez — Providencia",
    status: "En camino",
    statusStyle: "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/25",
  },
  {
    time: "14:30",
    service: "Cambio de SIM corporativa",
    client: "Entel HQ — Santiago Centro",
    status: "Programada",
    statusStyle: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/25",
  },
  {
    time: "15:15",
    service: "Diagnóstico router empresarial",
    client: "Banco Estado — Las Condes",
    status: "Programada",
    statusStyle: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/25",
  },
  {
    time: "16:00",
    service: "Revisión antena 4G",
    client: "Torre Entel — Las Condes",
    status: "Reagendada",
    statusStyle: "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/25",
  },
  {
    time: "17:30",
    service: "Activación Magic Link",
    client: "PYME Clientes — Ñuñoa",
    status: "Programada",
    statusStyle: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/25",
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
            <div className="w-40 h-40 rounded-full bg-gray-800 animate-pulse" />
          </div>
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-700 animate-pulse shrink-0" />
                  <div
                    className="h-3 animate-pulse rounded bg-gray-800"
                    style={{ width: `${60 + i * 12}px` }}
                  />
                </div>
                <div className="h-3 w-8 animate-pulse rounded bg-gray-800/70" />
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
                  className="text-white/5"
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
function UpcomingVisitsCard({ isLoading }) {
  // Cambia a `true` para ver el empty state cuando no hay visitas
  const isEmpty = false;

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
          href="#"
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
              <div className="w-12 h-4 rounded bg-gray-800 animate-pulse shrink-0" />
              {/* Skeleton detalle + pill */}
              <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="h-4 w-3/4 rounded bg-gray-800 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-gray-800/70 animate-pulse" />
                </div>
                <div className="h-5 w-16 rounded-full bg-gray-800/70 animate-pulse shrink-0" />
              </div>
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        /* ── Empty State ── */
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-gray-500" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Agenda al día.
            <br />
            No hay visitas pendientes.
          </p>
        </div>
      ) : (
        /* ── Lista de visitas ── */
        <ol className="flex flex-col divide-y divide-border">
          {UPCOMING_VISITS.map((visit, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
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
                  {visit.client}
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
    time: "13:52",
  },
  {
    id: "#OT-08495",
    technician: "Elena Kravets",
    action: "Inició desplazamiento hacia el lugar",
    time: "13:47",
  },
  {
    id: "#OT-08492",
    technician: "Luis Pinto",
    action: "Aceptó la OT asignada",
    time: "13:30",
  },
  {
    id: "#OT-08496",
    technician: "Elena Kravets",
    action: "Actualizó estado a En Tránsito",
    time: "13:15",
  },
  {
    id: "#OT-08499",
    technician: "Luis Pinto",
    action: "Marcó visita como completada",
    time: "12:58",
  },
  {
    id: "#OT-08493",
    technician: "María Kovalenko",
    action: "Aceptó la OT asignada",
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
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-52 animate-pulse rounded bg-gray-800" />
          <div className="h-3 w-72 animate-pulse rounded bg-gray-800/80" />
        </div>
        <div className="h-3 w-24 animate-pulse rounded bg-gray-800/60" />
      </div>

      {/* Filas skeleton */}
      <div className="divide-y divide-gray-800/60">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 px-5 py-4">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-800/80" />
            <div className="h-4 w-28 animate-pulse rounded bg-gray-800/80" />
            <div className="h-4 w-48 animate-pulse rounded bg-gray-800/80" />
            <div className="h-4 w-10 animate-pulse rounded bg-gray-800/60 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tabla — Registro de actividad reciente
// ═══════════════════════════════════════════════════════════════════════════════
function ActivityTable() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Encabezado de la sección */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Registro de actividad reciente
          </h2>
          <p className="text-xs text-muted-foreground">
            Últimas acciones registradas por los técnicos
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
            <tr className="border-b border-gray-800">
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 w-28">
                ID Orden
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Técnico
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Acción
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right w-20">
                Hora
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {ACTIVITY_LOG.map((row, idx) => (
              <tr key={idx} className="transition-colors hover:bg-white/2">
                <td className="px-5 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">
                  {row.id}
                </td>
                <td className="px-5 py-3 text-sm text-gray-200 font-medium whitespace-nowrap">
                  {row.technician}
                </td>
                <td className="px-5 py-3 text-sm text-gray-400">
                  {row.action}
                </td>
                <td className="px-5 py-3 text-xs text-gray-500 font-mono tabular-nums text-right whitespace-nowrap">
                  {row.time}
                </td>
              </tr>
            ))}
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
              className="h-24 rounded-md bg-gray-800 animate-pulse"
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
export default function DispatchBoard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Simula latencia de red — reemplazar por fetch real contra la BD ──────────
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* ── Modal nueva OT (sin cambios) ── */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <FilePlus className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="modal-title"
                    className="text-base font-semibold text-foreground"
                  >
                    Nueva Orden de Trabajo
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Completa los detalles para despachar
                  </p>
                </div>
              </div>
              <button
                aria-label="Cerrar modal"
                onClick={() => setIsModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Tipo de Servicio
                </label>
                <input
                  type="text"
                  placeholder="Ej: Instalacion fibra optica"
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Direccion del servicio
                </label>
                <input
                  type="text"
                  placeholder="Ej: Av. Providencia 1234, Santiago"
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Descripcion
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe el problema o requerimiento del cliente..."
                  className="w-full resize-none rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                id="btn-cancel-modal"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                id="btn-create-ot"
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Crear OT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Layout principal ── */}
      <div className="flex flex-col gap-6">
        {/* Bloque superior: contenido central + sidebar AI */}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch">
          <div className="flex-1 flex flex-col gap-6">
            {/* Cabecera + botón Nueva OT (sin cambios) */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-balance">
                  Dispatch Board
                </h1>
                <p className="text-sm text-muted-foreground">
                  Estado en tiempo real de las ordenes de trabajo Entel.
                </p>
              </div>
              <button
                id="btn-new-ot"
                onClick={() => setIsModalOpen(true)}
                className="mt-3 sm:mt-0 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Nueva OT
              </button>
            </div>

            {/* KPIs — muestra skeleton mientras carga */}
            <KpiGrid metrics={kpiData} isLoading={isLoading} />

            {/* Cuadrícula analítica de 3 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ActiveZonesCard isLoading={isLoading} />
              <DonutChartCard isLoading={isLoading} />
              <UpcomingVisitsCard isLoading={isLoading} />
            </div>
          </div>

          {/* Panel lateral AI */}
          <div className="w-full xl:w-80 xl:shrink-0">
            <AiInsights isLoading={isLoading} />
          </div>
        </div>

        {/* ── Tabla de actividad — skeleton mientras carga ── */}
        {isLoading ? <ActivityTableSkeleton /> : <ActivityTable />}
      </div>
    </>
  );
}
