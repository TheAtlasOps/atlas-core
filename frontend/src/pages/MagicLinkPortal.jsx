import { useParams } from "react-router-dom";
import { MapPin, Clock, CheckCircle2, Truck, Wrench, Phone } from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_ORDER = {
  status: "En ruta",
  statusKey: "en_ruta", // idle | confirmada | en_ruta | en_sitio | completada
  technician: {
    name: "Carlos Mendoza",
    phone: "+56 9 8765 4321",
    avatar: "CM",
  },
  eta: "14:30",
  etaLabel: "Llegada estimada",
  address: "Av. Providencia 1234, Piso 3",
  serviceType: "Instalación Fibra Óptica",
  orderNumber: "OT-2024-08491",
};

// ─── Status Config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  idle: {
    label: "Pendiente de asignación",
    color: "bg-yellow-100 text-yellow-800",
    dot: "bg-yellow-400",
    icon: Clock,
  },
  confirmada: {
    label: "Visita confirmada",
    color: "bg-blue-100 text-blue-800",
    dot: "bg-blue-400",
    icon: CheckCircle2,
  },
  en_ruta: {
    label: "Técnico en ruta",
    color: "bg-orange-100 text-orange-800",
    dot: "bg-orange-400",
    icon: Truck,
  },
  en_sitio: {
    label: "Técnico en el lugar",
    color: "bg-purple-100 text-purple-800",
    dot: "bg-purple-400",
    icon: Wrench,
  },
  completada: {
    label: "Servicio completado",
    color: "bg-green-100 text-green-800",
    dot: "bg-green-400",
    icon: CheckCircle2,
  },
};

// ─── Progress Steps ─────────────────────────────────────────────────────────
const STEPS = [
  { key: "confirmada", label: "Confirmada" },
  { key: "en_ruta", label: "En ruta" },
  { key: "en_sitio", label: "En sitio" },
  { key: "completada", label: "Completada" },
];

const STEP_ORDER = ["idle", "confirmada", "en_ruta", "en_sitio", "completada"];

function getStepIndex(key) {
  return STEP_ORDER.indexOf(key);
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function MagicLinkPortal() {
  const { uuid } = useParams();
  const order = MOCK_ORDER;
  const statusCfg = STATUS_CONFIG[order.statusKey] ?? STATUS_CONFIG.idle;
  const StatusIcon = statusCfg.icon;
  const currentStepIdx = getStepIndex(order.statusKey);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-orange-50 to-white flex flex-col items-center px-4 py-8">
      {/* ── Logo / Header ── */}
      <header className="w-full max-w-md mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Logo placeholder – reemplazar con <img> cuando esté disponible */}
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm select-none">
            A
          </div>
          <span className="font-semibold text-gray-900 text-sm">Atlas · Entel</span>
        </div>
        <span className="text-xs text-gray-500 font-mono">{order.orderNumber}</span>
      </header>

      {/* ── Main Card ── */}
      <main className="w-full max-w-md flex flex-col gap-4">

        {/* Status Badge */}
        <div
          className={`flex items-center gap-2 self-start px-3 py-1.5 rounded-full text-sm font-medium ${statusCfg.color}`}
        >
          <span className={`w-2 h-2 rounded-full animate-pulse ${statusCfg.dot}`} />
          {statusCfg.label}
        </div>

        {/* Hero Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col gap-5">

          {/* Service Info */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Tipo de servicio
            </p>
            <h1 className="text-xl font-bold text-gray-900">{order.serviceType}</h1>
          </div>

          {/* ETA */}
          <div className="flex items-center gap-4 bg-orange-50 rounded-xl p-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{order.etaLabel}</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{order.eta}</p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-800">{order.address}</p>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">
            Progreso de la visita
          </p>
          <div className="flex items-start gap-0">
            {STEPS.map((step, idx) => {
              const stepIdx = getStepIndex(step.key);
              const isDone = stepIdx < currentStepIdx;
              const isActive = stepIdx === currentStepIdx;
              const isLast = idx === STEPS.length - 1;

              return (
                <div key={step.key} className="flex-1 flex flex-col items-center gap-1.5">
                  {/* Connector row */}
                  <div className="w-full flex items-center">
                    {/* Left bar */}
                    <div
                      className={`flex-1 h-0.5 ${idx === 0 ? "invisible" : isDone || isActive ? "bg-primary" : "bg-gray-200"}`}
                    />
                    {/* Dot */}
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 border-2 transition-all ${
                        isDone
                          ? "bg-primary border-primary"
                          : isActive
                          ? "bg-white border-primary ring-2 ring-orange-200"
                          : "bg-white border-gray-300"
                      }`}
                    />
                    {/* Right bar */}
                    <div
                      className={`flex-1 h-0.5 ${isLast ? "invisible" : isDone ? "bg-primary" : "bg-gray-200"}`}
                    />
                  </div>
                  {/* Label */}
                  <span
                    className={`text-[10px] text-center leading-tight ${
                      isActive ? "text-primary font-semibold" : isDone ? "text-gray-800" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technician Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            Tu técnico asignado
          </p>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {order.technician.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{order.technician.name}</p>
              <p className="text-xs text-gray-500">{order.technician.phone}</p>
            </div>
            {/* Call CTA – text-white se conserva: fondo bg-primary oscuro */}
            <a
              href={`tel:${order.technician.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-3 py-2 rounded-xl shrink-0 active:scale-95 transition-transform"
              aria-label={`Llamar a ${order.technician.name}`}
            >
              <Phone className="w-3.5 h-3.5" />
              Llamar
            </a>
          </div>
        </div>

        {/* UUID debug pill – only visible during development */}
        {import.meta.env.DEV && (
          <p className="text-center text-[10px] text-gray-400 font-mono break-all px-2">
            uuid: {uuid}
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 text-xs text-gray-400 text-center">
        Powered by Atlas · © {new Date().getFullYear()} Entel
      </footer>
    </div>
  );
}
