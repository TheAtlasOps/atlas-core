import { useState, useEffect } from "react";
import { User, Bell, Lock, CheckCircle2, Shield, Server, ChevronRight } from "lucide-react";

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Administra tus preferencias de cuenta y notificaciones del sistema.
        </p>
      </div>

      {/* Grid skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="h-[300px] rounded-xl bg-gray-800 animate-pulse" />
        <div className="h-[300px] rounded-xl bg-gray-800 animate-pulse" />
        <div className="h-[240px] rounded-xl bg-gray-800 animate-pulse" />
        <div className="h-[240px] rounded-xl bg-gray-800 animate-pulse" />
      </div>

    </div>
  );
}

// ─── Toggle Row ────────────────────────────────────────────────────────────────
function ToggleRow({ label, description, enabled, onToggle }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-800/70 last:border-0">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-gray-200">{label}</span>
        {description && (
          <span className="text-xs text-gray-500">{description}</span>
        )}
      </div>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        aria-pressed={enabled}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 ${
          enabled ? "bg-green-500" : "bg-gray-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
            enabled ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ children }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#13151A] p-6 flex flex-col gap-5">
      {children}
    </div>
  );
}

// ─── Card Header ──────────────────────────────────────────────────────────────
function CardHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-3 pb-1 border-b border-gray-800">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-gray-400">
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
    </div>
  );
}

// ─── Input field ──────────────────────────────────────────────────────────────
function Field({ label, value, onChange, disabled = false, type = "text", placeholder }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-sm text-gray-200 outline-none transition
            placeholder:text-gray-500
            focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30
            disabled:cursor-not-allowed disabled:text-gray-500 disabled:select-none`}
        />
        {disabled && (
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Settings() {
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Profile state
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");

  // Notification toggles
  const [notifs, setNotifs] = useState({
    ordenes: true,
    magicLinks: true,
    sistema: false,
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  function toggle(key) {
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="flex flex-col gap-2">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Administra tus preferencias de cuenta y notificaciones del sistema.
        </p>
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

        {/* ── Tarjeta 1: Perfil ── */}
        <Card>
          <CardHeader icon={User} title="Información Personal" />

          <div className="flex flex-col gap-4">
            <Field
              label="Nombre Completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Nombre y Apellido"
            />
            <Field
              label="Correo Electrónico"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="ejemplo@entel.cl"
            />
            <Field
              label="Rol"
              value="Despachador Master"
              disabled
            />
          </div>
        </Card>

        {/* ── Tarjeta 2: Notificaciones ── */}
        <Card>
          <CardHeader icon={Bell} title="Notificaciones" />

          <div className="flex flex-col">
            <ToggleRow
              label="Nuevas Órdenes de Trabajo"
              description="Recibe alertas cuando se creen nuevas OT."
              enabled={notifs.ordenes}
              onToggle={() => toggle("ordenes")}
            />
            <ToggleRow
              label="Alertas de Magic Links"
              description="Notificaciones de acceso por enlace de sesión."
              enabled={notifs.magicLinks}
              onToggle={() => toggle("magicLinks")}
            />
            <ToggleRow
              label="Actualizaciones de sistema"
              description="Avisos de mantenimiento y nuevas versiones."
              enabled={notifs.sistema}
              onToggle={() => toggle("sistema")}
            />
          </div>
        </Card>

        {/* ── Tarjeta 3: Seguridad y Acceso ── */}
        <Card>
          <CardHeader icon={Shield} title="Seguridad y Acceso" />

          <div className="flex flex-col gap-3">
            {/* Cambiar Contraseña */}
            <button className="w-full bg-gray-800 hover:bg-gray-700 transition-colors text-left px-4 py-3 rounded-lg flex justify-between items-center group">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-gray-200">Cambiar Contraseña</span>
                <span className="text-xs text-gray-500">Última modificación hace 3 meses.</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </button>

            {/* 2FA */}
            <button className="w-full bg-gray-800 hover:bg-gray-700 transition-colors text-left px-4 py-3 rounded-lg flex justify-between items-center group">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">Configurar Autenticación 2FA</span>
                  <span className="inline-flex items-center rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400 ring-1 ring-orange-500/25">
                    Recomendado
                  </span>
                </div>
                <span className="text-xs text-gray-500">Añade una capa extra de seguridad a tu cuenta.</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </button>
          </div>
        </Card>

        {/* ── Tarjeta 4: Integraciones Cloud ── */}
        <Card>
          <CardHeader icon={Server} title="Integraciones Cloud" />

          <div className="flex flex-col gap-1">
            {/* API Backend Atlas */}
            <div className="flex items-center justify-between py-3.5 border-b border-gray-800/70">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-gray-200">API Backend Atlas</span>
                <span className="text-xs text-gray-500">REST · Node.js · atlas-api-prod</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                <span className="text-xs font-medium text-green-500/80">Conectado</span>
              </div>
            </div>

            {/* Base de Datos */}
            <div className="flex items-center justify-between py-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-gray-200">Base de Datos Principal</span>
                <span className="text-xs text-gray-500">PostgreSQL 15 · Cloud SQL · atlas-db</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                <span className="text-xs font-medium text-green-500/80">Conectado</span>
              </div>
            </div>
          </div>
        </Card>

      </div>

      {/* ── Footer Actions ── */}
      <div className="flex items-center justify-end pt-2 mt-2">
        <button
          onClick={handleSave}
          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-all shadow-sm
            ${saved
              ? "bg-green-600 shadow-green-500/20 cursor-default"
              : "bg-orange-500 hover:bg-orange-400 active:bg-orange-600 shadow-orange-500/20"
            }`}
        >
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Cambios guardados
            </>
          ) : (
            "Guardar Cambios"
          )}
        </button>
      </div>
    </div>
  );
}

