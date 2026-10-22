import { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Truck,
  Plus,
  Search,
  Phone,
  CreditCard,
  Car,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { api } from "../lib/api";
import NewTechnicianModal from "../components/ui/NewTechnicianModal";

export default function Technicians() {
  const [technicians, setTechnicians] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAvailability, setFilterAvailability] = useState("ALL"); // ALL, AVAILABLE, UNAVAILABLE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [notification, setNotification] = useState("");

  const loadTechnicians = async () => {
    try {
      setIsLoading(true);
      const data = await api.orders.getTechnicians();
      if (Array.isArray(data)) {
        setTechnicians(data);
      }
    } catch (err) {
      console.error("Error al cargar técnicos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTechnicians();
  }, []);

  const handleToggleAvailability = async (techId) => {
    try {
      setTogglingId(techId);
      const updated = await api.orders.toggleTechnicianAvailability(techId);
      setTechnicians((prev) =>
        prev.map((t) => (t.id === techId ? { ...t, is_available: updated.is_available } : t))
      );
      showNotification(`Estado de disponibilidad actualizado correctamente.`);
    } catch (err) {
      console.error("Error al alternar disponibilidad:", err);
      showNotification("Error al alternar disponibilidad del técnico.");
    } finally {
      setTogglingId(null);
    }
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 4000);
  };

  const handleTechnicianCreated = (newTech) => {
    setTechnicians((prev) => [newTech, ...prev]);
    showNotification(`¡Técnico ${newTech.full_name} registrado exitosamente!`);
  };

  // KPIs
  const totalCount = technicians.length;
  const availableCount = technicians.filter((t) => t.is_available).length;
  const unavailableCount = totalCount - availableCount;
  const vehiclesCount = technicians.filter((t) => Boolean(t.vehicle_plate)).length;

  // Filtrado
  const filteredTechnicians = useMemo(() => {
    return technicians.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.full_name?.toLowerCase().includes(q) ||
        t.rut?.toLowerCase().includes(q) ||
        t.vehicle_plate?.toLowerCase().includes(q) ||
        t.phone?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterAvailability === "AVAILABLE") return t.is_available;
      if (filterAvailability === "UNAVAILABLE") return !t.is_available;
      return true;
    });
  }, [technicians, searchQuery, filterAvailability]);

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl dark:bg-white dark:text-slate-900 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Gestión de Técnicos
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400">
            Administración de cuadrillas en terreno, asignación de vehículos y disponibilidad operativa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTechnicians}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95 dark:border-gray-700 dark:bg-[#1e1e1e] dark:text-gray-200 dark:hover:bg-gray-800"
            title="Refrescar listado"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Registrar Técnico</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1e1e1e]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 dark:bg-blue-500/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-gray-400">Total Técnicos</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1e1e1e]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-gray-400">Disponibles</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{availableCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1e1e1e]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/20">
            <UserX className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-gray-400">No Disponibles</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{unavailableCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1e1e1e]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 dark:bg-purple-500/20">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-gray-400">Vehículos Asignados</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{vehiclesCount}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-[#1e1e1e]">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, RUT o patente..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-[#121212] dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-[#1e1e1e]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterAvailability("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filterAvailability === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            onClick={() => setFilterAvailability("AVAILABLE")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filterAvailability === "AVAILABLE"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Disponibles ({availableCount})
          </button>
          <button
            onClick={() => setFilterAvailability("UNAVAILABLE")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filterAvailability === "UNAVAILABLE"
                ? "bg-amber-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            No Disponibles ({unavailableCount})
          </button>
        </div>
      </div>

      {/* Grid of Technicians */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-xl border border-slate-200 bg-slate-100 animate-pulse dark:border-gray-800 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : filteredTechnicians.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-12 text-center dark:border-gray-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-gray-800 text-slate-400">
            <Users className="h-6 w-6" />
          </div>
          <p className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            No se encontraron técnicos
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
            {searchQuery
              ? "Prueba cambiando el término de búsqueda o filtro."
              : "Comienza registrando al primer técnico de cuadrilla en terreno."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar Primer Técnico</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTechnicians.map((tech) => {
            const isToggling = togglingId === tech.id;
            return (
              <div
                key={tech.id}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-[#1e1e1e]"
              >
                <div>
                  {/* Top: Avatar & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 font-bold text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                        {tech.initials || "TC"}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white leading-snug">
                          {tech.full_name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>{tech.rut || "Sin RUT"}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        tech.is_available
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          tech.is_available ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      {tech.is_available ? "Disponible" : "Ocupado"}
                    </span>
                  </div>

                  {/* Body: Contact & Vehicle */}
                  <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-gray-800 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-gray-300">
                      <span className="flex items-center gap-1.5 text-slate-400 dark:text-gray-500">
                        <Phone className="h-3.5 w-3.5" />
                        Teléfono
                      </span>
                      <span className="font-medium">{tech.phone || "No especificado"}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-gray-300">
                      <span className="flex items-center gap-1.5 text-slate-400 dark:text-gray-500">
                        <Car className="h-3.5 w-3.5" />
                        Vehículo
                      </span>
                      {tech.vehicle_plate ? (
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono font-bold text-slate-800 dark:bg-gray-800 dark:text-gray-200">
                          {tech.vehicle_plate}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500">Sin vehículo</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer: Toggle Availability Action */}
                <div className="mt-5 border-t border-slate-100 pt-3 dark:border-gray-800">
                  <button
                    onClick={() => handleToggleAvailability(tech.id)}
                    disabled={isToggling}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition active:scale-95 ${
                      tech.is_available
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                    }`}
                  >
                    {isToggling ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : tech.is_available ? (
                      <>
                        <ToggleRight className="h-4 w-4 text-emerald-500" />
                        <span>Marcar No Disponible</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-4 w-4 text-slate-400" />
                        <span>Habilitar en Campo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Registrar Técnico */}
      <NewTechnicianModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleTechnicianCreated}
      />
    </div>
  );
}
