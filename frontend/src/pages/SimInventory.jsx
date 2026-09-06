import { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, Database, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_SIMS = [
  {
    id: 1,
    iccid: "89560100191234567890",
    type: "5G",
    status: "Disponible",
    assignedTo: null,
  },
  {
    id: 2,
    iccid: "89560100199876543210",
    type: "4G",
    status: "Asignada",
    assignedTo: "Carlos Mendoza",
  },
  {
    id: 3,
    iccid: "89560100194561237890",
    type: "5G",
    status: "Asignada",
    assignedTo: "Ana Torres",
  },
  {
    id: 4,
    iccid: "89560100197890123456",
    type: "4G",
    status: "Defectuosa",
    assignedTo: null,
  },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    Disponible: "bg-green-500/15 text-green-400 ring-1 ring-green-500/30",
    Asignada: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30",
    Defectuosa: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] ?? "bg-gray-700 text-gray-300"
      }`}
    >
      {status}
    </span>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  return (
    <span className="inline-flex items-center rounded-md bg-gray-700/60 px-2 py-0.5 text-xs font-semibold text-gray-300 ring-1 ring-gray-600/50">
      {type}
    </span>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function SimInventorySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">SIM Inventory</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gestión del inventario de SIMs corporativas Entel.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            disabled
            placeholder="Buscar por ICCID o técnico..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800/60 py-2 pl-9 pr-4 text-sm text-gray-400 placeholder:text-gray-600 outline-none cursor-not-allowed"
          />
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500/50 px-4 py-2 text-sm font-semibold text-white cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Registrar SIM
        </button>
      </div>

      {/* Table header + skeleton rows */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              <th className="px-4 py-3 text-left font-semibold text-gray-400 tracking-wide text-xs uppercase">ICCID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-400 tracking-wide text-xs uppercase">Tipo</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-400 tracking-wide text-xs uppercase">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-400 tracking-wide text-xs uppercase">Asignado A</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-400 tracking-wide text-xs uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-800/60 last:border-0">
                <td colSpan={5} className="px-4 py-3">
                  <div className="h-12 rounded-lg bg-gray-800 animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
      <Database className="h-12 w-12 text-gray-600" />
      <p className="text-gray-400 text-sm text-center max-w-xs">
        No hay tarjetas SIM registradas en el inventario
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SimInventory() {
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const isEmpty = false;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return <SimInventorySkeleton />;

  const filteredSims = MOCK_SIMS.filter((sim) => {
    const q = search.toLowerCase();
    return (
      sim.iccid.toLowerCase().includes(q) ||
      (sim.assignedTo ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-foreground">SIM Inventory</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gestión del inventario de SIMs corporativas Entel.
        </p>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ICCID o técnico..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800/60 py-2 pl-9 pr-4 text-sm text-gray-200 placeholder:text-gray-600 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 transition"
          />
        </div>

        {/* Register button */}
        <button className="inline-flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-400 active:bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors shadow-sm shadow-orange-500/20">
          <Plus className="h-4 w-4" />
          Registrar SIM
        </button>
      </div>

      {/* ── Content ── */}
      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-400 tracking-wide text-xs uppercase">ICCID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-400 tracking-wide text-xs uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-400 tracking-wide text-xs uppercase">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-400 tracking-wide text-xs uppercase">Asignado A</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-400 tracking-wide text-xs uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSims.map((sim) => (
                  <tr
                    key={sim.id}
                    className="border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30 transition-colors"
                  >
                    {/* ICCID */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-gray-200 text-xs tracking-wider">
                        {sim.iccid}
                      </span>
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3">
                      <TypeBadge type={sim.type} />
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      <StatusBadge status={sim.status} />
                    </td>

                    {/* Asignado A */}
                    <td className="px-4 py-3 text-gray-300">
                      {sim.assignedTo ?? <span className="text-gray-600">—</span>}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          title="Editar"
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-700 hover:text-gray-200 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          title="Eliminar"
                          className="rounded-md p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Footer / Pagination ── */}
          <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
            <p className="text-xs text-gray-500">
              Mostrando{" "}
              <span className="text-gray-300 font-medium">1</span> a{" "}
              <span className="text-gray-300 font-medium">4</span> de{" "}
              <span className="text-gray-300 font-medium">156</span> SIMs
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/40 px-3 py-1.5 text-xs font-medium text-gray-500 cursor-not-allowed select-none"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/40 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:border-gray-600 transition-colors">
                Siguiente
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
