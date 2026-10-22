import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
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
            <tr className="border-b border-slate-200 dark:border-gray-700">
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                Cliente
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                OT / Enlace Único
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                Técnico Asignado
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                Estado
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                Progreso
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/60">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="px-5 py-4">
                  <div className="h-4 w-28 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-20 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-32 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-16 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-20 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-5 py-4 text-right">
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

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const isActive = status === "Activo" || status === "ACTIVO";
  const isCompleted = status === "Completado";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
        isActive
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/25"
          : isCompleted
          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/25"
          : "bg-gray-500/15 text-slate-500 dark:text-gray-400 ring-gray-500/25"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive
            ? "bg-emerald-400"
            : isCompleted
            ? "bg-blue-400"
            : "bg-gray-500"
        }`}
      />
      {status}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Vista principal — Magic Links con Enlace Único por Orden
// ═══════════════════════════════════════════════════════════════════════════════
function formatRelativeTime(dateString) {
  if (!dateString) return "Reciente";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Reciente";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "Hoy";
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "Hace un momento";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
  if (diffDays === 1) return "Hace 1 día";
  if (diffDays < 30) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

export default function MagicLinks() {
  const [isLoading, setIsLoading] = useState(true);
  const [linksList, setLinksList] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);

  // Estado para el modal de generar link
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [sendImmediately, setSendImmediately] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Estado para el modal de envío de correo personalizado
  const [sendModalRow, setSendModalRow] = useState(null);
  const [sendModalEmail, setSendModalEmail] = useState("");
  const [isSendingFromModal, setIsSendingFromModal] = useState(false);

  // Auto-dismiss del toast después de 6 segundos
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadMagicLinks = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.orders.getAll({ size: 50 });
      if (res?.items?.length) {
        setAllOrders(res.items);

        if (!selectedOrderId && res.items.length > 0) {
          setSelectedOrderId(res.items[0].id);
          if (res.items[0].client?.contact_email) {
            setCustomEmail(res.items[0].client.contact_email);
          }
        }

        const dynamicLinks = res.items.map((o) => {
          const otNum = o.order_number;
          const token = buildOrderMagicToken(o);
          const clientName =
            o.client?.contact_person ||
            o.client?.business_name ||
            "Contacto Corporativo";
          const clientEmail = o.client?.contact_email || "";
          const company = o.client?.business_name || "Cliente Corporativo";
          const phone = o.client?.contact_phone || "+56 9 8765 4321";

          const techName =
            o.technician_summary?.full_name || "Sin técnico asignado";
          const techInitials = o.technician_summary?.initials || "TC";
          const credentialId = o.technician_summary?.vehicle_plate
            ? `TEC-ENT-${o.technician_summary.vehicle_plate}`
            : "TEC-ENT-PENDIENTE";

          return {
            id: o.id,
            workOrderId: o.id,
            token,
            hasPersistedToken: Boolean(o.active_magic_link_token),
            client: clientName,
            clientEmail,
            company,
            phone,
            ot: otNum,
            order_number: otNum,
            orderNumber: otNum,
            status:
              o.status === "COMPLETADA"
                ? "Completado"
                : o.status === "CANCELADA"
                ? "Inactivo"
                : "Activo",
            status_key: (o.status || "IDLE").toLowerCase(),
            createdAgo: formatRelativeTime(o.created_at || o.scheduled_date),
            path: `/status/${token}`,
            url: `${window.location.origin}/status/${token}`,
            serviceType: o.title || "Servicio Técnico Atlas",
            technician: {
              name: techName,
              avatar: techInitials,
              credentialId,
              role: "Especialista Técnico en Terreno",
            },
          };
        });

        setLinksList(dynamicLinks);
      } else {
        setLinksList([]);
      }
    } catch (err) {
      console.error("Error al cargar órdenes:", err);
      setLinksList([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrderId]);

  useEffect(() => {
    loadMagicLinks();
  }, [loadMagicLinks]);

  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return linksList;
    const q = searchQuery.toLowerCase();
    return linksList.filter(
      (item) =>
        item.client.toLowerCase().includes(q) ||
        item.company.toLowerCase().includes(q) ||
        item.ot.toLowerCase().includes(q) ||
        item.token.toLowerCase().includes(q) ||
        item.technician?.name.toLowerCase().includes(q)
    );
  }, [searchQuery, linksList]);

  const isEmpty = filteredLinks.length === 0;

  const handleCopy = (url) => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setToast({
          type: "success",
          title: "Enlace copiado",
          message: "El Magic Link único de la orden fue copiado al portapapeles.",
        });
      })
      .catch(() => {});
  };

  // ── Abrir modal para elegir correo destino real ──
  const handleOpenSendModal = (row) => {
    setSendModalRow(row);
    setSendModalEmail(row.clientEmail || "");
  };

  // ── Confirmar y despachar vía Resend a la dirección ingresada ──
  const handleConfirmSendEmail = async (e) => {
    e.preventDefault();
    if (!sendModalRow?.workOrderId) {
      setToast({
        type: "error",
        title: "No se puede despachar",
        message: "Esta orden de trabajo no tiene un identificador ID en la base de datos.",
      });
      return;
    }

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
          message: `Magic Link entregado exitosamente a ${res.recipient} vía Resend.`,
        });

        setLinksList((prev) =>
          prev.map((item) =>
            item.id === sendModalRow.id ? { ...item, clientEmail: target } : item
          )
        );
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

  // ── Generar y enviar nuevo Magic Link ──
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
      await api.auth.generateMagicLink(selectedOrderId, 48);

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
        title: "¡Magic Link generado con éxito!",
        message: emailSent
          ? `Notificación de visita técnica despachada a ${targetEmail} vía Resend.`
          : "El enlace interactivo de seguimiento ha sido activado para la orden de trabajo.",
      });

      setIsGenerateModalOpen(false);
      setSelectedOrderId("");
      await loadMagicLinks();
    } catch (err) {
      setToast({
        type: "error",
        title: "Error al generar link",
        message:
          err.message || "No se pudo generar el Magic Link en la base de datos.",
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
            <p className="text-xs font-bold uppercase tracking-wider">
              {toast.title}
            </p>
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
            Magic Links
          </h1>
          <p className="text-sm text-muted-foreground">
            Generación y seguimiento de enlaces únicos por orden sin contraseña con entrega vía Resend.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (allOrders.length > 0) {
              setSelectedOrderId(allOrders[0].id);
              setCustomEmail(allOrders[0].client?.contact_email || "");
            }
            setIsGenerateModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-[0.98] shrink-0"
        >
          <Sparkles className="h-4 w-4" />
          <span>+ Generar Link</span>
        </button>
      </div>

      {/* ── Contenido condicional ── */}
      {isLoading ? (
        <MagicLinksSkeleton />
      ) : isEmpty && !searchQuery ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-white dark:bg-[#1e1e1e]">
          <Link2 className="h-12 w-12 text-slate-400 dark:text-gray-600" />
          <p className="text-sm text-slate-500 dark:text-gray-400">
            No hay Magic Links generados actualmente
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-0 rounded-xl border border-border bg-white dark:bg-[#1e1e1e] overflow-hidden shadow-sm">
          {/* ── Toolbar ── */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/40">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente, OT, token o técnico..."
                className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition"
              />
            </div>
            <div className="flex-1" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              <span>1 enlace único por orden</span>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-gray-700 bg-slate-50/40 dark:bg-gray-900/20">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                    Cliente
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                    OT / Enlace Único
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                    Técnico Asignado
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                    Progreso
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/60">
                {filteredLinks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-sm text-slate-500 dark:text-gray-400"
                    >
                      No se encontraron enlaces para &quot;{searchQuery}&quot;
                    </td>
                  </tr>
                ) : (
                  filteredLinks.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Cliente */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {row.client}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-gray-400">
                            {row.company} · {row.phone}
                          </span>
                          {row.clientEmail && (
                            <span className="text-[11px] text-orange-600 dark:text-orange-400/90 mt-0.5">
                              ✉️ {row.clientEmail}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* OT + Token Único */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">
                            {row.ot}
                          </span>
                          <Link
                            to={row.path}
                            className="font-mono text-[11px] text-slate-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 truncate max-w-[180px]"
                            title={`Abrir ${row.path}`}
                          >
                            {row.path}
                          </Link>
                        </div>
                      </td>

                      {/* Técnico */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <AdminAvatar
                            name={row.technician?.name}
                            src=""
                            className="h-7 w-7 text-xs bg-orange-600 text-white"
                          />
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {row.technician?.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-mono">
                              {row.technician?.credentialId}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-4">
                        <StatusBadge status={row.status} />
                      </td>

                      {/* Creado hace */}
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">
                        {row.createdAgo}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Enviar Correo vía Resend a dirección personalizada */}
                          <button
                            type="button"
                            onClick={() => handleOpenSendModal(row)}
                            title="Enviar Magic Link a un correo (Resend)"
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-500 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                          >
                            <Mail className="h-4 w-4" />
                          </button>

                          {/* Abrir vista de la orden */}
                          <a
                            href={row.path}
                            target="_blank"
                            rel="noreferrer"
                            title={`Abrir vista de seguimiento para ${row.ot} (${row.company})`}
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-500 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>

                          {/* Copiar enlace */}
                          <button
                            type="button"
                            onClick={() => handleCopy(row.url)}
                            title="Copiar Magic Link al portapapeles"
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-gray-700 bg-slate-50/30 dark:bg-gray-900/10">
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Mostrando {filteredLinks.length > 0 ? 1 : 0} a {filteredLinks.length} de {linksList.length} enlaces
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 dark:text-gray-500">
                Vigencia: 48 horas por token
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: GENERAR Y ENVIAR MAGIC LINK ── */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-700 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Generar Magic Link</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Emite un token efímero exclusivo para la orden seleccionada
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
                  Correo del Cliente (Destinatario)
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
                  Opcional: correo para envío de notificación transaccional.
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
                      Despachar notificación por correo ahora (Resend)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400">
                      Envía la plantilla interactiva de visita técnica al correo del cliente.
                    </p>
                  </div>
                </label>
              </div>

              {/* Botones de acción */}
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
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Generar Enlace</span>
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
                    Despacha la invitación a cualquier correo real
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
                  Correo Electrónico de Destino (Para recepción real)
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
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-gray-400">
                  Ingresa cualquier correo real (Gmail, institucional, etc.) para recibir el acceso y probarlo.
                </p>
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
    </div>
  );
}
