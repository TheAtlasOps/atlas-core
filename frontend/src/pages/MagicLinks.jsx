import { useState, useEffect, useMemo } from "react";
import { Copy, Link2, Search, ExternalLink } from "lucide-react";
import AdminAvatar from "../components/ui/AdminAvatar";
import { MAGIC_LINKS_DATA } from "../lib/magicLinksData";
import { api } from "../lib/api";


// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function MagicLinksSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-white dark:bg-[#1e1e1e] overflow-hidden">
      {/* Table header — real */}
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
                  <div className="h-4 w-24 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-20 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-16 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-28 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="h-4 w-8 bg-slate-200 dark:bg-gray-800 rounded animate-pulse ml-auto" />
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
  const isActive = status === "Activo";
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
// Vista principal — Magic Links
// ═══════════════════════════════════════════════════════════════════════════════
export default function MagicLinks() {
  const [isLoading, setIsLoading] = useState(true);
  const [linksList, setLinksList] = useState(MAGIC_LINKS_DATA);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadMagicLinks() {
      try {
        setIsLoading(true);
        const res = await api.orders.getAll({ size: 50 });
        if (!cancelled && res?.items?.length) {
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
              const token = o.active_magic_link_token || tokenPresetMap[otNum] || `ml_tok_${otNum.replace("#", "").toLowerCase()}`;
              const clientName = o.client?.business_name || (typeof o.client === "string" ? o.client : "Cliente Corporativo");
              const techName = o.technician_summary?.full_name || "Elena Kravets";
              const techInitials = o.technician_summary?.initials || "EK";
              const phone = o.client?.phone || "+56 9 8123 4567";
              const company = o.client?.business_name ? `${o.client.business_name} SpA` : "Entel Corporaciones";

              return {
                id: o.id || `ml-${idx + 1}`,
                token,
                client: clientName,
                company,
                phone,
                ot: otNum,
                order_number: otNum,
                orderNumber: otNum,
                status: o.status === "COMPLETADA" ? "Completado" : o.status === "CANCELADA" ? "Inactivo" : "Activo",
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
        // Fallback a MAGIC_LINKS_DATA en caso de desconexión
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    loadMagicLinks();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return linksList;
    const q = searchQuery.toLowerCase();
    return linksList.filter(
      (item) =>
        item.client.toLowerCase().includes(q) ||
        item.company.toLowerCase().includes(q) ||
        item.ot.toLowerCase().includes(q) ||
        item.technician.name.toLowerCase().includes(q)
    );
  }, [searchQuery, linksList]);

  const isEmpty = filteredLinks.length === 0;

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Cabecera ── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Magic Links
        </h1>
        <p className="text-sm text-muted-foreground">
          Generación y seguimiento de Magic Links para clientes Entel.
        </p>
      </div>

      {/* ── Contenido condicional ── */}
      {isLoading ? (
        /* ── Skeleton ── */
        <MagicLinksSkeleton />
      ) : isEmpty && !searchQuery ? (
        /* ── Empty State ── */
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-white dark:bg-[#1e1e1e]">
          <Link2 className="h-12 w-12 text-slate-400 dark:text-gray-600" />
          <p className="text-sm text-slate-500 dark:text-gray-400">
            No hay Magic Links generados actualmente
          </p>
        </div>
      ) : (
        /* ── Tabla con Toolbar + Footer ── */
        <div className="flex flex-col gap-0 rounded-xl border border-border bg-white dark:bg-[#1e1e1e] overflow-hidden">

          {/* ── Toolbar ── */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-gray-700">
            {/* Search input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente, OT o técnico..."
                className="w-full rounded-md border border-slate-200 dark:border-gray-700 bg-slate-50/60 dark:bg-gray-900/60 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition"
              />
            </div>
            {/* Spacer */}
            <div className="flex-1" />
            {/* CTA button */}
            <button
              type="button"
              className="flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors shrink-0"
            >
              + Generar Link
            </button>
          </div>

          {/* ── Table ── */}
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
                {filteredLinks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500 dark:text-gray-400">
                      No se encontraron resultados para "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredLinks.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                    >
                      {/* Cliente — nombre + empresa/teléfono */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {row.client}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                          {row.company} · {row.phone}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">
                        {row.ot}
                      </td>
                      {/* Técnico asignado con AdminAvatar */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <AdminAvatar
                            name={row.technician.name}
                            className="h-6 w-6 text-[10px] shrink-0"
                          />
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {row.technician.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-mono">
                              {row.technician.credentialId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">
                        {row.createdAgo}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/status/${row.token}`}
                            target="_blank"
                            rel="noreferrer"
                            title={`Abrir vista de seguimiento para ${row.client}`}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            aria-label={`Copiar link de ${row.client}`}
                            onClick={() => handleCopy(row.url)}
                            title="Copiar link"
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/5 transition-colors"
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

          {/* ── Pagination Footer ── */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-gray-700">
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Mostrando {filteredLinks.length > 0 ? 1 : 0} a {filteredLinks.length} de {linksList.length} enlaces
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md bg-slate-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled
              >
                Anterior
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled
              >
                Siguiente
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
