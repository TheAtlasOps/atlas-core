import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, UserPlus, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-[#121212] dark:text-white dark:placeholder:text-gray-500";
const LABEL_CLASS =
  "mb-1.5 block text-xs font-medium text-slate-500 dark:text-gray-400";

const INITIAL_FORM = {
  fullName: "",
  rut: "",
  email: "",
  password: "",
  phone: "",
  vehiclePlate: "",
};

function NewTechnicianForm({ onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const setField = (field) => (e) => {
    setErrorMessage("");
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const payload = {
      full_name: form.fullName.trim(),
      rut: form.rut.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      phone: form.phone.trim() || null,
      vehicle_plate: form.vehiclePlate.trim().toUpperCase() || null,
    };

    try {
      const createdTech = await api.orders.createTechnician(payload);
      if (onCreated) onCreated(createdTech);
      onClose();
    } catch (err) {
      console.error("Error registrando técnico:", err);
      setErrorMessage(
        err.message || "Error al dar de alta al técnico. Verifica el RUT y correo."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 dark:bg-orange-500/20">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="new-tech-title"
              className="text-base font-semibold text-slate-900 dark:text-white"
            >
              Registrar Nuevo Técnico
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Crea su cuenta de usuario con rol Técnico y credenciales móviles.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-4">
        <div>
          <label htmlFor="new-tech-fullname" className={LABEL_CLASS}>
            Nombre Completo
          </label>
          <input
            id="new-tech-fullname"
            type="text"
            required
            value={form.fullName}
            onChange={setField("fullName")}
            placeholder="Ej: Marcelo Ríos Araya"
            className={FIELD_CLASS}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="new-tech-rut" className={LABEL_CLASS}>
              RUT Chileno
            </label>
            <input
              id="new-tech-rut"
              type="text"
              required
              value={form.rut}
              onChange={setField("rut")}
              placeholder="Ej: 18.765.432-1"
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor="new-tech-plate" className={LABEL_CLASS}>
              Patente Móvil (Opcional)
            </label>
            <input
              id="new-tech-plate"
              type="text"
              value={form.vehiclePlate}
              onChange={setField("vehiclePlate")}
              placeholder="Ej: HH-LK-89"
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="new-tech-email" className={LABEL_CLASS}>
              Correo Corporativo (App Móvil)
            </label>
            <input
              id="new-tech-email"
              type="email"
              required
              value={form.email}
              onChange={setField("email")}
              placeholder="Ej: marcelo.rios@atlasops.cl"
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor="new-tech-phone" className={LABEL_CLASS}>
              Teléfono / WhatsApp
            </label>
            <input
              id="new-tech-phone"
              type="tel"
              value={form.phone}
              onChange={setField("phone")}
              placeholder="Ej: +56 9 8765 4321"
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <div>
          <label htmlFor="new-tech-pass" className={LABEL_CLASS}>
            Contraseña Inicial de Acceso
          </label>
          <input
            id="new-tech-pass"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={setField("password")}
            placeholder="Mínimo 6 caracteres (ej: Atlas2026!Tec)"
            className={FIELD_CLASS}
          />
          <span className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            La clave será cifrada con bcrypt antes de guardarse en base de datos.
          </span>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 active:scale-95 disabled:opacity-60"
        >
          {isSubmitting ? (
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          )}
          {isSubmitting ? "Registrando..." : "Registrar Técnico"}
        </button>
      </div>
    </form>
  );
}

export default function NewTechnicianModal({ isOpen, onClose, onCreated }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-tech-title"
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-[#1e1e1e]"
      >
        <NewTechnicianForm onClose={onClose} onCreated={onCreated} />
      </div>
    </div>,
    document.body
  );
}
