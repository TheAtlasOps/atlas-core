import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Truck,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  Phone,
  FileText,
  X,
  Building2,
} from "lucide-react";
import AdminAvatar from "../components/ui/AdminAvatar";
import ThemeToggle from "../components/ui/ThemeToggle";
import { getTrackingDataByUuid } from "../lib/magicLinksData";

export default function CustomerTrackingView() {
  const { uuid } = useParams();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState("");
  const [commentText, setCommentText] = useState("");

  // Resolución dinámica y verídica del requerimiento y técnico según el enlace/UUID
  const order = useMemo(() => getTrackingDataByUuid(uuid), [uuid]);

  const currentStepIndex = useMemo(() => {
    const idx = order.steps.findIndex((s) => s.key === order.statusKey);
    return idx >= 0 ? idx : 1;
  }, [order]);

  const handleSendReport = (e) => {
    e.preventDefault();
    if (!selectedIssue) return;
    setReportSuccess(true);
    setTimeout(() => {
      setReportSuccess(false);
      setIsReportModalOpen(false);
      setSelectedIssue("");
      setCommentText("");
    }, 2400);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#121212] text-slate-900 dark:text-white flex flex-col font-sans selection:bg-orange-100 selection:text-orange-900 transition-colors duration-200">
      {/* ── 1. ENCABEZADO MINIMALISTA (BRANDING ENTEL + THEME TOGGLE) ── */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[#1e1e1e] border-b border-slate-200 dark:border-gray-800 py-3.5 px-4 sm:px-6 shadow-xs transition-colors">
        <div className="w-full max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Isotipo Entel Empresas */}
            <div className="h-9 w-9 rounded-lg bg-orange-500 flex items-center justify-center text-white font-extrabold text-lg tracking-tighter shrink-0 shadow-sm">
              e°
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-500">
                Entel Empresas
              </p>
              <h1 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-tight">
                Seguimiento de Servicio Técnico
              </h1>
            </div>
          </div>

          {/* Acciones: Switch de tema + Badge de Orden */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle id="portal-theme-toggle" />
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-mono font-medium text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700">
              {order.orderNumber}
            </span>
          </div>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL (MOBILE-FIRST) ── */}
      <main className="w-full max-w-lg mx-auto px-4 py-5 sm:py-6 flex flex-col gap-5 flex-1">
        {/* Banner de Estado en Tiempo Real & ETA */}
        <section className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-slate-200 dark:border-gray-800 p-5 shadow-sm overflow-hidden relative transition-colors">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                Tipo de Requerimiento
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 leading-snug">
                {order.serviceType}
              </h2>
            </div>

            {/* Badge de Estado */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
                order.statusKey === "finalizado"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {order.statusKey !== "finalizado" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    order.statusKey === "finalizado"
                      ? "bg-emerald-500"
                      : "bg-orange-500"
                  }`}
                ></span>
              </span>
              {order.statusLabel}
            </span>
          </div>

          {/* Bloque ETA Destacado */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-orange-100 font-medium">Llegada estimada a destino</p>
                <p className="text-2xl font-bold tracking-tight">{order.eta}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block bg-white/20 text-white text-xs font-medium px-2.5 py-1 rounded-md backdrop-blur-xs">
                {order.etaTimeLeft}
              </span>
            </div>
          </div>

          {/* Dirección y Cliente */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-800 flex flex-col gap-2 text-xs sm:text-sm text-slate-600 dark:text-gray-300">
            <div className="flex items-start gap-2.5">
              <Building2 className="h-4 w-4 text-slate-400 dark:text-gray-500 shrink-0 mt-0.5" />
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {order.client} · {order.company}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-slate-400 dark:text-gray-500 shrink-0 mt-0.5" />
              <span>{order.address}</span>
            </div>
          </div>
        </section>

        {/* ── 2. STEPPER / LÍNEA DE TIEMPO DE 4 ESTADOS ── */}
        <section className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-slate-200 dark:border-gray-800 p-5 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              Progreso del Servicio
            </h3>
            <span className="text-xs font-medium text-slate-500 dark:text-gray-400">
              Etapa {currentStepIndex + 1} de {order.steps.length}
            </span>
          </div>

          {/* Indicador Horizontal Rápido de 4 Fases */}
          <div className="relative flex items-center justify-between mb-6 px-1">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-gray-800 -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-orange-500 -translate-y-1/2 z-0 transition-all duration-500"
              style={{
                width: `${(currentStepIndex / (order.steps.length - 1)) * 100}%`,
              }}
            />

            {order.steps.map((step, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div
                  key={step.key}
                  className="relative z-10 flex flex-col items-center"
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                      isCompleted || isCurrent
                        ? "bg-orange-500 text-white"
                        : "bg-slate-200 dark:bg-gray-800 text-slate-500 dark:text-gray-400"
                    } ${
                      isCurrent
                        ? "ring-4 ring-orange-200 dark:ring-orange-950/60 ring-offset-2 ring-offset-white dark:ring-offset-[#1e1e1e] animate-pulse"
                        : ""
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Línea de Tiempo Vertical Detallada */}
          <div className="space-y-4">
            {order.steps.map((step, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const isPending = idx > currentStepIndex;
              const StepIcon =
                step.key === "registrada"
                  ? FileText
                  : step.key === "en_ruta"
                  ? Truck
                  : step.key === "en_curso"
                  ? Wrench
                  : CheckCircle2;

              return (
                <div
                  key={step.key}
                  className={`flex items-start gap-3.5 p-3 rounded-xl transition-colors ${
                    isCurrent
                      ? "bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-500/30"
                      : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                  }`}
                >
                  {/* Ícono de Estado */}
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted || isCurrent
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-slate-200 dark:bg-gray-800 text-slate-500 dark:text-gray-400"
                    } ${isCurrent ? "ring-2 ring-orange-400 dark:ring-orange-500" : ""}`}
                  >
                    <StepIcon className="h-5 w-5" />
                  </div>

                  {/* Textos del Paso */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-sm font-semibold ${
                          isPending
                            ? "text-slate-400 dark:text-gray-500"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {step.title}
                      </p>
                      <span
                        className={`text-[11px] font-mono tabular-nums ${
                          isCurrent
                            ? "text-orange-700 dark:text-orange-400 font-bold"
                            : isCompleted
                            ? "text-slate-500 dark:text-gray-400"
                            : "text-slate-400 dark:text-gray-500"
                        }`}
                      >
                        {step.time}
                      </span>
                    </div>

                    <p
                      className={`text-xs mt-0.5 leading-relaxed ${
                        isPending
                          ? "text-slate-400 dark:text-gray-500"
                          : "text-slate-600 dark:text-gray-300"
                      }`}
                    >
                      {step.description}
                    </p>

                    {/* Indicador sutil de progreso si es el paso activo */}
                    {isCurrent && (
                      <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-orange-700 dark:text-orange-400 bg-white dark:bg-gray-900 px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-500/30 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                        Monitoreo en tiempo real activo
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 3. TARJETA DE SEGURIDAD Y VALIDACIÓN DEL TÉCNICO ── */}
        <section className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-sm border border-slate-200 dark:border-gray-800 p-5 mt-1 transition-colors">
          {/* Encabezado con sello de verificación */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Datos del Técnico Asignado
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Verificado
            </span>
          </div>

          {/* Perfil del Técnico verídico */}
          <div className="flex items-center gap-4">
            {/* Avatar circular utilizando AdminAvatar (con iniciales en blanco y fondo naranja Entel) */}
            <AdminAvatar
              name={order.technician.name}
              className="w-12 h-12 text-base shadow-sm ring-2 ring-orange-200 dark:ring-orange-950/50"
            />

            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {order.technician.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                {order.technician.role}
              </p>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-gray-800 text-[11px] font-mono text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700">
                  ID: {order.technician.credentialId}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-gray-400">
                  Zona: {order.technician.zone}
                </span>
              </div>
            </div>
          </div>

          {/* Grid de Validación para Acceso y Conserjería */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-800 grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-gray-800/60 p-3 rounded-lg border border-slate-200/70 dark:border-gray-700">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400">
                Vehículo Asignado
              </p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {order.technician.vehicleType}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-gray-800/60 p-3 rounded-lg border border-slate-200/70 dark:border-gray-700">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400">
                Patente Vehicular
              </p>
              <div className="mt-0.5 inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-600 rounded shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-blue-600" title="Chile" />
                <span className="font-mono font-bold text-xs text-slate-900 dark:text-white tracking-wider">
                  {order.technician.licensePlate}
                </span>
              </div>
            </div>
          </div>

          {/* Nota de Seguridad para Recepción / Conserjería */}
          <div className="mt-3 p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-200 leading-snug flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span>
              Para validación en conserjería o recepción, el técnico portará su credencial física oficial con el número{" "}
              <strong className="text-blue-950 dark:text-blue-100">{order.technician.credentialId}</strong>.
            </span>
          </div>

          {/* Enlace secundario: Reportar problema con la visita */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-gray-800 text-center">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors underline-offset-4 hover:underline py-1 px-2 rounded cursor-pointer"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-slate-400 dark:text-gray-500" />
              ¿Necesitas reportar un problema con la visita?
            </button>
          </div>
        </section>

        {/* Canales de Asistencia Directa */}
        <section className="bg-white dark:bg-[#1e1e1e] rounded-xl border border-slate-200 dark:border-gray-800 p-4 shadow-xs flex items-center justify-between gap-3 text-xs transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-600 dark:text-gray-300 shrink-0">
              <Phone className="h-4 w-4 text-orange-600 dark:text-orange-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Mesa de Ayuda Entel Empresas</p>
              <p className="text-slate-500 dark:text-gray-400">Atención técnica 24/7 para clientes corporativos</p>
            </div>
          </div>
          <a
            href="tel:6003600106"
            className="shrink-0 bg-slate-100 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 text-slate-700 dark:text-gray-300 px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1"
          >
            Llamar
          </a>
        </section>

        {/* Token / UUID informativo para modo desarrollo */}
        {import.meta.env.DEV && uuid && (
          <p className="text-center text-[10px] text-slate-400 dark:text-gray-500 font-mono break-all py-1">
            Token de acceso activo: {uuid}
          </p>
        )}
      </main>

      {/* ── FOOTER CORPORATIVO ENTEL ── */}
      <footer className="mt-auto border-t border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] py-4 px-4 text-center text-xs text-slate-400 dark:text-gray-500 transition-colors">
        <p className="font-medium text-slate-500 dark:text-gray-400">
          Entel S.A. · Servicio de Soporte Técnico Empresas
        </p>
        <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">
          Plataforma de Despacho ATLAS © {new Date().getFullYear()} · Modo Consulta Solo Lectura
        </p>
      </footer>

      {/* ── MODAL: REPORTAR PROBLEMA CON LA VISITA ── */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-gray-800 relative text-slate-900 dark:text-white transition-colors">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 rounded-lg p-1 transition"
              aria-label="Cerrar modal"
            >
              <X className="h-5 w-5" />
            </button>

            {reportSuccess ? (
              <div className="py-6 text-center flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Aviso Enviado al Despacho
                </h4>
                <p className="text-xs text-slate-600 dark:text-gray-300 mt-1 max-w-xs">
                  Tu coordinación ha sido registrada. El equipo de despacho Atlas se pondrá en contacto contigo si es necesario.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendReport}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Reportar Novedad en la Visita
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                  Selecciona la situación para notificar de inmediato al centro de operaciones Entel:
                </p>

                <div className="space-y-2 mb-4">
                  {[
                    "No habrá personal en la dirección indicada",
                    "Dificultades de acceso en portería/conserjería",
                    "Necesito reprogramar el horario de la visita",
                    "Otro motivo urgente",
                  ].map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition ${
                        selectedIssue === option
                          ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-950 dark:text-orange-200 font-medium"
                          : "border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800/50 text-slate-700 dark:text-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="issueOption"
                        value={option}
                        checked={selectedIssue === option}
                        onChange={(e) => setSelectedIssue(e.target.value)}
                        className="text-orange-500 focus:ring-orange-500"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>

                <div className="mb-4">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1">
                    Detalles adicionales (opcional):
                  </label>
                  <textarea
                    rows={2}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Ej: Avisar al guardia de turno Don Pedro en conserjería..."
                    className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedIssue}
                    className="px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition"
                  >
                    Notificar a Despacho
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
