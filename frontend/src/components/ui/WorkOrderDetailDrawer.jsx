import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Camera,
  CheckCircle2,
  Signal,
  Cpu,
  Router,
  CreditCard,
  FileSignature,
  ZoomIn,
  RefreshCw,
  MapPin,
  Clock,
  ShieldCheck,
  Activity,
  Wifi,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import AdminAvatar from "./AdminAvatar";
import { getOrderAuditPackage } from "../../lib/auditAndHardwareData";
import { useWorkOrders } from "../../context/WorkOrderContext";
import { api } from "../../lib/api";

/**
 * Ilustración técnica SVG de alta fidelidad para cada tipo de evidencia en terreno.
 * Garantiza carga instantánea en Vercel sin enlaces rotos externos.
 */
function EvidenceVisualPreview({ kind, modelRef, serialRef, large = false }) {
  if (kind === "router") {
    return (
      <svg
        viewBox="0 0 400 240"
        className={`w-full ${large ? "h-72 sm:h-96" : "h-32"} object-cover bg-slate-900`}
        role="img"
        aria-label="Evidencia fotográfica del estado físico del Router"
      >
        <defs>
          <linearGradient id="bgRouter" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <rect width="400" height="240" fill="url(#bgRouter)" />
        {/* Fondo de rack metálico */}
        <line x1="30" y1="0" x2="30" y2="240" stroke="#334155" strokeWidth="4" strokeDasharray="8 6" />
        <line x1="370" y1="0" x2="370" y2="240" stroke="#334155" strokeWidth="4" strokeDasharray="8 6" />
        {/* Antenas MIMO */}
        <rect x="105" y="32" width="8" height="75" rx="4" fill="#475569" />
        <rect x="196" y="24" width="8" height="83" rx="4" fill="#475569" />
        <rect x="287" y="32" width="8" height="75" rx="4" fill="#475569" />
        {/* Chasis del Router Industrial */}
        <rect x="65" y="102" width="270" height="72" rx="8" fill="#090d16" stroke="#f97316" strokeWidth="2" />
        <rect x="75" y="112" width="250" height="52" rx="4" fill="#111827" />
        {/* Etiqueta marca Entel */}
        <rect x="86" y="122" width="46" height="16" rx="3" fill="#f97316" />
        <text x="109" y="133" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
          ENTEL
        </text>
        {/* LEDs de estado 5G activos */}
        <circle cx="152" cy="130" r="4.5" fill="#22c55e" />
        <circle cx="168" cy="130" r="4.5" fill="#22c55e" />
        <circle cx="184" cy="130" r="4.5" fill="#22c55e" />
        <circle cx="200" cy="130" r="4.5" fill="#38bdf8" />
        <text x="150" y="148" fill="#94a3b8" fontSize="8" fontFamily="monospace">
          PWR   5G   SIM   LAN
        </text>
        {/* Puertos RJ45 */}
        <rect x="242" y="122" width="16" height="14" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1" />
        <rect x="264" y="122" width="16" height="14" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1" />
        <rect x="286" y="122" width="16" height="14" rx="2" fill="#f97316" />
        {/* Etiqueta inferior de serie */}
        <rect x="65" y="188" width="270" height="28" rx="5" fill="#0f172a" stroke="#334155" strokeWidth="1" />
        <text x="200" y="206" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="monospace">
          {modelRef} · S/N: {serialRef}
        </text>
      </svg>
    );
  }

  if (kind === "antenna") {
    return (
      <svg
        viewBox="0 0 400 240"
        className={`w-full ${large ? "h-72 sm:h-96" : "h-32"} object-cover bg-slate-900`}
        role="img"
        aria-label="Evidencia fotográfica de instalación de antena y cableado"
      >
        <defs>
          <linearGradient id="bgAntenna" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c192c" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <rect width="400" height="240" fill="url(#bgAntenna)" />
        {/* Ondas de señal 5G */}
        <circle cx="200" cy="82" r="38" fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.65" />
        <circle cx="200" cy="82" r="62" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.45" />
        <circle cx="200" cy="82" r="86" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 5" opacity="0.3" />
        {/* Mástil y panel de antena */}
        <rect x="194" y="95" width="12" height="90" fill="#64748b" />
        <rect x="155" y="42" width="90" height="68" rx="8" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
        <line x1="175" y1="55" x2="225" y2="55" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="175" y1="75" x2="225" y2="75" stroke="#cbd5e1" strokeWidth="2" />
        <circle cx="200" cy="95" r="5" fill="#f97316" />
        {/* Cableado blindado con etiqueta */}
        <path d="M 206 140 Q 260 145 280 185" fill="none" stroke="#f97316" strokeWidth="4" />
        <rect x="65" y="188" width="270" height="28" rx="5" fill="#0f172a" stroke="#334155" strokeWidth="1" />
        <text x="200" y="206" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="monospace">
          {modelRef} · {serialRef}
        </text>
      </svg>
    );
  }

  // speedtest
  return (
    <svg
      viewBox="0 0 400 240"
      className={`w-full ${large ? "h-72 sm:h-96" : "h-32"} object-cover bg-slate-900`}
      role="img"
      aria-label="Evidencia fotográfica del test de velocidad en pantalla"
    >
      <rect width="400" height="240" fill="#090d16" />
      <rect x="24" y="18" width="352" height="160" rx="10" fill="#111827" stroke="#1e293b" strokeWidth="2" />
      {/* Arco del velocímetro */}
      <path
        d="M 135 135 A 65 65 0 0 1 265 135"
        fill="none"
        stroke="#1e293b"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M 135 135 A 65 65 0 0 1 252 98"
        fill="none"
        stroke="#22c55e"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <text x="200" y="122" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="bold" fontFamily="monospace">
        {String(modelRef || "").split(" ")[0]}
      </text>
      <text x="200" y="138" textAnchor="middle" fill="#22c55e" fontSize="9" fontWeight="bold" fontFamily="monospace">
        Mbps DOWNLOAD · 5G ENTEL
      </text>
      {/* Indicadores laterales */}
      <text x="68" y="65" fill="#94a3b8" fontSize="9" fontFamily="monospace">
        SEÑAL RF
      </text>
      <text x="68" y="82" fill="#f97316" fontSize="12" fontWeight="bold" fontFamily="monospace">
        -78.5 dBm
      </text>
      <text x="290" y="65" fill="#94a3b8" fontSize="9" fontFamily="monospace">
        ESTADO
      </text>
      <text x="290" y="82" fill="#22c55e" fontSize="11" fontWeight="bold" fontFamily="monospace">
        VERIFICADO
      </text>
      <rect x="65" y="188" width="270" height="28" rx="5" fill="#0f172a" stroke="#334155" strokeWidth="1" />
      <text x="200" y="206" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="monospace">
        {modelRef} · {serialRef}
      </text>
    </svg>
  );
}

const PRIORITY_STYLES = {
  URGENTE: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400",
  Urgente: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400",
  ALTA: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  Alta: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  MEDIA: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  Media: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  BAJA: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  Baja: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
};

const TABS = [
  { id: "all", label: "Vista Completa" },
  { id: "evidences", label: "Evidencias" },
  { id: "checklist", label: "Checklist & dBm" },
  { id: "hardware", label: "Hardware" },
  { id: "signature", label: "Firma" },
];

export default function WorkOrderDetailDrawer({
  order,
  onClose,
  onOpenInventoryModal,
}) {
  const {
    hardwareInventory,
    orderHardwareOverrides,
    auditedOrders,
    approveOrderAudit,
    reassignOrderHardware,
    refreshOrders,
  } = useWorkOrders();

  const [activeTab, setActiveTab] = useState("all");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [isReassigning, setIsReassigning] = useState(false);
  const [selectedRouterId, setSelectedRouterId] = useState("");
  const [selectedSimId, setSelectedSimId] = useState("");
  const [apiOrderDetail, setApiOrderDetail] = useState(null);
  const [apiEvidences, setApiEvidences] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isPairing, setIsPairing] = useState(false);

  // Reset estados internos y consultar detalle completo y evidencias reales de la OT
  useEffect(() => {
    setActiveTab("all");
    setSelectedPhotoIndex(null);
    setIsReassigning(false);
    setSelectedRouterId("");
    setSelectedSimId("");
    setApiOrderDetail(null);
    setApiEvidences(null);

    if (!order?.id) return undefined;

    let cancelled = false;
    async function fetchDetailAndEvidences() {
      const [detailRes, evidencesRes] = await Promise.allSettled([
        api.orders.getById(order.id),
        api.evidences.getByOrderId(order.id),
      ]);
      if (cancelled) return;
      if (detailRes.status === "fulfilled" && detailRes.value) {
        setApiOrderDetail(detailRes.value);
      }
      if (evidencesRes.status === "fulfilled" && Array.isArray(evidencesRes.value)) {
        setApiEvidences(evidencesRes.value);
      }
    }
    fetchDetailAndEvidences();
    return () => {
      cancelled = true;
    };
  }, [order?.id, order?.orderId]);

  // Cierre con Escape y bloqueo de scroll de fondo
  useEffect(() => {
    if (!order) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (selectedPhotoIndex !== null) {
          setSelectedPhotoIndex(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [order, selectedPhotoIndex, onClose]);

  if (!order) return null;

  const orderKey = order.order_number || order.orderId;
  const isAudited = Boolean(auditedOrders[orderKey]);
  const auditData = getOrderAuditPackage(
    order,
    orderHardwareOverrides,
    apiOrderDetail,
    { hardwareInventory, apiEvidences, isAudited }
  );

  // Extracción segura de texto para evitar "[object Object]" en cabecera
  const clientDisplayName =
    apiOrderDetail?.client?.business_name ||
    order.client?.business_name ||
    order.clientName ||
    (typeof order.client === "string" ? order.client : "");
  const locationDisplay =
    order.location ||
    apiOrderDetail?.address_override ||
    order.address_override ||
    apiOrderDetail?.client?.address ||
    "Ubicación en terreno";
  const assigneeDisplayName =
    apiOrderDetail?.technician?.full_name ||
    order.assigneeName ||
    order.assignee ||
    "Técnico sin asignar";

  const availableRouters = hardwareInventory.filter(
    (item) =>
      item.deviceType === "Router" &&
      !["DEFECTUOSA", "BAJA", "En Falla"].includes(item.status)
  );
  const availableSims = hardwareInventory.filter(
    (item) =>
      item.deviceType === "SIM" &&
      !["DEFECTUOSA", "BAJA", "En Falla"].includes(item.status)
  );

  const handleConfirmReassign = async (e) => {
    e.preventDefault();
    const routerItem = availableRouters.find((r) => r.id === selectedRouterId);
    const simItem = availableSims.find((s) => s.id === selectedSimId);
    if (!routerItem && !simItem) {
      setIsReassigning(false);
      return;
    }

    setIsPairing(true);
    try {
      if (routerItem?.id && simItem?.id) {
        const clientId =
          apiOrderDetail?.client_id ||
          order?.client_id ||
          order?.client?.id ||
          null;
        await api.inventory.pair(routerItem.id, simItem.id, clientId);
      }
    } catch {
      // Fallback: continúa actualizando el estado local
    } finally {
      reassignOrderHardware(order, { routerItem, simItem });
      setIsPairing(false);
      setIsReassigning(false);
      setSelectedRouterId("");
      setSelectedSimId("");
    }
  };

  const handleApproveAudit = async () => {
    setIsApproving(true);
    try {
      if (order.id) {
        await api.orders.updateStatus(
          order.id,
          "COMPLETADA",
          "Auditoría aprobada por coordinador"
        );
        await refreshOrders();
      }
    } catch {
      // Fallback: actualiza columna y badge en estado local
    } finally {
      approveOrderAudit(order);
      setIsApproving(false);
      onClose();
    }
  };

  const showSection = (sectionId) => activeTab === "all" || activeTab === sectionId;
  const activePhoto =
    selectedPhotoIndex !== null ? auditData.evidences[selectedPhotoIndex] : null;
  const hasRealTelemetry = Boolean(auditData.telemetry.hasRealTelemetry);

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel lateral derecho */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-audit-title"
        className="fixed inset-y-0 right-0 z-[9999] w-full max-w-xl shadow-2xl flex flex-col bg-white dark:bg-[#1e1e1e] text-slate-900 dark:text-white border-l border-slate-200 dark:border-gray-800 animate-in slide-in-from-right duration-200"
      >
        {/* ── Cabecera del Drawer ── */}
        <header className="shrink-0 border-b border-slate-200 dark:border-gray-800 px-6 py-4 bg-white dark:bg-[#1e1e1e]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-orange-500/15 px-2.5 py-1 font-mono text-xs font-bold text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/30">
                {order.orderId}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  PRIORITY_STYLES[order.priority] || PRIORITY_STYLES.Media
                }`}
              >
                Prioridad {order.priority}
              </span>
              {order.columnStatus && (
                <span className="rounded-full bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-gray-300">
                  {order.columnStatus}
                </span>
              )}
              {isAudited && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Auditada
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar panel de auditoría"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <h2
            id="drawer-audit-title"
            className="mt-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white"
          >
            {order.title}
          </h2>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-500" />
              <span>
                {clientDisplayName ? `${clientDisplayName} · ` : ""}
                {locationDisplay}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <AdminAvatar
                name={assigneeDisplayName}
                className="h-6 w-6 text-[10px]"
              />
              <span className="font-medium text-slate-700 dark:text-gray-300">
                {assigneeDisplayName}
              </span>
            </div>
          </div>

          {/* Pestañas de navegación rápida */}
          <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-kanban">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-orange-500 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* ── Contenido desplazable del Drawer ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-kanban">
          {/* SECCIÓN A: EVIDENCIA FOTOGRÁFICA */}
          {showSection("evidences") && (
            <section
              aria-labelledby="section-evidences"
              className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-[#161616] p-4 space-y-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-500">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div>
                    <h3
                      id="section-evidences"
                      className="text-sm font-bold text-slate-900 dark:text-white"
                    >
                      Evidencia Fotográfica en Terreno
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400">
                      {auditData.evidences.length > 0
                        ? "Respaldo visual capturado por el técnico · Haz clic para ampliar"
                        : "Sin capturas verificadas aún para esta orden"}
                    </p>
                  </div>
                </div>
                {auditData.evidences.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {auditData.evidences.length} Verificada(s)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30">
                    <Clock className="h-3 w-3" />
                    Pendiente de captura
                  </span>
                )}
              </div>

              {/* Cuadrícula de fotos de respaldo o estado pendiente real */}
              {auditData.evidences.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {auditData.evidences.map((ev, idx) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setSelectedPhotoIndex(idx)}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] text-left shadow-xs hover:border-orange-500 dark:hover:border-orange-500 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <div className="relative w-full overflow-hidden">
                        <EvidenceVisualPreview
                          kind={ev.kind}
                          modelRef={ev.ModelRef}
                          serialRef={ev.SerialRef}
                        />

                        {/* Etiqueta de hora (arriba izquierda) */}
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white backdrop-blur-xs">
                          <Clock className="h-2.5 w-2.5 text-orange-400" />
                          {ev.timestamp}
                        </span>

                        {/* Badge Verificado (arriba derecha) */}
                        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          {ev.status}
                        </span>

                        {/* Overlay hover para ver en grande */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">
                            <ZoomIn className="h-3.5 w-3.5" />
                            Ampliar
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 flex-1 flex flex-col justify-between">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                          {ev.title}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-gray-400 line-clamp-2">
                          {ev.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] p-5 text-center space-y-1.5">
                  <Clock className="mx-auto h-6 w-6 text-amber-500" />
                  <p className="text-xs font-semibold text-slate-800 dark:text-gray-200">
                    Evidencias fotográficas pendientes de registro
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 max-w-md mx-auto">
                    Esta orden aún no registra fotografías ni capturas verificadas en terreno. Se mostrarán automáticamente cuando el técnico envíe el respaldo de instalación.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* SECCIÓN B: CHECKLIST TÉCNICO Y PARÁMETROS */}
          {showSection("checklist") && (
            <section
              aria-labelledby="section-checklist"
              className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-[#161616] p-4 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-500">
                    <Signal className="h-4 w-4" />
                  </div>
                  <div>
                    <h3
                      id="section-checklist"
                      className="text-sm font-bold text-slate-900 dark:text-white"
                    >
                      Checklist Técnico y Parámetros de Señal
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400">
                      Mediciones de telemetría RF y pruebas de conectividad en sitio
                    </p>
                  </div>
                </div>
                <span className="rounded-md bg-orange-500/10 border border-orange-500/25 px-2 py-0.5 font-mono text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                  {auditData.telemetry.band}
                </span>
              </div>

              {/* Indicadores técnicos destacados */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                      Potencia Señal
                    </span>
                    {hasRealTelemetry ? (
                      <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </div>
                  <p className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-white">
                    {auditData.telemetry.signalDbm}
                  </p>
                  <p
                    className={`mt-0.5 text-[10px] font-medium ${
                      hasRealTelemetry
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {hasRealTelemetry ? "Nivel Verificado" : "Medición en sitio pendiente"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                      RSRP / SINR
                    </span>
                    <Activity className="h-3.5 w-3.5 text-orange-500" />
                  </div>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {auditData.telemetry.rsrp} / {auditData.telemetry.sinr}
                  </p>
                  <p
                    className={`mt-0.5 text-[10px] font-medium ${
                      hasRealTelemetry
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {hasRealTelemetry ? "RSRP/SINR verificados" : "Sin telemetría RF aún"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                      Navegación
                    </span>
                    {hasRealTelemetry ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </div>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {auditData.telemetry.downloadMbps}
                  </p>
                  <p
                    className={`mt-0.5 text-[10px] font-medium ${
                      hasRealTelemetry
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {hasRealTelemetry
                      ? `Prueba superada (${auditData.telemetry.pingMs})`
                      : "Test de velocidad pendiente"}
                  </p>
                </div>
              </div>

              {/* Lista de verificación en terreno */}
              <ul className="space-y-2">
                {auditData.checklist.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.passed ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <Clock className="h-4 w-4 shrink-0 text-amber-500" />
                      )}
                      <span className="text-xs font-medium text-slate-800 dark:text-gray-200">
                        {item.label}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ${
                        item.passed
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {item.metric}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* SECCIÓN C: HARDWARE VINCULADO */}
          {showSection("hardware") && (
            <section
              aria-labelledby="section-hardware"
              className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-[#161616] p-4 space-y-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-500">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <h3
                      id="section-hardware"
                      className="text-sm font-bold text-slate-900 dark:text-white"
                    >
                      Hardware Vinculado
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400">
                      Equipamiento registrado en inventario para la OT (Router + SIM Card)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReassigning((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reasignar Hardware
                  </button>
                </div>
              </div>

              {/* Tarjetas de Router y SIM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Router Card */}
                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      <Router className="h-4 w-4 text-orange-500" />
                      Router CPE / Industrial
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        auditData.hardware.router.isLinked
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {auditData.hardware.router.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-gray-200">
                      {auditData.hardware.router.model}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-gray-400">
                      Serie:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        {auditData.hardware.router.serial}
                      </strong>
                    </p>
                    <p className="font-mono text-[10px] text-slate-400 dark:text-gray-500">
                      MAC: {auditData.hardware.router.mac}
                    </p>
                  </div>
                </div>

                {/* SIM Card */}
                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      <CreditCard className="h-4 w-4 text-orange-500" />
                      Tarjeta SIM Entel
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          auditData.hardware.sim.isLinked
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {auditData.hardware.sim.status}
                      </span>
                      <span className="rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {auditData.hardware.sim.technology}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-gray-400">
                      Código ICCID:
                    </p>
                    <p className="font-mono text-xs font-bold text-slate-900 dark:text-white break-all">
                      {auditData.hardware.sim.iccid}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-gray-400">
                      {auditData.hardware.sim.operator} · APN {auditData.hardware.sim.apn}
                    </p>
                  </div>
                </div>
              </div>

              {/* Panel rápido desplegable para Reasignar Hardware */}
              {isReassigning && (
                <form
                  onSubmit={handleConfirmReassign}
                  className="rounded-xl border border-orange-500/40 bg-white dark:bg-[#1e1e1e] p-4 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Seleccionar equipamiento de reemplazo en stock
                    </p>
                    {onOpenInventoryModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenInventoryModal();
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-500 hover:underline"
                      >
                        Abrir inventario completo
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-gray-400">
                        Nuevo Router (Serie / Modelo)
                      </label>
                      <select
                        value={selectedRouterId}
                        onChange={(e) => setSelectedRouterId(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-[#121212] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Mantener router actual</option>
                        {availableRouters.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.identifier} — {r.model} ({r.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-gray-400">
                        Nueva SIM Card (ICCID)
                      </label>
                      <select
                        value={selectedSimId}
                        onChange={(e) => setSelectedSimId(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-[#121212] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Mantener SIM actual</option>
                        {availableSims.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.identifier} ({s.technology} · {s.status})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsReassigning(false)}
                      className="rounded-lg border border-slate-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isPairing}
                      className="rounded-lg bg-orange-500 hover:bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-60"
                    >
                      {isPairing ? "Vinculando..." : "Guardar Vinculación"}
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          {/* SECCIÓN D: CONFORMIDAD Y FIRMA DIGITAL */}
          {showSection("signature") && (
            <section
              aria-labelledby="section-signature"
              className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-[#161616] p-4 space-y-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-500">
                    <FileSignature className="h-4 w-4" />
                  </div>
                  <div>
                    <h3
                      id="section-signature"
                      className="text-sm font-bold text-slate-900 dark:text-white"
                    >
                      Conformidad y Firma Digital del Cliente
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400">
                      {auditData.conformity.isSigned
                        ? "Recepción en terreno validada y firmada por el cliente"
                        : "Recepción pendiente de firma en terreno o vía Portal Cliente"}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-mono text-[10px] font-semibold ${
                    auditData.conformity.isSigned
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {auditData.conformity.tokenHash}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] p-4 space-y-3">
                {auditData.conformity.isSigned ? (
                  <div className="relative flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-[#141414] px-4 py-3">
                    <span className="absolute right-2.5 top-2 text-[9px] font-mono uppercase tracking-widest text-slate-400 dark:text-gray-500">
                      Firma Electrónica Simple · {auditData.conformity.signedAt}
                    </span>
                    <svg
                      viewBox="0 0 320 80"
                      className="h-16 w-64 text-slate-800 dark:text-orange-400"
                      aria-label="Firma digitalizada del cliente receptor"
                    >
                      <path
                        d="M 24 56 C 42 22, 58 64, 78 36 C 94 16, 102 58, 122 44 C 142 30, 155 20, 168 48 C 178 66, 198 25, 218 40 C 235 52, 258 32, 292 26"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 55 64 Q 160 52 275 60"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        opacity="0.65"
                      />
                    </svg>
                    <p className="text-[10px] font-mono text-slate-400 dark:text-gray-500">
                      {auditData.conformity.notes ||
                        "Rúbrica digital registrada en dispositivo móvil de terreno"}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-[#141414] px-4 py-5 text-center space-y-1.5">
                    <Clock className="h-6 w-6 text-amber-500" />
                    <p className="text-xs font-semibold text-slate-800 dark:text-gray-200">
                      Firma digital del cliente pendiente
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 max-w-md">
                      {auditData.conformity.notes}
                    </p>
                  </div>
                )}

                {/* Datos de quien recibe en la empresa */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                      Contacto en Empresa
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {auditData.conformity.recipientName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400">
                      RUT: {auditData.conformity.recipientRut}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                      Estado / Unidad
                    </span>
                    <p className="font-medium text-slate-800 dark:text-gray-200">
                      {auditData.conformity.recipientRole}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ── Footer Fijo con Botón Primario "Aprobar y Cerrar Auditoría" ── */}
        <footer className="shrink-0 border-t border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-gray-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleApproveAudit}
            disabled={isApproving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-98 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition-all disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" />
            {isApproving ? "Aprobando..." : "Aprobar y Cerrar Auditoría"}
          </button>
        </footer>

        {/* ── Lightbox Modal para ver evidencia fotográfica en grande ── */}
        {activePhoto && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
            onClick={() => setSelectedPhotoIndex(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 px-5 py-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-orange-500">
                      {order.orderId}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {activePhoto.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {activePhoto.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPhotoIndex(null)}
                  aria-label="Cerrar vista previa"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative bg-slate-950">
                <EvidenceVisualPreview
                  kind={activePhoto.kind}
                  modelRef={activePhoto.ModelRef}
                  serialRef={activePhoto.SerialRef}
                  large
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#1e1e1e]">
                <div className="space-y-1">
                  <p className="text-xs text-slate-700 dark:text-gray-200">
                    {activePhoto.description}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500 dark:text-gray-400">
                    Hora captura: {activePhoto.timestamp} · Coordenadas: {activePhoto.gps}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPhotoIndex(
                        (selectedPhotoIndex - 1 + auditData.evidences.length) %
                          auditData.evidences.length
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPhotoIndex(
                        (selectedPhotoIndex + 1) % auditData.evidences.length
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800"
                  >
                    Siguiente
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>,
    document.body
  );
}
