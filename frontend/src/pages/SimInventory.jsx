import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { HardwareInventoryContent } from "../components/ui/HardwareInventoryModal";
import { useWorkOrders } from "../context/WorkOrderContext";

export default function SimInventory() {
  const { toast, setToast } = useWorkOrders();

  const isError = toast?.type === "error";

  return (
    <div className="flex flex-col gap-4">
      {toast && (
        <aside
          role="status"
          aria-live="polite"
          className={`fixed top-6 right-6 z-[100] flex max-w-sm items-center gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200 ${
            isError
              ? "border-rose-500/50 bg-white/95 dark:bg-gray-900/95 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30"
              : "border-emerald-500/50 bg-white/95 dark:bg-gray-900/95 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30"
          }`}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              isError
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {isError ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-900 dark:text-white">
              {toast.title}
            </p>
            <p className="text-slate-600 dark:text-gray-300 mt-0.5">
              {toast.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" />
          </button>
        </aside>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] shadow-xs">
        <HardwareInventoryContent />
      </div>
    </div>
  );
}
