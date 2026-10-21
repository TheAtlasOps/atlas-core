import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  CreditCard,
  Router,
  Copy,
  Check,
  Plus,
  Database,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Link2,
} from "lucide-react";
import AdminAvatar from "./AdminAvatar";
import { useWorkOrders } from "../../context/WorkOrderContext";
import { api } from "../../lib/api";
import {
  mapApiSimToInventoryItem,
  mapApiRouterToInventoryItem,
} from "../../lib/auditAndHardwareData";

// SimStatusEnum oficial del backend FastAPI / Neon DB
const STATUS_OPTIONS = [
  "DISPONIBLE",
  "ASIGNADA_TECNICO",
  "INSTALADA",
  "DEFECTUOSA",
  "BAJA",
];
const TECH_OPTIONS = ["5G", "4G LTE"];
const TYPE_OPTIONS = ["SIM", "Router"];

const STATUS_BADGE_STYLES = {
  DISPONIBLE:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30",
  ASIGNADA_TECNICO:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30",
  INSTALADA:
    "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30",
  DEFECTUOSA:
    "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30",
  BAJA:
    "bg-slate-500/15 text-slate-600 dark:text-gray-400 ring-1 ring-slate-500/30",
};

function FilterPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-150 ${
        active
          ? "border-orange-500 bg-orange-500 text-white shadow-xs"
          : "border-slate-200 dark:border-gray-800 bg-white dark:bg-[#161616] text-slate-600 dark:text-gray-300 hover:border-slate-300 dark:hover:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-800"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Contenido reutilizable del inventario de hardware (SIMs y Routers)
 */
export function HardwareInventoryContent({ onClose }) {
  const {
    hardwareInventory,
    setHardwareInventory,
    reassignOrderHardware,
    setToast,
  } = useWorkOrders();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [techFilter, setTechFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPairForm, setShowPairForm] = useState(false);
  const [pairEquipmentId, setPairEquipmentId] = useState("");
  const [pairSimCardId, setPairSimCardId] = useState("");
  const [isPairing, setIsPairing] = useState(false);

  const [newItem, setNewItem] = useState({
    deviceType: "SIM",
    model: "",
    identifier: "",
    technology: "5G",
    status: "DISPONIBLE",
  });

  // Consume api.inventory.getSims() y api.inventory.getRouters() al abrir el modal con fallback a Mock Data
  useEffect(() => {
    let cancelled = false;
    async function loadInventoryFromApi() {
      try {
        const [simsData, routersData] = await Promise.all([
          api.inventory.getSims(),
          api.inventory.getRouters(),
        ]);
        if (cancelled) return;
        const sims = Array.isArray(simsData?.items)
          ? simsData.items.map(mapApiSimToInventoryItem)
          : [];
        const routers = Array.isArray(routersData?.items)
          ? routersData.items.map(mapApiRouterToInventoryItem)
          : [];
        if (sims.length > 0 || routers.length > 0) {
          setHardwareInventory([...sims, ...routers]);
        }
      } catch {
        // Fallback silencioso a datos Mock en Vercel
      }
    }
    loadInventoryFromApi();
    return () => {
      cancelled = true;
    };
  }, [setHardwareInventory]);

  const stats = useMemo(() => {
    const total = hardwareInventory.length;
    const disponibles = hardwareInventory.filter(
      (i) => i.status === "DISPONIBLE"
    ).length;
    const asignados = hardwareInventory.filter((i) =>
      ["INSTALADA", "ASIGNADA_TECNICO"].includes(i.status)
    ).length;
    const enFalla = hardwareInventory.filter((i) =>
      ["DEFECTUOSA", "BAJA"].includes(i.status)
    ).length;
    return { total, disponibles, asignados, enFalla };
  }, [hardwareInventory]);

  const availableRouters = useMemo(
    () =>
      hardwareInventory.filter(
        (item) =>
          item.deviceType === "Router" &&
          !["DEFECTUOSA", "BAJA"].includes(item.status)
      ),
    [hardwareInventory]
  );

  const availableSims = useMemo(
    () =>
      hardwareInventory.filter(
        (item) =>
          item.deviceType === "SIM" &&
          !["DEFECTUOSA", "BAJA"].includes(item.status)
      ),
    [hardwareInventory]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hardwareInventory.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (techFilter && item.technology !== techFilter) return false;
      if (typeFilter && item.deviceType !== typeFilter) return false;
      if (!q) return true;
      return (
        item.identifier.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        item.deviceType.toLowerCase().includes(q) ||
        (item.orderId ?? "").toLowerCase().includes(q) ||
        (item.technician ?? "").toLowerCase().includes(q) ||
        item.operator.toLowerCase().includes(q)
      );
    });
  }, [hardwareInventory, search, statusFilter, techFilter, typeFilter]);

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handlePairSubmit = async (e) => {
    e.preventDefault();
    if (!pairEquipmentId || !pairSimCardId) return;
    setIsPairing(true);
    const routerItem = availableRouters.find((r) => r.id === pairEquipmentId);
    const simItem = availableSims.find((s) => s.id === pairSimCardId);
    try {
      await api.inventory.pair(pairEquipmentId, pairSimCardId, null);
    } catch {
      // Fallback en Vercel: actualiza estado local
    } finally {
      reassignOrderHardware(null, { routerItem, simItem });
      setIsPairing(false);
      setShowPairForm(false);
      setPairEquipmentId("");
      setPairSimCardId("");
    }
  };

  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.identifier.trim()) return;

    setFormError(null);
    setIsSubmitting(true);

    const cleanId = newItem.identifier.trim();
    const modelText =
      newItem.model.trim() ||
      (newItem.deviceType === "SIM"
        ? "SIM M2M Industrial Entel"
        : "Teltonika RUTX50 Industrial");

    let created = null;

    try {
      if (newItem.deviceType === "SIM") {
        const apiSim = await api.inventory.createSim({
          iccid: cleanId.slice(0, 22),
          operator: "Entel",
          status: newItem.status,
          notes: `${modelText} (${newItem.technology})`,
        });
        if (apiSim?.id) {
          created = mapApiSimToInventoryItem(apiSim);
        }
      } else {
        const parts = modelText.split(" ");
        const brand = parts[0] || "Teltonika";
        const model = parts.slice(1).join(" ") || modelText;
        const apiRouter = await api.inventory.createRouter({
          serial_number: cleanId,
          mac_address: "B8:27:EB:99:10:AA",
          brand,
          model,
          type: newItem.technology === "5G" ? "ROUTER_5G" : "ROUTER_4G",
          status: "DISPONIBLE",
          notes: modelText,
        });
        if (apiRouter?.id) {
          created = mapApiRouterToInventoryItem(apiRouter);
        }
      }

      if (created) {
        setHardwareInventory((prev) => [created, ...prev]);
        setShowAddForm(false);
        setNewItem({
          deviceType: "SIM",
          model: "",
          identifier: "",
          technology: "5G",
          status: "DISPONIBLE",
        });

        if (setToast) {
          setToast({
            title: `${created.deviceType} registrado en Neon DB`,
            description: `ID ${created.identifier} guardado exitosamente.`,
            type: "success",
          });
          setTimeout(() => setToast(null), 5000);
        }
      }
    } catch (err) {
      console.error("Error al registrar hardware:", err);
      const errorMessage = err?.message || "No se pudo registrar el hardware.";
      setFormError(errorMessage);
      if (setToast) {
        setToast({
          title: "Error al registrar hardware",
          description: errorMessage,
          type: "error",
        });
        setTimeout(() => setToast(null), 6000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasActiveFilters = Boolean(
    search.trim() || statusFilter || techFilter || typeFilter
  );

  return (
    <div className="flex flex-col h-full max-h-[88vh] bg-white dark:bg-[#1e1e1e] text-slate-900 dark:text-white">
      {/* ── Cabecera del Modal ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-gray-800 px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="hardware-inventory-title"
                className="text-lg font-bold tracking-tight text-slate-900 dark:text-white"
              >
                Control de Stock e Inventario de Hardware (SIMs y Routers)
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-orange-500/10 border border-orange-500/25 px-2 py-0.5 font-mono text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                <Database className="h-3 w-3" />
                Neon DB · sim_cards & equipment
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              Trazabilidad de tarjetas SIM corporativas (ICCID) y Routers 4G/5G vinculados a órdenes de trabajo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowPairForm((v) => !v);
              setShowAddForm(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-2 text-xs font-semibold text-orange-600 dark:text-orange-400 transition-colors"
          >
            <Link2 className="h-4 w-4" />
            Emparejar Router + SIM
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAddForm((v) => !v);
              setShowPairForm(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            Registrar Hardware
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar inventario de hardware"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* ── KPIs de resumen rápido ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 pt-4 shrink-0">
        <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/70 dark:bg-[#161616] px-3.5 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              Total Stock
            </p>
            <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">
              {stats.total}
            </p>
          </div>
          <Database className="h-5 w-5 text-orange-500" />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/70 dark:bg-[#161616] px-3.5 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              DISPONIBLE
            </p>
            <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">
              {stats.disponibles}
            </p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/70 dark:bg-[#161616] px-3.5 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              INSTALADA / ASIGNADA
            </p>
            <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">
              {stats.asignados}
            </p>
          </div>
          <Router className="h-5 w-5 text-blue-500" />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/70 dark:bg-[#161616] px-3.5 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              DEFECTUOSA / BAJA
            </p>
            <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">
              {stats.enFalla}
            </p>
          </div>
          <AlertTriangle className="h-5 w-5 text-rose-500" />
        </div>
      </div>

      {/* ── Formulario de Emparejamiento Router + SIM (api.inventory.pair) ── */}
      {showPairForm && (
        <form
          onSubmit={handlePairSubmit}
          className="mx-6 mt-4 rounded-xl border border-orange-500/40 bg-slate-50 dark:bg-[#141414] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end shrink-0"
        >
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-gray-400">
              Router Industrial (equipment_id)
            </label>
            <select
              required
              value={pairEquipmentId}
              onChange={(e) => setPairEquipmentId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="">Seleccionar Router...</option>
              {availableRouters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.identifier} — {r.model} ({r.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-gray-400">
              Tarjeta SIM Entel (sim_card_id)
            </label>
            <select
              required
              value={pairSimCardId}
              onChange={(e) => setPairSimCardId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="">Seleccionar SIM (ICCID)...</option>
              {availableSims.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.identifier} ({s.technology} · {s.status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPairing}
              className="flex-1 rounded-lg bg-orange-500 hover:bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {isPairing ? "Emparejando..." : "Confirmar Emparejamiento"}
            </button>
            <button
              type="button"
              onClick={() => setShowPairForm(false)}
              className="rounded-lg border border-slate-200 dark:border-gray-700 px-2.5 py-1.5 text-xs text-slate-600 dark:text-gray-400"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* ── Formulario rápido para registrar nuevo equipo/SIM ── */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="mx-6 mt-4 rounded-xl border border-orange-500/40 bg-slate-50 dark:bg-[#141414] p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end shrink-0"
        >
          {formError && (
            <div className="col-span-1 sm:col-span-5 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              <span className="font-medium">{formError}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-gray-400">
              Tipo Dispositivo
            </label>
            <select
              value={newItem.deviceType}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, deviceType: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="SIM">Tarjeta SIM</option>
              <option value="Router">Router CPE</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-gray-400">
              ICCID o N° de Serie
            </label>
            <input
              type="text"
              required
              value={newItem.identifier}
              onChange={(e) => {
                setFormError(null);
                setNewItem((prev) => ({ ...prev, identifier: e.target.value }));
              }}
              placeholder={
                newItem.deviceType === "SIM"
                  ? "89560200102400018500"
                  : "RTR-ENTEL-2024-009"
              }
              className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-gray-400">
              Modelo / Descripción
            </label>
            <input
              type="text"
              value={newItem.model}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, model: e.target.value }))
              }
              placeholder={
                newItem.deviceType === "SIM"
                  ? "SIM M2M Industrial 5G"
                  : "Teltonika RUTX50"
              }
              className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-gray-400">
              Tecnología
            </label>
            <select
              value={newItem.technology}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, technology: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="5G">5G</option>
              <option value="4G LTE">4G LTE</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-orange-500 hover:bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setShowAddForm(false);
                setFormError(null);
              }}
              className="rounded-lg border border-slate-200 dark:border-gray-700 px-2.5 py-1.5 text-xs text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* ── Barra de Búsqueda y Filtros Rápidos por Estado y Tecnología ── */}
      <div className="px-6 py-4 space-y-3 border-b border-slate-200 dark:border-gray-800 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-gray-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ICCID, Serie, modelo, OT o técnico..."
              aria-label="Buscar en inventario de hardware"
              className="w-full rounded-lg border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#141414] py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Filtros rápidos: Estado, Tecnología y Tipo */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mr-1">
              <Filter className="h-3 w-3 text-orange-500" />
              Estado:
            </span>
            {STATUS_OPTIONS.map((status) => (
              <FilterPill
                key={status}
                label={status}
                active={statusFilter === status}
                onClick={() =>
                  setStatusFilter((cur) => (cur === status ? null : status))
                }
              />
            ))}

            <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-gray-800 hidden sm:inline-block" />

            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mr-1">
              Red:
            </span>
            {TECH_OPTIONS.map((tech) => (
              <FilterPill
                key={tech}
                label={tech}
                active={techFilter === tech}
                onClick={() =>
                  setTechFilter((cur) => (cur === tech ? null : tech))
                }
              />
            ))}

            <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-gray-800 hidden sm:inline-block" />

            {TYPE_OPTIONS.map((type) => (
              <FilterPill
                key={type}
                label={type}
                active={typeFilter === type}
                onClick={() =>
                  setTypeFilter((cur) => (cur === type ? null : type))
                }
              />
            ))}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter(null);
                  setTechFilter(null);
                  setTypeFilter(null);
                }}
                className="ml-1 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabla de Inventario ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-kanban">
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-gray-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#161616]">
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-gray-400">
                  Tipo de Dispositivo
                </th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-gray-400">
                  Identificador (ICCID / N° de Serie)
                </th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-gray-400">
                  Operador / Tecnología
                </th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-gray-400">
                  Estado
                </th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-gray-400">
                  Orden / Técnico Asignado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-gray-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-xs text-slate-500 dark:text-gray-400"
                  >
                    No se encontraron dispositivos que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSim = item.deviceType === "SIM";
                  return (
                    <tr
                      key={item.id}
                      className="bg-white dark:bg-[#1e1e1e] hover:bg-slate-50/90 dark:hover:bg-[#252525] transition-colors"
                    >
                      {/* 1. Tipo de Dispositivo */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              isSim
                                ? "bg-orange-500/15 text-orange-500"
                                : "bg-blue-500/15 text-blue-500"
                            }`}
                          >
                            {isSim ? (
                              <CreditCard className="h-4 w-4" />
                            ) : (
                              <Router className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {item.deviceType}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-gray-400">
                              {item.model}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Identificador (ICCID o N° de Serie) */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                {item.identifier}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(item.identifier)}
                                title="Copiar identificador"
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                              >
                                {copiedId === item.identifier ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            <p className="font-mono text-[10px] text-slate-400 dark:text-gray-500">
                              {item.secondaryId}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 3. Operador / Tecnología */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                              item.technology === "5G"
                                ? "bg-orange-500 text-white"
                                : "bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-gray-700"
                            }`}
                          >
                            {item.technology}
                          </span>
                          <span className="text-xs font-medium text-slate-700 dark:text-gray-300">
                            {item.operator}
                          </span>
                        </div>
                      </td>

                      {/* 4. Estado */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            STATUS_BADGE_STYLES[item.status] ||
                            STATUS_BADGE_STYLES.DISPONIBLE
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* 5. Orden / Técnico Asignado */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.orderId || item.technician ? (
                          <div className="flex items-center gap-2">
                            {item.orderId && (
                              <span className="rounded bg-orange-500/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-orange-600 dark:text-orange-400">
                                {item.orderId}
                              </span>
                            )}
                            {item.technician && (
                              <>
                                <AdminAvatar
                                  name={item.technician}
                                  className="h-5 w-5 text-[9px]"
                                />
                                <span className="text-xs font-medium text-slate-800 dark:text-gray-200">
                                  {item.technician}
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-gray-500">
                            Sin asignar · {item.location || "Bodega Central RM"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer del Modal ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-gray-800 px-6 py-3.5 shrink-0 bg-slate-50/50 dark:bg-[#161616]">
        <p className="text-xs text-slate-500 dark:text-gray-400">
          Mostrando{" "}
          <strong className="text-slate-900 dark:text-white">
            {filteredItems.length}
          </strong>{" "}
          de{" "}
          <strong className="text-slate-900 dark:text-white">
            {hardwareInventory.length}
          </strong>{" "}
          dispositivos registrados en plataforma ATLAS
        </p>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition-colors shadow-xs"
          >
            Cerrar Inventario
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Modal de Inventario de Hardware (SIMs y Routers)
 */
export default function HardwareInventoryModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hardware-inventory-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <HardwareInventoryContent onClose={onClose} />
      </div>
    </div>,
    document.body
  );
}
