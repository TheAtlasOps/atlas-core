import { useState } from "react";
import {
  Sparkles,
  ArrowUpRight,
  Plus,
  ClipboardList,
  Users,
  CreditCard,
  X,
  FilePlus,
} from "lucide-react";
import KpiGrid from "../components/layout/KpiGrid";

const kpiData = [
  { label: "Ordenes Activas", value: "32", delta: "+3 esta semana", icon: ClipboardList },
  { label: "Tecnicos en Campo", value: "128", delta: "-12 vs semana pasada", icon: Users },
  { label: "SIMs Disponibles", value: "99.8%", delta: "Todos los sistemas operativos", icon: CreditCard },
];

const columns = [
  {
    title: "Asignada", count: 4,
    cards: [
      { title: "Instalacion fibra optica - Providencia", tag: "Fibra", tagColor: "text-sky-400" },
      { title: "Revision antena 4G - Las Condes", tag: "Red", tagColor: "text-emerald-400" },
    ],
  },
  {
    title: "En Transito", count: 3,
    cards: [
      { title: "Cambio de SIM corporativa - Entel HQ", tag: "SIM", tagColor: "text-violet-400" },
      { title: "Diagnostico router - Vitacura", tag: "Hardware", tagColor: "text-amber-400" },
    ],
  },
  {
    title: "Completada", count: 2,
    cards: [
      { title: "Activacion Magic Link - Cliente PYME", tag: "Magic Link", tagColor: "text-rose-400" },
    ],
  },
];

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

function WorkOrderBoard() {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Work Order Overview</h2>
          <p className="text-xs text-muted-foreground">Vista rapida del flujo de ordenes activas</p>
        </div>
        <a href="#" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Ver tablero completo
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {columns.map((col) => (
          <div key={col.title} className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-foreground">{col.title}</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{col.count}</span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {col.cards.map((card) => (
                <div key={card.title} className="rounded-md border border-border bg-card p-3 transition-colors hover:border-primary/50">
                  <span className={`text-[11px] font-medium ${card.tagColor}`}>{card.tag}</span>
                  <p className="mt-1 text-sm text-foreground leading-snug">{card.title}</p>
                </div>
              ))}
              <button className="flex items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="h-3.5 w-3.5" />
                Agregar OT
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AiInsights() {
  return (
    <aside className="rounded-xl border border-border border-t-2 border-t-primary bg-card p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Atlas AI - Field Insights</h2>
          <p className="text-[11px] text-muted-foreground">Optimizaciones generadas por IA</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {insights.map((insight) => (
          <div key={insight.title} className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <p className="text-sm font-medium text-foreground">{insight.title}</p>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{insight.body}</p>
          </div>
        ))}
      </div>
      <button className="mt-4 w-full rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
        Generar mas insights
      </button>
    </aside>
  );
}

export default function DispatchBoard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {isModalOpen && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <FilePlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="modal-title" className="text-base font-semibold text-foreground">Nueva Orden de Trabajo</h2>
                  <p className="text-xs text-muted-foreground">Completa los detalles para despachar</p>
                </div>
              </div>
              <button aria-label="Cerrar modal" onClick={() => setIsModalOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tipo de Servicio</label>
                <input type="text" placeholder="Ej: Instalacion fibra optica" className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Direccion del servicio</label>
                <input type="text" placeholder="Ej: Av. Providencia 1234, Santiago" className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Descripcion</label>
                <textarea rows={3} placeholder="Describe el problema o requerimiento del cliente..." className="w-full resize-none rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button id="btn-cancel-modal" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors">Cancelar</button>
              <button id="btn-create-ot" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4" />
                Crear OT
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="flex-1 flex flex-col gap-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-balance">Dispatch Board</h1>
              <p className="text-sm text-muted-foreground">Estado en tiempo real de las ordenes de trabajo Entel.</p>
            </div>
            <button id="btn-new-ot" onClick={() => setIsModalOpen(true)} className="mt-3 sm:mt-0 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" />
              Nueva OT
            </button>
          </div>
          <KpiGrid metrics={kpiData} />
          <WorkOrderBoard />
        </div>
        <div className="w-full xl:w-80 xl:shrink-0">
          <AiInsights />
        </div>
      </div>
    </>
  );
}
