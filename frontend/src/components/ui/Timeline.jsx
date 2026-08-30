import { CheckCircle2, Circle, Clock, MapPin, Truck, Wrench, ClipboardCheck } from "lucide-react";

// ─── Types (JSDoc para autocompletar sin TS) ──────────────────────────────────
/**
 * @typedef {Object} TimelineStep
 * @property {string}  key         - Identificador único del paso.
 * @property {string}  label       - Nombre visible del hito.
 * @property {string}  [timestamp] - Hora formateada, ej. "09:15". Vacío si aún no ocurre.
 * @property {string}  [detail]    - Texto secundario/descripción del hito.
 * @property {React.ElementType} [icon] - Ícono lucide-react para este paso.
 */

// ─── Mock Data (usado cuando el componente se renderiza sin props) ─────────────
/** @type {TimelineStep[]} */
export const MOCK_TIMELINE_STEPS = [
  {
    key: "confirmada",
    label: "Orden confirmada",
    timestamp: "08:42",
    detail: "Solicitud registrada y agendada en el sistema Atlas.",
    icon: ClipboardCheck,
  },
  {
    key: "asignada",
    label: "Técnico asignado",
    timestamp: "09:05",
    detail: "Carlos Mendoza ha sido asignado a tu visita.",
    icon: CheckCircle2,
  },
  {
    key: "en_ruta",
    label: "Técnico en ruta",
    timestamp: "13:47",
    detail: "El técnico salió desde el centro de operaciones.",
    icon: Truck,
  },
  {
    key: "en_sitio",
    label: "En el lugar",
    timestamp: null,
    detail: "El técnico llegará a tu dirección en breve.",
    icon: MapPin,
  },
  {
    key: "completada",
    label: "Servicio completado",
    timestamp: null,
    detail: "La visita ha finalizado exitosamente.",
    icon: Wrench,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStepState(stepKey, currentKey, steps) {
  const keys = steps.map((s) => s.key);
  const stepIdx = keys.indexOf(stepKey);
  const currentIdx = keys.indexOf(currentKey);
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

// ─── Sub-component: Nodo del ícono ───────────────────────────────────────────
function StepIcon({ state, Icon }) {
  if (state === "done") {
    return (
      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">
        <CheckCircle2 className="w-4 h-4 text-white" />
      </div>
    );
  }
  if (state === "active") {
    return (
      <div className="w-9 h-9 rounded-full bg-white border-2 border-primary flex items-center justify-center shrink-0 shadow-md ring-4 ring-orange-100">
        <Icon className="w-4 h-4 text-primary" />
      </div>
    );
  }
  // pending
  return (
    <div className="w-9 h-9 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-gray-400" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
/**
 * Timeline vertical interactivo para el portal de cliente MagicLink.
 *
 * @param {{ steps?: TimelineStep[], currentKey?: string }} props
 */
export default function Timeline({ steps = MOCK_TIMELINE_STEPS, currentKey = "en_ruta" }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      {/* Encabezado de la sección */}
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-5">
        Historial de la visita
      </p>

      {/* Lista de hitos */}
      <ol className="relative flex flex-col gap-0">
        {steps.map((step, idx) => {
          const state = getStepState(step.key, currentKey, steps);
          const isLast = idx === steps.length - 1;
          const Icon = step.icon ?? Circle;

          return (
            <li key={step.key} className="flex gap-4">
              {/* Columna izquierda: ícono + conector vertical */}
              <div className="flex flex-col items-center">
                <StepIcon state={state} Icon={Icon} />
                {/* Línea conectora — no se pinta debajo del último ítem */}
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 my-1 rounded-full transition-colors ${
                      state === "done" ? "bg-primary/40" : "bg-gray-200"
                    }`}
                    style={{ minHeight: "2rem" }}
                  />
                )}
              </div>

              {/* Columna derecha: textos */}
              <div className={`pb-6 flex-1 min-w-0 ${isLast ? "pb-0" : ""}`}>
                {/* Fila label + timestamp */}
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <span
                    className={`text-sm font-semibold leading-tight ${
                      state === "pending" ? "text-gray-400" : "text-gray-900"
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.timestamp ? (
                    <span className="text-xs text-gray-500 font-mono tabular-nums shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {step.timestamp}
                    </span>
                  ) : (
                    state === "active" && (
                      <span className="text-xs text-primary font-medium shrink-0 animate-pulse">
                        En curso…
                      </span>
                    )
                  )}
                </div>

                {/* Descripción secundaria */}
                {step.detail && (
                  <p
                    className={`text-xs leading-relaxed ${
                      state === "pending" ? "text-gray-300" : "text-gray-500"
                    }`}
                  >
                    {step.detail}
                  </p>
                )}

                {/* Pill de estado activo */}
                {state === "active" && (
                  <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-orange-50 rounded-full border border-orange-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                    <span className="text-[10px] font-medium text-orange-700">Estado actual</span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
