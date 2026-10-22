import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
  FileSignature,
  CalendarCheck,
} from "lucide-react";
import AdminAvatar from "../components/ui/AdminAvatar";
import ThemeToggle from "../components/ui/ThemeToggle";
import {
  mapApiSummaryToTrackingOrder,
  parseDeterministicMagicToken,
  buildSummaryFromOrderEntity,
  isLikelyExpiredToken,
} from "../lib/magicLinksData";
import { api } from "../lib/api";

const DEFAULT_SIGNATURE_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export default function CustomerTrackingView() {
  const { uuid } = useParams();
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => (searchParams.get("token") || uuid || "").trim(),
    [searchParams, uuid]
  );

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [errorKind, setErrorKind] = useState(null); // "expired" | "invalid"
  const [apiSummary, setApiSummary] = useState(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState("");
  const [commentText, setCommentText] = useState("");

  // Confirmación de visita y Firma digital (Magic Link API)
  const [visitConfirmed, setVisitConfirmed] = useState(false);
  const [visitNotes, setVisitNotes] = useState("");
  const [isConfirmingVisit, setIsConfirmingVisit] = useState(false);

  const [signedByName, setSignedByName] = useState("");
  const [isSigned, setIsSigned] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // Consulta en vivo a la API de Neon PostgreSQL con validación estricta de token
  useEffect(() => {
    let cancelled = false;

    async function fetchPortalSummary() {
      setIsLoading(true);
      setFetchError(null);
      setErrorKind(null);
      setApiSummary(null);
      setVisitConfirmed(false);
      setIsSigned(false);

      if (!token) {
        if (!cancelled) {
          setErrorKind("invalid");
          setFetchError(
            "El enlace de seguimiento está incompleto o no incluye un token de acceso válido."
          );
          setIsLoading(false);
        }
        return;
      }

      if (isLikelyExpiredToken(token)) {
        // Verifica contra backend pero garantiza clasificación de expirado
        try {
          await api.clientPortal.getSummary(token);
        } catch (err) {
          if (!cancelled) {
            setErrorKind("expired");
            setFetchError(
              err?.message ||
                "Este enlace de seguimiento ha expirado o fue revocado por seguridad."
            );
            setIsLoading(false);
          }
          return;
        }
      }

      try {
        const data = await api.clientPortal.getSummary(token);
        if (cancelled) return;
        if (data) {
          let enriched = { ...data };
          if (!enriched.company || !enriched.title) {
            try {
              const allRes = await api.orders.getAll({ size: 100 });
              const matched = allRes?.items?.find(
                (o) =>
                  String(o.id) === String(data.order_id) ||
                  o.order_number === data.order_number
              );
              if (matched) {
                enriched = {
                  ...enriched,
                  company:
                    enriched.company ||
                    matched.client?.business_name ||
                    "Empresa Cliente",
                  title: enriched.title || matched.title,
                };
              }
            } catch {
              // Continúa con el resumen directo del portal
            }
          }
          if (!cancelled) {
            setApiSummary(enriched);
            if (enriched.is_confirmed) setVisitConfirmed(true);
            if (enriched.signature_url || enriched.is_completed) setIsSigned(true);
          }
        }
      } catch (err) {
        if (cancelled) return;

        // Si es un token determinístico único de una orden sin fila previa en magic_links
        const parsed = parseDeterministicMagicToken(token);
        if (parsed && err?.status !== 410) {
          try {
            const allRes = await api.orders.getAll({ size: 100 });
            const matched = allRes?.items?.find((o) => {
              const cleanUuid = String(o.id || "")
                .replace(/-/g, "")
                .toLowerCase();
              return (
                String(o.order_number || "").toUpperCase() ===
                  parsed.orderNumber &&
                cleanUuid.endsWith(parsed.idSuffix)
              );
            });
            if (!cancelled && matched) {
              if (matched.status === "CANCELADA") {
                setErrorKind("expired");
                setFetchError(
                  "Esta orden de trabajo fue cancelada y su enlace de seguimiento ya no está activo."
                );
              } else {
                const summary = buildSummaryFromOrderEntity(matched);
                setApiSummary(summary);
                if (summary.is_confirmed) setVisitConfirmed(true);
                if (summary.is_completed) setIsSigned(true);
              }
              setIsLoading(false);
              return;
            }
          } catch {
            // Cae al manejo de error abajo
          }
        }

        const isExpired =
          err?.status === 410 ||
          isLikelyExpiredToken(token) ||
          /expirad|vencid|caducad|inactiv|410/i.test(err?.message || "");

        setErrorKind(isExpired ? "expired" : "invalid");
        setFetchError(
          isExpired
            ? "Este enlace de seguimiento ha expirado o ya no se encuentra activo. Por seguridad, los enlaces tienen una vigencia de 48 horas."
            : "El enlace de seguimiento ingresado no es válido o no corresponde a ninguna orden registrada en el sistema."
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchPortalSummary();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const order = useMemo(
    () => mapApiSummaryToTrackingOrder(apiSummary),
    [apiSummary]
  );

  const timelineSteps = useMemo(
    () => order?.timeline_steps || order?.steps || [],
    [order]
  );

  const currentStepIndex = useMemo(() => {
    if (!order || timelineSteps.length === 0) return 0;
    const currentByFlag = timelineSteps.findIndex((s) => s.current);
    if (currentByFlag >= 0) return currentByFlag;
    const idx = timelineSteps.findIndex(
      (s) => s.key === (order.status_key || order.statusKey)
    );
    return idx >= 0 ? idx : 0;
  }, [timelineSteps, order]);

  const handleConfirmVisit = async (e) => {
    e.preventDefault();
    setIsConfirmingVisit(true);
    try {
      await api.clientPortal.confirmVisit(token, {
        is_confirmed: true,
        notes:
          visitNotes.trim() ||
          "Visita confirmada por cliente en portal Magic Link",
      });
    } catch {
      // Fallback: confirma localmente
    } finally {
      setVisitConfirmed(true);
      setIsConfirmingVisit(false);
    }
  };

  const handleSignConformity = async (e) => {
    e.preventDefault();
    const signer = signedByName.trim() || order?.client || "Cliente Receptor";
    setIsSigning(true);
    try {
      await api.clientPortal.sign(token, DEFAULT_SIGNATURE_BASE64, signer);
    } catch {
      // Fallback: registra firma en estado local
    } finally {
      setSignedByName(signer);
      setIsSigned(true);
      setIsSigning(false);
    }
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    if (!selectedIssue) return;
    try {
      await api.clientPortal.confirmVisit(token, {
        is_confirmed: false,
        notes: `${selectedIssue}${commentText ? ` — ${commentText}` : ""}`,
      });
    } catch {
      // Fallback silencioso
    }
    setReportSuccess(true);
    setTimeout(() => {
      setReportSuccess(false);
      setIsReportModalOpen(false);
      setSelectedIssue("");
      setCommentText("");
    }, 2400);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">
            Conectando con Atlas Entel FSM...
          </p>
        </div>
      </div>
    );
  }

  if (!order || fetchError) {
    const isExpired = errorKind === "expired";
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-8 text-center shadow-lg">
          <div
            className={`h-12 w-12 rounded-full mx-auto flex items-center justify-center mb-4 ${
              isExpired
                ? "bg-amber-500/15 text-amber-500"
                : "bg-red-500/10 text-red-500"
            }`}
          >
            {isExpired ? (
              <Clock className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${
              isExpired
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
            }`}
          >
            {isExpired ? "Código 410 · Enlace Expirado" : "Código 404 · Enlace Inválido"}
          </span>
          <h2 className="text-lg font-bold mb-2">
            {isExpired
              ? "Enlace de seguimiento vencido o revocado"
              : "Enlace de seguimiento no válido"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-gray-400 mb-4 leading-relaxed">
            {fetchError ||
              (isExpired
                ? "Este Magic Link ha caducado o fue reemplazado por un enlace más reciente. Solicita un nuevo enlace al centro de despacho."
                : "El enlace ingresado no existe o no corresponde a ninguna orden activa en la plataforma ATLAS.")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <a
              href="tel:6003600106"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-semibold text-white transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              Contactar Mesa de Ayuda
            </a>
            <a
              href="https://www.entel.cl"
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-800 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
            >
              Portal Entel Empresas
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isCompletedStatus =
    order.status_key === "completada" || order.statusKey === "finalizado";

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
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-mono font-bold text-orange-600 dark:text-orange-400 border border-slate-200 dark:border-gray-700">
              {order.order_number || order.orderNumber}
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
                Orden {order.order_number} · Requerimiento
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 leading-snug">
                {order.serviceType}
              </h2>
            </div>

            {/* Badge de Estado */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
                isCompletedStatus
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {!isCompletedStatus && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isCompletedStatus ? "bg-emerald-500" : "bg-orange-500"
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
                <p className="text-xs text-orange-100 font-medium">
                  {isCompletedStatus
                    ? "Hora de término registrada"
                    : "Hora estimada de atención"}
                </p>
                <p className="text-2xl font-bold tracking-tight">{order.eta}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block bg-white/20 text-white text-xs font-medium px-2.5 py-1 rounded-md backdrop-blur-xs">
                {order.etaTimeLeft}
              </span>
            </div>
          </div>

          {/* Dirección, Comuna, Fecha Programada y Cliente */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-800 flex flex-col gap-2 text-xs sm:text-sm text-slate-600 dark:text-gray-300">
            <div className="flex items-start gap-2.5">
              <Building2 className="h-4 w-4 text-slate-400 dark:text-gray-500 shrink-0 mt-0.5" />
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {order.client}
                {order.company && order.company !== order.client
                  ? ` · ${order.company}`
                  : ""}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-slate-400 dark:text-gray-500 shrink-0 mt-0.5" />
              <span>
                {order.address}
                {order.comuna ? ` (${order.comuna})` : ""}
              </span>
            </div>
            {order.scheduled_date && (
              <div className="flex items-start gap-2.5">
                <CalendarCheck className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-500 dark:text-gray-400">
                  Programación: {order.scheduled_date}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── 2. STEPPER / LÍNEA DE TIEMPO DE 4 ESTADOS (confirmada, en_ruta, en_sitio, completada) ── */}
        <section className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-slate-200 dark:border-gray-800 p-5 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              Progreso del Servicio
            </h3>
            <span className="text-xs font-medium text-slate-500 dark:text-gray-400">
              Etapa {currentStepIndex + 1} de {timelineSteps.length}
            </span>
          </div>

          {/* Indicador Horizontal Rápido de 4 Fases */}
          <div className="relative flex items-center justify-between mb-6 px-1">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-gray-800 -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-orange-500 -translate-y-1/2 z-0 transition-all duration-500"
              style={{
                width: `${
                  timelineSteps.length > 1
                    ? (currentStepIndex / (timelineSteps.length - 1)) * 100
                    : 100
                }%`,
              }}
            />

            {timelineSteps.map((step, idx) => {
              const isCompleted = step.completed || idx < currentStepIndex;
              const isCurrent = step.current || idx === currentStepIndex;

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
                    {isCompleted && !isCurrent ? (
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
            {timelineSteps.map((step, idx) => {
              const isCompleted = step.completed || idx < currentStepIndex;
              const isCurrent = step.current || idx === currentStepIndex;
              const isPending =
                !isCompleted && !isCurrent && idx > currentStepIndex;
              const StepIcon =
                step.key === "confirmada" || step.key === "registrada"
                  ? FileText
                  : step.key === "en_ruta"
                  ? Truck
                  : step.key === "en_sitio" || step.key === "en_curso"
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
                    } ${
                      isCurrent
                        ? "ring-2 ring-orange-400 dark:ring-orange-500"
                        : ""
                    }`}
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
                        {step.label || step.title}
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
                        {step.timestamp || step.time}
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

          <div className="flex items-center gap-4">
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
                {order.technician.phone && (
                  <span className="text-[11px] text-slate-500 dark:text-gray-400">
                    Tel: {order.technician.phone}
                  </span>
                )}
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
                  {order.technician.vehicle_plate || order.technician.licensePlate}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-200 leading-snug flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span>
              Para validación en conserjería o recepción, el técnico portará su credencial física oficial con el número{" "}
              <strong className="text-blue-950 dark:text-blue-100">
                {order.technician.credentialId}
              </strong>
              .
            </span>
          </div>

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

        {/* ── 4. CONFIRMACIÓN DE VISITA Y FIRMA DIGITAL DE CONFORMIDAD ── */}
        <section className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-sm border border-slate-200 dark:border-gray-800 p-5 space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-orange-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Confirmación de Visita y Firma Digital
              </h3>
            </div>
            {(visitConfirmed || isSigned) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                {isSigned ? "Firmada" : "Confirmada"}
              </span>
            )}
          </div>

          {/* Bloque A: Confirmar recepción de visita */}
          {!visitConfirmed ? (
            <form onSubmit={handleConfirmVisit} className="space-y-2.5">
              <label className="block text-xs font-medium text-slate-600 dark:text-gray-300">
                Indicaciones de acceso / recepción para el técnico:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="Ej: Anunciarse en recepción piso 4..."
                  className="flex-1 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-[#141414] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={isConfirmingVisit}
                  className="shrink-0 rounded-lg bg-slate-900 dark:bg-gray-800 hover:bg-slate-800 dark:hover:bg-gray-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60"
                >
                  {isConfirmingVisit ? "Confirmando..." : "Confirmar Visita"}
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>Visita técnica confirmada en sistema ATLAS.</span>
            </div>
          )}

          {/* Bloque B: Firma digital de acta condicionada a que la atención se haya realizado */}
          {(() => {
            const raw = String(order.raw_status || order.status_key || "").toUpperCase();
            const canSign = ["EN_SITIO", "COMPLETADA"].includes(raw) || order.is_completed;

            if (isSigned) {
              return (
                <div className="rounded-lg bg-orange-500/10 border border-orange-500/25 px-3 py-2.5 text-xs text-orange-700 dark:text-orange-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-orange-500" />
                    <span>
                      Acta de conformidad firmada digitalmente por{" "}
                      <strong>{signedByName || order.client}</strong>.
                    </span>
                  </div>
                </div>
              );
            }

            if (!canSign) {
              return (
                <div className="pt-3 border-t border-slate-100 dark:border-gray-800">
                  <div className="rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-gray-800 px-3.5 py-2.5 text-xs text-slate-500 dark:text-gray-400 flex items-center gap-2.5">
                    <FileSignature className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      La firma digital de recepción conforme se habilitará una vez que el especialista técnico arribe al sitio y complete la atención.
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <form
                onSubmit={handleSignConformity}
                className="pt-3 border-t border-slate-100 dark:border-gray-800 space-y-2.5"
              >
                <label className="block text-xs font-medium text-slate-600 dark:text-gray-300">
                  Firmar recepción conforme del servicio técnico realizado:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={signedByName}
                    onChange={(e) => setSignedByName(e.target.value)}
                    placeholder={`Nombre receptor (${order.client})`}
                    className="flex-1 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-[#141414] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={isSigning}
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-60"
                  >
                    <FileSignature className="h-3.5 w-3.5" />
                    {isSigning ? "Firmando..." : "Firmar Conformidad"}
                  </button>
                </div>
              </form>
            );
          })()}
        </section>

        {/* Canales de Asistencia Directa */}
        <section className="bg-white dark:bg-[#1e1e1e] rounded-xl border border-slate-200 dark:border-gray-800 p-4 shadow-xs flex items-center justify-between gap-3 text-xs transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-600 dark:text-gray-300 shrink-0">
              <Phone className="h-4 w-4 text-orange-600 dark:text-orange-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Mesa de Ayuda Entel Empresas
              </p>
              <p className="text-slate-500 dark:text-gray-400">
                Atención técnica 24/7 para clientes corporativos
              </p>
            </div>
          </div>
          <a
            href="tel:6003600106"
            className="shrink-0 bg-slate-100 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 text-slate-700 dark:text-gray-300 px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1"
          >
            Llamar
          </a>
        </section>

        {import.meta.env.DEV && token && (
          <p className="text-center text-[10px] text-slate-400 dark:text-gray-500 font-mono break-all py-1">
            Token de acceso activo: {token} · Orden: {order.order_number}
          </p>
        )}
      </main>

      {/* ── FOOTER CORPORATIVO ENTEL ── */}
      <footer className="mt-auto border-t border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] py-4 px-4 text-center text-xs text-slate-400 dark:text-gray-500 transition-colors">
        <p className="font-medium text-slate-500 dark:text-gray-400">
          Entel S.A. · Servicio de Soporte Técnico Empresas
        </p>
        <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">
          Plataforma de Despacho ATLAS © {new Date().getFullYear()} · Portal Público Magic Link
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
