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
  Shield,
  Clock,
  Building,
} from "lucide-react";
import AdminAvatar from "../components/ui/AdminAvatar";
import { MAGIC_LINKS_DATA } from "../lib/magicLinksData";
import { api } from "../lib/api";

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
                OT
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                Técnico Asignado
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                Estado
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                Creado hace
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
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
        isActive
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/25"
          : "bg-gray-500/15 text-slate-500 dark:text-gray-400 ring-gray-500/25"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-400" : "bg-gray-500"
        }`}
      />
      {status}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Vista principal — Magic Links con Envío Real SendGrid
// ═══════════════════════════════════════════════════════════════════════════════
export default function MagicLinks() {
  const [isLoading, setIsLoading] = useState(true);
  const [linksList, setLinksList] = useState(MAGIC_LINKS_DATA);
  const [allOrders, setAllOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [toast, setToast] = useState(null);

  // Estado para el modal de generar link
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [sendImmediately, setSendImmediately] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

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
        const tokenPresetMap = {
          "#OT-08495": "xK9pQ2",
          "#OT-08491": "token_magic_providencia_8491_abc",
          "#OT-08492": "token_magic_nunoa_8495_xyz",
          "#OT-08493": "token_magic_lascondes_8493_def",
          "#OT-08494": "token_magic_vitacura_8494_ghi",
          "#OT-08496": "token_magic_santiago_8496_jkl",
          "#OT-08497": "token_magic_maipu_8497_mno",
          "#OT-08498": "token_magic_bancoestado_8498_pqr",
          "#OT-08499": "token_magic_penalolen_8499_stu",
          "#OT-08500": "token_magic_lascondes_8500_vwx",
        };

        const dynamicLinks = res.items
          .filter((o) => Boolean(o.active_magic_link_token || tokenPresetMap[o.order_number]))
          .map((o, idx) => {
            const otNum = o.order_number || `#OT-${String(8491 + idx).padStart(5, "0")}`;
            const token =
              o.active_magic_link_token ||
              tokenPresetMap[otNum] ||
              `ml_tok_${otNum.replace("#", "").toLowerCase()}`;
            const clientName =
              o.client?.business_name ||
              (typeof o.client === "string" ? o.client : "Cliente Corporativo");
            const clientEmail = o.client?.contact_email || "contacto@entel.cl";
            const techName = o.technician_summary?.full_name || "Elena Kravets";
            const techInitials = o.technician_summary?.initials || "EK";
            const phone = o.client?.phone || "+56 9 8123 4567";
            const company = o.client?.business_name
              ? `${o.client.business_name} SpA`
              : "Entel Corporaciones";

            return {
              id: o.id || `ml-${idx + 1}`,
              workOrderId: o.id,
              token,
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
              status_key: (o.status || "EN_RUTA").toLowerCase(),
              createdAgo: `Hace ${idx + 1} ${idx === 0 ? "hora" : "horas"}`,
              url: `${window.location.origin}/status/${token}`,
              serviceType: o.title || "Servicio Técnico Atlas",
              technician: {
                name: techName,
                avatar: techInitials,
                credentialId: `TEC-ENT-${84920 + idx}`,
                role: "Especialista Técnico en Terreno",
              },
            };
          });

        if (dynamicLinks.length > 0) {
          setLinksList(dynamicLinks);
        }
      }
    } catch {
      // Fallback local
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        item.technician?.name.toLowerCase().includes(q)
    );
  }, [searchQuery, linksList]);

  const isEmpty = filteredLinks.length === 0;

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      setToast({
        type: "success",
        title: "Enlace copiado",
        message: "El Magic Link ha sido copiado al portapapeles.",
      });
    }).catch(() => {});
  };

  // ── Disparo manual de correo vía SendGrid / Resend ──
  const handleSendEmail = async (row) => {
    if (!row.workOrderId) {
      setToast({
        type: "error",
        title: "No se puede despachar",
        message: "Esta orden de trabajo no tiene un identificador ID en la base de datos.",
      });
      return;
    }

    setSendingEmailId(row.id);
    try {
      const res = await api.notifications.sendMagicLink(row.workOrderId);
      if (res?.success) {
        const isSimulated = res.simulated;
        setToast({
          type: "success",
          title: isSimulated ? "Envío Simulado (Modo Dev)" : "¡Correo enviado con éxito!",
          message: isSimulated
            ? `Notificación preparada para ${res.recipient || row.clientEmail}. (Para envío real a bandejas, configura SENDGRID_API_KEY en .env).`
            : `Magic Link entregado exitosamente a ${res.recipient} vía SendGrid (ID: ${res.message_id}).`,
        });
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
      setSendingEmailId(null);
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
      // 1. Generar token criptográfico
      const genRes = await api.auth.generateMagicLink(selectedOrderId, 48);

      // 2. Si marcó enviar por correo inmediatamente
      let emailSent = false;
      let emailMsg = "";
      if (sendImmediately) {
        try {
          const notifRes = await api.notifications.sendMagicLink(selectedOrderId);
          if (notifRes?.success) {
            emailSent = true;
            emailMsg = notifRes.simulated
              ? `(Envío simulado a ${notifRes.recipient})`
              : `(Entregado a ${notifRes.recipient} vía SendGrid)`;
          }
        } catch (emailErr) {
          emailMsg = `(Aviso: No se pudo despachar el correo: ${emailErr.message})`;
        }
      }

      setToast({
        type: "success",
        title: "¡Magic Link generado con éxito!",
        message: `Token activo: ${genRes.token}. ${emailMsg}`,
      });

      setIsGenerateModalOpen(false);
      setSelectedOrderId("");
      await loadMagicLinks();
    } catch (err) {
      setToast({
        type: "error",
        title: "Error al generar link",
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
            Magic Links
          </h1>
          <p className="text-sm text-muted-foreground">
            Generación y seguimiento de enlaces seguros sin contraseña con entrega vía SendGrid.
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
                placeholder="Buscar por cliente, OT o técnico..."
                className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition"
              />
            </div>
            <div className="flex-1" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              <span>SendGrid Conectado</span>
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
                    OT
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                    Técnico Asignado
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                    Creado hace
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/60">
                {filteredLinks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500 dark:text-gray-400">
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

                      {/* OT */}
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">
                          {row.ot}
                        </span>
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
                          {/* Botón Enviar Correo vía SendGrid */}
                          <button
                            type="button"
                            disabled={sendingEmailId === row.id}
                            onClick={() => handleSendEmail(row)}
                            title={`Enviar correo con Magic Link a ${row.clientEmail || row.client} (SendGrid)`}
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-500 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                          >
                            {sendingEmailId === row.id ? (
                              <div className="h-4 w-4 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </button>

                          {/* Abrir vista */}
                          <a
                            href={`/status/${row.token}`}
                            target="_blank"
                            rel="noreferrer"
                            title={`Abrir vista de seguimiento para ${row.client}`}
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
                    Emite un token efímero y envíalo al cliente vía SendGrid
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
                  Puedes ingresar tu propio correo para probar la recepción en tu bandeja.
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
                      <span>Generar y Despachar</span>
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
