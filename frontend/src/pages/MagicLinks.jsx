import { useState, useEffect } from "react";
import { Copy, Link2, Search } from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MAGIC_LINKS = [
  {
    id: "ml-001",
    client: "Juan Pérez",
    phone: "+56 9 8123 4567",
    ot: "#OT-08495",
    status: "Activo",
    createdAgo: "Hace 2 horas",
    url: "https://atlas.entel.cl/ml/xK9pQ2",
  },
  {
    id: "ml-002",
    client: "Camila Rojas",
    phone: "+56 9 7654 3210",
    ot: "#OT-08471",
    status: "Expirado",
    createdAgo: "Hace 3 días",
    url: "https://atlas.entel.cl/ml/mR4wL8",
  },
  {
    id: "ml-003",
    client: "Diego Soto",
    phone: "+56 9 9321 8876",
    ot: "#OT-08512",
    status: "Activo",
    createdAgo: "Hace 30 min",
    url: "https://atlas.entel.cl/ml/nT7vB3",
  },
];

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function MagicLinksSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-[#13151A] overflow-hidden">
      {/* Table header — real */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Cliente
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                OT
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Estado
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Creado hace
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="px-5 py-4">
                  <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-20 bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-16 bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-28 bg-gray-800 rounded animate-pulse" />
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="h-4 w-8 bg-gray-800 rounded animate-pulse ml-auto" />
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
          ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25"
          : "bg-gray-500/15 text-gray-400 ring-gray-500/25"
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
  // Simula latencia de red — reemplazar por fetch real contra la BD
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Cambia a `true` para ver el empty state cuando no hay links
  const isEmpty = false;

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
      ) : isEmpty ? (
        /* ── Empty State ── */
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-[#13151A]">
          <Link2 className="h-12 w-12 text-gray-600" />
          <p className="text-sm text-gray-400">
            No hay Magic Links generados actualmente
          </p>
        </div>
      ) : (
        /* ── Tabla con Toolbar + Footer ── */
        <div className="flex flex-col gap-0 rounded-xl border border-border bg-[#13151A] overflow-hidden">

          {/* ── Toolbar ── */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800">
            {/* Search input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre u OT..."
                className="w-full rounded-md border border-gray-700 bg-gray-900/60 py-2 pl-9 pr-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition"
              />
            </div>
            {/* Spacer */}
            <div className="flex-1" />
            {/* CTA button */}
            <button
              type="button"
              className="flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 transition-colors shrink-0"
            >
              + Generar Link
            </button>
          </div>

          {/* ── Table ── */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Cliente
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    OT
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Creado hace
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {MAGIC_LINKS.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    {/* Cliente — nombre + teléfono */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-200">
                        {row.client}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {row.phone}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-400 whitespace-nowrap">
                      {row.ot}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {row.createdAgo}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        aria-label={`Copiar link de ${row.client}`}
                        onClick={() => handleCopy(row.url)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination Footer ── */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              Mostrando 1 a 3 de 24 enlaces
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled
              >
                Anterior
              </button>
              <button
                type="button"
                className="rounded-md bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 transition-colors"
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
