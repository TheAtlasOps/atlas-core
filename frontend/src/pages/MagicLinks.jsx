import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Copy,
  Link2,
  Search,
  ExternalLink,
  Mail,
  CheckCircle2,
  AlertTriangle,
  X,
  Send,
  Sparkles,
  Ban,
  RefreshCw,
  Clock,
  ShieldAlert,
} from "lucide-react";
import AdminAvatar from "../components/ui/AdminAvatar";
import { api } from "../lib/api";
import { buildOrderMagicToken } from "../lib/magicLinksData";

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function MagicLinksSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-white dark:bg-[#1e1e1e] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/40">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Cliente y OT
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Técnico Asignado
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Estado Orden
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Estado Enlace
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Emisión / Expiración
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Modo Portal
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/60">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-4">
                  <div className="h-4 w-28 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-1" />
                  <div className="h-3 w-16 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 w-32 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 w-20 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 w-16 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="h-4 w-16 bg-slate-200 dark:bg-gray-800 rounded animate-pulse ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Order Status Badge ───────────────────────────────────────────────────────
function OrderStatusBadge({ status }) {
  const norm = String(status || "").toUpperCase();
  const configs = {
    CONFIRMADA: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/25",
    EN_RUTA: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/25",
    EN_SITIO: "bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-purple-500/25",
    COMPLETADA: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/25",
    CANCELADA: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/25",
    IDLE: "bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/25",
  };
  const labels = {
    CONFIRMADA: "Confirmada",
    EN_RUTA: "En ruta",
    EN_SITIO: "En el lugar",
    COMPLETADA: "Completada",
    CANCELADA: "Cancelada",
    IDLE: "Pendiente",
  };
  const colorClass = configs[norm] || configs.IDLE;
  const label = labels[norm] || status || "Desconocido";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ring-1 ${colorClass}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ─── Link Status Badge (RNF-SEG-03 / RF-CLI-09) ──────────────────────────────
function LinkStatusBadge({ status }) {
  const norm = String(status || "").toUpperCase();
  const configs = {
    VIGENTE: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/25",
    VENCIDO: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/25",
    REVOCADO: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/25",
    SIN_ENLACE: "bg-slate-500/15 text-slate-500 dark:text-gray-400 ring-slate-500/25",
  };
  const labels = {
    VIGENTE: "Vigente",
    VENCIDO: "Vencido",
    REVOCADO: "Revocado",
    SIN_ENLACE: "Sin enlace",
  };
  const colorClass = configs[norm] || configs.SIN_ENLACE;
  const label = labels[norm] || "Sin enlace";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${colorClass}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ─── Portal Mode Badge ────────────────────────────────────────────────────────
function PortalModeBadge({ mode }) {
  const norm = String(mode || "");
  const isCompleted = norm.includes("Resumen");
  const isOnSite = norm.includes("sitio");

  const colorClass = isCompleted
    ? "bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/25"
    : isOnSite
    ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-purple-500/25"
    : "bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-sky-500/25";

  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ${colorClass}`}>
      {mode || "Seguimiento activo"}
    </span>
  );
}

// ─── Formatters ──────────────────────────────────────────────────────────────
function formatChileanDateTime(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRemainingTime(expiresAt, isVigente) {
  if (!expiresAt || !isVigente) return null;
  const expDate = new Date(expiresAt);
  if (isNaN(expDate.getTime())) return null;
  const now = new Date();
  const diffHours = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 0) return "Vence ahora";
  if (diffHours < 1) return `Vence en ${Math.round(diffHours * 60)} min`;
  if (diffHours < 24) return `Quedan ${Math.round(diffHours)}h`;
  const days = Math.floor(diffHours / 24);
  const remHours = Math.round(diffHours % 24);
  return remHours > 0 ? `Quedan ${days}d ${remHours}h` : `Quedan ${days}d`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Vista principal — Magic Links & Administración de Enlaces
// ═══════════════════════════════════════════════════════════════════════════════
export default function MagicLinks() {
  const [isLoading, setIsLoading] = useState(true);
  const [linksList, setLinksList] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("TODAS");
  const [linkStatusFilter, setLinkStatusFilter] = useState("TODOS");
  const [toast, setToast] = useState(null);

  // Modal para Generar / Regenerar link
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [sendImmediately, setSendImmediately] = useState(false);
  const [isForceNew, setIsForceNew] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modal para Enviar enlace por correo
  const [sendModalRow, setSendModalRow] = useState(null);
  const [sendModalEmail, setSendModalEmail] = useState("");
  const [isSendingFromModal, setIsSendingFromModal] = useState(false);

  // Modal para Revocar enlace
  const [revokeModalRow, setRevokeModalRow] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Auto-dismiss del toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadMagicLinks = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.orders.getAll({ size: 100, include_magic_tokens: true });
      if (res?.items?.length) {
        setAllOrders(res.items);

        if (!selectedOrderId && res.items.length > 0) {
          setSelectedOrderId(res.items[0].id);
          if (res.items[0].client?.contact_email) {
            setCustomEmail(res.items[0].client.contact_email);
          }
        }

        const mapped = res.items.map((o) => {
          const detail = o.magic_link_detail || null;
          const token = detail?.token || buildOrderMagicToken(o);
          const hasToken = Boolean(token && token.trim());

          let linkStatus = "SIN_ENLACE";
          if (detail?.link_status) {
            linkStatus = detail.link_status;
          } else if (hasToken) {
            linkStatus = "VIGENTE";
          }

          let portalMode = "Seguimiento activo";
          if (detail?.portal_mode) {
            portalMode = detail.portal_mode;
          } else if (o.status === "COMPLETADA" || o.status === "CANCELADA") {
            portalMode = "Resumen final";
          } else if (o.status === "EN_SITIO") {
            portalMode = "Atención en sitio";
          }

          const clientName =
            o.client?.contact_person ||
            o.client?.business_name ||
            "Contacto Corporativo";
          const clientEmail = o.client?.contact_email || "";
          const company = o.client?.business_name || "Cliente Corporativo";
          const phone = o.client?.contact_phone || "";

          const techName =
            o.technician_summary?.full_name || "Sin técnico asignado";
          const techInitials = o.technician_summary?.initials || "TC";
          const credentialId = o.technician_summary?.vehicle_plate
            ? `TEC-ENT-${o.technician_summary.vehicle_plate}`
            : "TEC-ENT-PENDIENTE";

          const issuedAt = detail?.created_at || (hasToken ? o.created_at : null);
          const expiresAt = detail?.expires_at || null;
          const remainingText = formatRemainingTime(expiresAt, linkStatus === "VIGENTE");

          return {
            id: o.id,
            workOrderId: o.id,
            token,
            hasPersistedToken: hasToken,
            client: clientName,
            clientEmail,
            company,
            phone,
            ot: o.order_number,
            orderStatus: o.status || "IDLE",
            linkStatus,
            portalMode,
            issuedAt,
            issuedAtFormatted: formatChileanDateTime(issuedAt),
            expiresAt,
            expiresAtFormatted: formatChileanDateTime(expiresAt),
            remainingText,
            path: hasToken ? `/status/${token}` : "",
            url: hasToken ? `${window.location.origin}/status/${token}` : "",
            serviceTitle: o.title || "Servicio Técnico Atlas",
            technician: {
              name: techName,
              avatar: techInitials,
              credentialId,
            },
          };
        });

        setLinksList(mapped);
      } else {
        setLinksList([]);
      }
    } catch (err) {
      console.error("Error al cargar órdenes para Magic Links:", err);
      setLinksList([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrderId]);

  useEffect(() => {
    loadMagicLinks();
  }, [loadMagicLinks]);

  // Filtrado y búsqueda
  const filteredLinks = useMemo(() => {
    return linksList.filter((item) => {
      // Filtro por estado de orden
      if (orderStatusFilter !== "TODAS" && item.orderStatus !== orderStatusFilter) {
        return false;
      }
      // Filtro por estado del enlace
      if (linkStatusFilter !== "TODOS" && item.linkStatus !== linkStatusFilter) {
        return false;
      }
      // Búsqueda por cliente, OT o técnico (sin exponer ni buscar tokens secretos)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClient = item.client.toLowerCase().includes(q);
        const matchesCompany = item.company.toLowerCase().includes(q);
        const matchesOt = item.ot.toLowerCase().includes(q);
        const matchesTech = item.technician?.name.toLowerCase().includes(q);
        if (!matchesClient && !matchesCompany && !matchesOt && !matchesTech) {
          return false;
        }
      }
      return true;
    });
  }, [linksList, orderStatusFilter, linkStatusFilter, searchQuery]);

  const isEmpty = filteredLinks.length === 0;

  // Acción: Copiar enlace limpio sin filtrar secretos en logs
  const handleCopy = (url) => {
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setToast({
          type: "success",
          title: "Enlace copiado",
          message: "El Magic Link seguro de la orden fue copiado al portapapeles.",
        });
      })
      .catch(() => {});
  };

  // Acción: Abrir modal de envío por correo
  const handleOpenSendModal = (row) => {
    setSendModalRow(row);
    setSendModalEmail(row.clientEmail || "");
  };

  // Confirmar despacho por correo vía SendGrid
  const handleConfirmSendEmail = async (e) => {
    e.preventDefault();
    if (!sendModalRow?.workOrderId) return;

    const target = sendModalEmail.trim();
    if (!target) {
      setToast({
        type: "error",
        title: "Correo requerido",
        message: "Por favor ingresa un correo de destino válido.",
      });
      return;
    }

    setIsSendingFromModal(true);
    try {
      const res = await api.notifications.sendMagicLink(
        sendModalRow.workOrderId,
        target
      );
      if (res?.success) {
        setToast({
          type: "success",
          title: "¡Correo enviado con éxito!",
          message: `Magic Link entregado exitosamente a ${res.recipient} vía SendGrid.`,
        });
        setSendModalRow(null);
      } else {
        throw new Error(res?.status || "Error reportado por el servidor de correo");
      }
    } catch (err) {
      setToast({
        type: "error",
        title: "Error al enviar correo",
        message: err.message || "No se pudo despachar el correo transaccional.",
      });
    } finally {
      setIsSendingFromModal(false);
    }
  };

  // Acción: Abrir modal de revocación
  const handleOpenRevokeModal = (row) => {
    setRevokeModalRow(row);
  };

  // Confirmar revocación del Magic Link
  const handleConfirmRevoke = async () => {
    if (!revokeModalRow?.workOrderId) return;
    setIsRevoking(true);
    try {
      await api.auth.revokeMagicLink(revokeModalRow.workOrderId);
      setToast({
        type: "success",
        title: "Enlace revocado",
        message: `El Magic Link de la orden ${revokeModalRow.ot} ha sido revocado. Cualquier consulta responderá 410 Gone.`,
      });
      setRevokeModalRow(null);
      await loadMagicLinks();
    } catch (err) {
      setToast({
        type: "error",
        title: "Error al revocar enlace",
        message: err.message || "No se pudo revocar el enlace en la base de datos.",
      });
    } finally {
      setIsRevoking(false);
    }
  };

  // Generar o regenerar Magic Link
  const handleOpenGenerateModal = (orderId = "", forceNew = false) => {
    const targetId = orderId || (allOrders.length > 0 ? allOrders[0].id : "");
    setSelectedOrderId(targetId);
    setIsForceNew(forceNew);
    const matched = allOrders.find((o) => o.id === targetId);
    setCustomEmail(matched?.client?.contact_email || "");
    setSendImmediately(false);
    setIsGenerateModalOpen(true);
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrderId) {
      setToast({
        type: "error",
        title: "Orden requerida",
        message: "Selecciona una orden de trabajo para generar el link.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      await api.auth.generateMagicLink(selectedOrderId, 48, isForceNew);

      let emailSent = false;
      const targetEmail = customEmail.trim();
      if (sendImmediately && targetEmail) {
        try {
          const notifRes = await api.notifications.sendMagicLink(
            selectedOrderId,
            targetEmail
          );
          if (notifRes?.success) {
            emailSent = true;
          }
        } catch {
          // continúa si el envío por correo falla
        }
      }

      setToast({
        type: "success",
        title: isForceNew ? "¡Magic Link regenerado con éxito!" : "¡Magic Link generado con éxito!",
        message: emailSent
          ? `Enlace activado y notificación despachada a ${targetEmail} vía SendGrid.`
          : "El enlace de acceso para el cliente está vigente por 48 horas.",
      });

      setIsGenerateModalOpen(false);
      await loadMagicLinks();
    } catch (err) {
      setToast({
        type: "error",
        title: "Error al generar enlace",
        message: err.message || "No se pudo generar el Magic Link en la base de datos.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Toast Flotante ── */}
      {toast && (
        <aside
          role="status"
          aria-live="polite"
          className={`fixed top-6 right-6 z-[120] flex max-w-md items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200 ${
            toast.type === "error"
              ? "border-rose-500/50 bg-white/95 dark:bg-gray-900/95 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30"
              : "border-emerald-500/50 bg-white/95 dark:bg-gray-900/95 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider">{toast.title}</p>
            <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </aside>
      )}

      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-slate-900 dark:text-white">
            Magic Links & Portal Cliente
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión y trazabilidad de enlaces efímeros únicos por orden, con ciclo de vida y seguridad de acceso.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenGenerateModal()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-[0.98] shrink-0"
        >
          <Sparkles className="h-4 w-4" />
          <span>+ Generar Link</span>
        </button>
      </div>

      {/* ── Toolbar: Búsqueda y Filtros Combinados ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-xl border border-border bg-white dark:bg-[#1e1e1e] shadow-xs">
        {/* Input de Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, empresa, OT o técnico..."
            className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        {/* Filtro: Estado de la Orden */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500 whitespace-nowrap">
            Orden:
          </span>
          <select
            value={orderStatusFilter}
            onChange={(e) => setOrderStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="TODAS">Todas las órdenes</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="EN_RUTA">En ruta</option>
            <option value="EN_SITIO">En sitio</option>
            <option value="COMPLETADA">Completada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>

        {/* Filtro: Estado del Enlace */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500 whitespace-nowrap">
            Enlace:
          </span>
          <select
            value={linkStatusFilter}
            onChange={(e) => setLinkStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="TODOS">Todos los enlaces</option>
            <option value="VIGENTE">Vigente</option>
            <option value="VENCIDO">Vencido</option>
            <option value="REVOCADO">Revocado</option>
            <option value="SIN_ENLACE">Sin enlace</option>
          </select>
        </div>
      </div>

      {/* ── Tabla de Magic Links ── */}
      {isLoading ? (
        <MagicLinksSkeleton />
      ) : isEmpty ? (
        <div className="min-h-[350px] flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-white dark:bg-[#1e1e1e] p-8 text-center">
          <Link2 className="h-10 w-10 text-slate-400 dark:text-gray-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-gray-300">
            No se encontraron enlaces con los filtros actuales
          </p>
          <p className="text-xs text-slate-400 dark:text-gray-500 max-w-sm">
            Prueba cambiando los filtros de estado o la búsqueda para encontrar órdenes de trabajo.
          </p>
        </div>
      ) : (
        <div className="flex flex-col rounded-xl border border-border bg-white dark:bg-[#1e1e1e] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-gray-700 bg-slate-50/60 dark:bg-gray-900/30">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    Cliente y OT
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    Técnico Asignado
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    Estado Orden
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    Estado Enlace
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    Emisión / Expiración
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    Modo Portal
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/60">
                {filteredLinks.map((row) => {
                  const isVigente = row.linkStatus === "VIGENTE";
                  const canOpen = isVigente && row.hasPersistedToken;

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Cliente y OT */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                              {row.ot}
                            </span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {row.client}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-gray-400">
                            {row.company} {row.phone ? `· ${row.phone}` : ""}
                          </span>
                        </div>
                      </td>

                      {/* Técnico Asignado */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <AdminAvatar
                            name={row.technician?.name}
                            src=""
                            className="h-7 w-7 text-xs bg-orange-600 text-white shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                              {row.technician?.name}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-gray-500 font-mono">
                              {row.technician?.credentialId}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Estado de la Orden */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <OrderStatusBadge status={row.orderStatus} />
                      </td>

                      {/* Estado del Enlace */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <LinkStatusBadge status={row.linkStatus} />
                      </td>

                      {/* Emisión y Expiración */}
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                        {row.issuedAt ? (
                          <div className="flex flex-col">
                            <span className="text-slate-700 dark:text-gray-300 font-medium">
                              {row.issuedAtFormatted}
                            </span>
                            {isVigente && row.remainingText ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <Clock className="h-3 w-3" />
                                {row.remainingText}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 dark:text-gray-500">
                                Exp: {row.expiresAtFormatted}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Modo del Portal */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <PortalModeBadge mode={row.portalMode} />
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Abrir enlace (si está vigente) */}
                          {canOpen ? (
                            <a
                              href={row.path}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir vista de seguimiento para el cliente"
                              className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-500 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : (
                            <span
                              title="El portal no está disponible porque el enlace no se encuentra vigente"
                              className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-300 dark:text-gray-600 cursor-not-allowed"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </span>
                          )}

                          {/* Copiar enlace */}
                          {row.hasPersistedToken ? (
                            <button
                              type="button"
                              onClick={() => handleCopy(row.url)}
                              title="Copiar Magic Link al portapapeles"
                              className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          ) : null}

                          {/* Enviar por correo */}
                          {row.hasPersistedToken && isVigente ? (
                            <button
                              type="button"
                              onClick={() => handleOpenSendModal(row)}
                              title="Enviar enlace por correo (SendGrid)"
                              className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-500 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                          ) : null}

                          {/* Revocar enlace */}
                          {isVigente ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRevokeModal(row)}
                              title="Revocar acceso de este Magic Link"
                              className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-500 dark:text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          ) : null}

                          {/* Generar o Regenerar enlace */}
                          {row.linkStatus === "SIN_ENLACE" ? (
                            <button
                              type="button"
                              onClick={() => handleOpenGenerateModal(row.workOrderId, false)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-xs"
                              title="Generar Magic Link para esta orden"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>Generar</span>
                            </button>
                          ) : !isVigente ? (
                            <button
                              type="button"
                              onClick={() => handleOpenGenerateModal(row.workOrderId, true)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-700 text-white hover:bg-slate-800 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all shadow-xs"
                              title="Emitir un nuevo Magic Link válido"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Nuevo</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenGenerateModal(row.workOrderId, true)}
                              title="Regenerar enlace (reemplazará el enlace actual)"
                              className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-gray-700 bg-slate-50/30 dark:bg-gray-900/10">
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Mostrando {filteredLinks.length} de {linksList.length} órdenes registradas
            </p>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-gray-500">
              <span>TTL: 48 horas de vigencia estándar</span>
              <span>·</span>
              <span>1 enlace activo por orden</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: GENERAR O REGENERAR MAGIC LINK ── */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-700 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {isForceNew ? "Regenerar Magic Link" : "Generar Magic Link"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Emite un token efímero de alta entropía (32 bytes) válido por 48 horas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isForceNew && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Esta orden ya posee un enlace activo. Al regenerarlo, el enlace previo será revocado de inmediato y cualquier cliente que intente usarlo recibirá una respuesta 410 Gone.
                </span>
              </div>
            )}

            <form onSubmit={handleGenerateSubmit} className="space-y-4">
              {/* Selección de OT */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1.5">
                  Orden de Trabajo
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedOrderId(id);
                    const matched = allOrders.find((o) => o.id === id);
                    if (matched?.client?.contact_email) {
                      setCustomEmail(matched.client.contact_email);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {allOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} · {o.client?.business_name || "Cliente"} ({o.title || "Servicio"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Correo del destinatario */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1.5">
                  Correo del Cliente (Para despacho SendGrid)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="cliente@empresa.cl"
                    className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">
                  Opcional: dirección para envío transaccional inmediato.
                </p>
              </div>

              {/* Checkbox para enviar inmediatamente */}
              <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-900/60 p-3.5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendImmediately}
                    onChange={(e) => setSendImmediately(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 accent-orange-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Despachar notificación por correo ahora (SendGrid)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400">
                      Envía el Magic Link con la plantilla de visita técnica al correo indicado.
                    </p>
                  </div>
                </label>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition active:scale-[0.98] disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>{isForceNew ? "Regenerar Enlace" : "Generar Enlace"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ENVIAR MAGIC LINK POR CORREO DIRECTO ── */}
      {sendModalRow && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-700 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Enviar Magic Link</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Despacha la invitación por correo vía SendGrid
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSendModalRow(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSendEmail} className="space-y-4">
              <div className="rounded-xl bg-slate-50 dark:bg-gray-800/60 p-3 text-xs space-y-1 border border-slate-200/60 dark:border-gray-700">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-gray-400">Orden de Trabajo:</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">{sendModalRow.ot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-gray-400">Cliente:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{sendModalRow.client}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1.5">
                  Correo Electrónico de Destino
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={sendModalEmail}
                    onChange={(e) => setSendModalEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setSendModalRow(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingFromModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition active:scale-[0.98] disabled:opacity-50"
                >
                  {isSendingFromModal ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Despachando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Enviar Ahora</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMAR REVOCACIÓN DE ENLACE ── */}
      {revokeModalRow && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-700 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Revocar Magic Link</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Orden {revokeModalRow.ot} · {revokeModalRow.client}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevokeModalRow(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-600 dark:text-gray-300">
              <p>
                ¿Estás seguro de que deseas revocar de inmediato el Magic Link de la orden{" "}
                <span className="font-semibold text-slate-900 dark:text-white font-mono">
                  {revokeModalRow.ot}
                </span>
                ?
              </p>
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 p-3 text-xs text-rose-700 dark:text-rose-300">
                El enlace quedará inactivo de forma permanente y cualquier intento de acceso por parte del cliente responderá HTTP 410 (Gone).
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-slate-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setRevokeModalRow(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 transition active:scale-[0.98] disabled:opacity-50"
              >
                {isRevoking ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Revocando...</span>
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    <span>Confirmar Revocación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
