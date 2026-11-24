import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Building2,
  Home,
  Mail,
  Phone,
  MapPin,
  User,
  CreditCard,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { api } from "../../lib/api";
import { formatChileanRut, validateChileanRut } from "../../lib/rut";

const SANTIAGO_COMUNAS = [
  "Cerrillos",
  "Cerro Navia",
  "Conchalí",
  "El Bosque",
  "Estación Central",
  "Huechuraba",
  "Independencia",
  "La Cisterna",
  "La Florida",
  "La Granja",
  "La Pintana",
  "La Reina",
  "Las Condes",
  "Lo Barnechea",
  "Lo Espejo",
  "Lo Prado",
  "Macul",
  "Maipú",
  "Ñuñoa",
  "Pedro Aguirre Cerda",
  "Peñalolén",
  "Providencia",
  "Pudahuel",
  "Quilicura",
  "Quinta Normal",
  "Recoleta",
  "Renca",
  "San Joaquín",
  "San Miguel",
  "San Ramón",
  "Santiago",
  "Vitacura",
  "Puente Alto",
  "San Bernardo",
];

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-[#121212] dark:text-white dark:placeholder:text-gray-500";
const LABEL_CLASS =
  "mb-1.5 block text-xs font-medium text-slate-500 dark:text-gray-400";

const EMPTY_FORM = {
  client_type: "EMPRESARIAL",
  business_name: "",
  rut: "",
  contact_person: "",
  contact_email: "",
  contact_phone: "",
  secondary_phone: "",
  address: "",
  comuna: "Santiago",
  region: "Metropolitana",
  lat: null,
  lng: null,
};

export default function ClientModal({
  isOpen,
  onClose,
  initialClient = null,
  onSuccess,
}) {
  const isEditing = Boolean(initialClient?.id);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isResidential = form.client_type === "RESIDENCIAL";

  useEffect(() => {
    if (isOpen) {
      if (initialClient) {
        setForm({
          client_type: initialClient.client_type || "EMPRESARIAL",
          business_name: initialClient.business_name || "",
          rut: initialClient.rut || "",
          contact_person: initialClient.contact_person || "",
          contact_email: initialClient.contact_email || "",
          contact_phone: initialClient.contact_phone || "",
          secondary_phone: initialClient.secondary_phone || "",
          address: initialClient.address || "",
          comuna: initialClient.comuna || "Santiago",
          region: initialClient.region || "Metropolitana",
          lat:
            initialClient.lat !== null && initialClient.lat !== undefined
              ? Number(initialClient.lat)
              : null,
          lng:
            initialClient.lng !== null && initialClient.lng !== undefined
              ? Number(initialClient.lng)
              : null,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setFormError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, initialClient]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const setField = (field) => (e) => {
    setFormError(null);
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleClientTypeChange = (nextType) => {
    setFormError(null);
    setForm((prev) => ({ ...prev, client_type: nextType }));
  };

  const handleRutBlur = () => {
    if (!form.rut.trim()) return;
    if (validateChileanRut(form.rut)) {
      setForm((prev) => ({ ...prev, rut: formatChileanRut(prev.rut) }));
    }
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const businessName = form.business_name.trim();
    const contactEmail = form.contact_email.trim().toLowerCase();
    const contactPhone = form.contact_phone.trim();
    const secondaryPhone = form.secondary_phone.trim();
    const rawRut = form.rut.trim();
    const address = form.address.trim();
    const comuna = form.comuna.trim() || "Santiago";

    if (!businessName) {
      setFormError(
        isResidential
          ? "El nombre completo del cliente residencial es obligatorio."
          : "La razón social o nombre de la empresa es obligatorio."
      );
      return;
    }
    if (rawRut && !validateChileanRut(rawRut)) {
      setFormError(
        "El RUT ingresado no es válido. Verifique el número y el dígito verificador."
      );
      return;
    }
    if (!contactEmail) {
      setFormError("El correo electrónico de contacto es obligatorio.");
      return;
    }
    if (!validateEmail(contactEmail)) {
      setFormError(
        isResidential
          ? "Ingrese un correo electrónico válido (ej: nombre@correo.cl)."
          : "Ingrese un correo electrónico válido (ej: contacto@empresa.cl)."
      );
      return;
    }
    if (!contactPhone || contactPhone.length < 5) {
      setFormError("El teléfono de contacto es obligatorio (mínimo 5 caracteres).");
      return;
    }
    if (isResidential && secondaryPhone && secondaryPhone.length < 5) {
      setFormError("El teléfono alternativo debe tener al menos 5 caracteres.");
      return;
    }
    if (!address || address.length < 3) {
      setFormError(
        isResidential
          ? "La dirección del domicilio es obligatoria."
          : "La dirección comercial o técnica es obligatoria."
      );
      return;
    }

    const formattedRut = rawRut ? formatChileanRut(rawRut) : null;

    const payload = {
      client_type: form.client_type,
      business_name: businessName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      secondary_phone: isResidential ? secondaryPhone || null : form.secondary_phone.trim() || null,
      address,
      comuna,
      region: form.region.trim() || "Metropolitana",
      rut: formattedRut,
      contact_person: isResidential ? null : form.contact_person.trim() || null,
      lat: form.lat !== null && form.lat !== undefined ? Number(form.lat) : null,
      lng: form.lng !== null && form.lng !== undefined ? Number(form.lng) : null,
    };

    setIsSubmitting(true);
    try {
      let resultClient;
      if (isEditing) {
        resultClient = await api.clients.update(initialClient.id, payload);
      } else {
        resultClient = await api.clients.create(payload);
      }

      if (onSuccess) {
        onSuccess(resultClient);
      }
      onClose();
    } catch (err) {
      console.error("Error al guardar cliente:", err);
      const msg =
        err?.message ||
        err?.detail ||
        "No se pudo guardar el cliente en Neon. Compruebe los datos e intente nuevamente.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-modal-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-[#1e1e1e] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                isResidential
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"
              }`}
            >
              {isResidential ? (
                <Home className="h-5 w-5" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2
                id="client-modal-title"
                className="text-base font-bold text-foreground"
              >
                {isEditing
                  ? `Editar Cliente — ${initialClient.business_name}`
                  : "Registrar Nuevo Cliente"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? isResidential
                    ? "Actualiza los datos domiciliarios y de contacto en Neon"
                    : "Actualiza la información comercial y de contacto en Neon"
                  : "Selecciona el tipo de cliente e ingresa sus datos en la plataforma"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mensaje de error si falla la validación o el backend */}
        {formError && (
          <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Error en el formulario</p>
              <p className="mt-0.5 leading-relaxed">{formError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          {/* Selector visual Empresarial / Residencial */}
          <div>
            <span className={LABEL_CLASS}>
              Tipo de Cliente <span className="text-orange-500">*</span>
            </span>
            <div
              role="radiogroup"
              aria-label="Tipo de cliente"
              className="grid grid-cols-2 gap-3"
            >
              <button
                type="button"
                role="radio"
                aria-checked={!isResidential}
                onClick={() => handleClientTypeChange("EMPRESARIAL")}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                  !isResidential
                    ? "border-orange-500 bg-orange-500/10 text-foreground ring-1 ring-orange-500 dark:bg-orange-950/30"
                    : "border-slate-200 bg-slate-50/70 text-muted-foreground hover:border-slate-300 dark:border-gray-700 dark:bg-[#121212] dark:hover:border-gray-600"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                    !isResidential
                      ? "bg-orange-500 text-white"
                      : "bg-slate-200/80 text-slate-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Empresarial</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Empresa o entidad
                  </p>
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={isResidential}
                onClick={() => handleClientTypeChange("RESIDENCIAL")}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                  isResidential
                    ? "border-orange-500 bg-orange-500/10 text-foreground ring-1 ring-orange-500 dark:bg-orange-950/30"
                    : "border-slate-200 bg-slate-50/70 text-muted-foreground hover:border-slate-300 dark:border-gray-700 dark:bg-[#121212] dark:hover:border-gray-600"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                    isResidential
                      ? "bg-orange-500 text-white"
                      : "bg-slate-200/80 text-slate-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  <Home className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Residencial</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Persona o domicilio
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Razón Social / Nombre Completo */}
          <div>
            <label htmlFor="client-business-name" className={LABEL_CLASS}>
              {isResidential
                ? "Nombre Completo"
                : "Razón Social / Nombre Comercial"}{" "}
              <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              {isResidential ? (
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              ) : (
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
              <input
                id="client-business-name"
                type="text"
                required
                value={form.business_name}
                onChange={setField("business_name")}
                placeholder={
                  isResidential
                    ? "Ej: María Fernanda González"
                    : "Ej: Entel B2B Soluciones SpA"
                }
                className={`${FIELD_CLASS} pl-9`}
              />
            </div>
          </div>

          <div
            className={`grid grid-cols-1 gap-4 ${
              isResidential ? "" : "sm:grid-cols-2"
            }`}
          >
            {/* RUT */}
            <div>
              <label htmlFor="client-rut" className={LABEL_CLASS}>
                {isResidential ? "RUT Personal" : "RUT de la Empresa"}
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="client-rut"
                  type="text"
                  value={form.rut}
                  onChange={setField("rut")}
                  onBlur={handleRutBlur}
                  placeholder={isResidential ? "Ej: 12.345.678-5" : "Ej: 76.123.456-0"}
                  className={`${FIELD_CLASS} pl-9 font-mono`}
                />
              </div>
            </div>

            {/* Persona de Contacto (solo Empresarial) */}
            {!isResidential && (
              <div>
                <label htmlFor="client-contact-person" className={LABEL_CLASS}>
                  Persona de Contacto
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="client-contact-person"
                    type="text"
                    value={form.contact_person}
                    onChange={setField("contact_person")}
                    placeholder="Ej: Camila Valenzuela"
                    className={`${FIELD_CLASS} pl-9`}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Correo Electrónico */}
            <div>
              <label htmlFor="client-contact-email" className={LABEL_CLASS}>
                Correo Electrónico <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="client-contact-email"
                  type="email"
                  required
                  value={form.contact_email}
                  onChange={setField("contact_email")}
                  placeholder={
                    isResidential ? "nombre@correo.cl" : "contacto@empresa.cl"
                  }
                  className={`${FIELD_CLASS} pl-9`}
                />
              </div>
            </div>

            {/* Teléfono Principal */}
            <div>
              <label htmlFor="client-contact-phone" className={LABEL_CLASS}>
                {isResidential ? "Teléfono" : "Teléfono de Contacto"}{" "}
                <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="client-contact-phone"
                  type="tel"
                  required
                  value={form.contact_phone}
                  onChange={setField("contact_phone")}
                  placeholder="+56 9 7111 2222"
                  className={`${FIELD_CLASS} pl-9`}
                />
              </div>
            </div>
          </div>

          {/* Teléfono Alternativo Opcional (Residencial) */}
          {isResidential && (
            <div>
              <label htmlFor="client-secondary-phone" className={LABEL_CLASS}>
                Teléfono Alternativo (Opcional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="client-secondary-phone"
                  type="tel"
                  value={form.secondary_phone}
                  onChange={setField("secondary_phone")}
                  placeholder="+56 2 2345 6789 o celular adicional"
                  className={`${FIELD_CLASS} pl-9`}
                />
              </div>
            </div>
          )}

          {/* Dirección */}
          <div>
            <label htmlFor="client-address" className={LABEL_CLASS}>
              {isResidential
                ? "Dirección del Domicilio"
                : "Dirección Comercial / Instalación"}{" "}
              <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="client-address"
                type="text"
                required
                value={form.address}
                onChange={setField("address")}
                placeholder={
                  isResidential
                    ? "Ej: Pasaje Los Robles 452, Depto 302"
                    : "Ej: Av. Providencia 1234, Piso 3"
                }
                className={`${FIELD_CLASS} pl-9`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Comuna */}
            <div>
              <label htmlFor="client-comuna" className={LABEL_CLASS}>
                Comuna <span className="text-orange-500">*</span>
              </label>
              <input
                id="client-comuna"
                type="text"
                required
                list="client-comunas-datalist"
                value={form.comuna}
                onChange={setField("comuna")}
                placeholder="Ej: Providencia"
                className={FIELD_CLASS}
              />
              <datalist id="client-comunas-datalist">
                {SANTIAGO_COMUNAS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* Región */}
            <div>
              <label htmlFor="client-region" className={LABEL_CLASS}>
                Región
              </label>
              <input
                id="client-region"
                type="text"
                value={form.region}
                onChange={setField("region")}
                placeholder="Metropolitana"
                className={FIELD_CLASS}
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando en Neon...
                </>
              ) : isEditing ? (
                "Guardar Cambios"
              ) : (
                "Crear Cliente"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
