import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LockKeyhole,
  Mail,
} from "lucide-react";
import ThemeToggle from "../components/ui/ThemeToggle";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  isValidEmail,
  isPasswordLengthValid,
  passwordRecoveryError,
  recoveryTokenFromHash,
} from "../utils/passwordRecovery";

export default function PasswordRecovery({ reset = false }) {
  const { logout } = useAuth();
  const [token, setToken] = useState(() => recoveryTokenFromHash(window.location.hash));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!reset) return undefined;
    // Mantener el token solo en memoria; nunca en logs HTTP, storage o referrers.
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    const previous = document.querySelector('meta[name="referrer"]');
    const previousContent = previous?.getAttribute("content");
    const meta = previous || document.createElement("meta");
    meta.name = "referrer";
    meta.content = "no-referrer";
    if (!previous) document.head.appendChild(meta);

    function readNewLink() {
      if (!window.location.hash) return;
      setToken(recoveryTokenFromHash(window.location.hash));
      setPassword("");
      setConfirmation("");
      setMessage("");
      setError("");
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }

    window.addEventListener("hashchange", readNewLink);
    return () => {
      window.removeEventListener("hashchange", readNewLink);
      if (!previous) meta.remove();
      else if (previousContent === null) meta.removeAttribute("content");
      else meta.setAttribute("content", previousContent);
    };
  }, [reset]);

  // Validaciones reactivas en frontend
  const passwordLength = Array.from(password).length;
  const hasMinLength = passwordLength >= 12 && Boolean(password.trim());
  const isByteLengthValid = new TextEncoder().encode(password).length <= 72;
  const isLengthValid = isPasswordLengthValid(password);
  const passwordsMatch = Boolean(password && confirmation && password === confirmation);

  const canSubmitReset = isLengthValid && passwordsMatch && Boolean(token);
  const canSubmitRequest = Boolean(email.trim());
  const isSubmitDisabled = busy || (reset ? !canSubmitReset : !canSubmitRequest);

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (reset) {
      const validation = passwordRecoveryError(password, confirmation);
      if (validation) {
        setError(validation);
        return;
      }
    } else {
      const cleanEmail = email.trim();
      if (!isValidEmail(cleanEmail)) {
        setError("Ingresa un correo electrónico válido");
        return;
      }
    }

    setBusy(true);
    try {
      if (reset) {
        await api.auth.confirmPasswordReset(token, password, confirmation);
        logout();
        setMessage("Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.");
        setPassword("");
        setConfirmation("");
        setToken("");
      } else {
        await api.auth.requestPasswordReset(email.trim());
        setMessage("Si el correo corresponde a una cuenta habilitada, recibirás instrucciones para recuperar el acceso.");
      }
    } catch (err) {
      setError(reset && err.status === 400 ? err.message : "No pudimos procesar la solicitud. Inténtalo de nuevo más tarde.");
    } finally {
      setBusy(false);
    }
  }

  const missingToken = reset && !token && !message;

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <section
        className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white/95 p-8 shadow-xl backdrop-blur-sm transition-colors duration-200 dark:border-slate-800/90 dark:bg-slate-900/95"
        aria-labelledby="recovery-title"
      >
        {/* Cabecera / Identidad */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/20">
          <LockKeyhole className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          ATLAS · Entel FSM
        </p>
        <h1 id="recovery-title" className="mt-2 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {reset ? "Establecer nueva contraseña" : "Recuperar acceso"}
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          {reset
            ? "Elige una contraseña única y segura de al menos 12 caracteres."
            : "Ingresa el correo corporativo asociado a tu cuenta de ATLAS."}
        </p>

        {/* Mensaje de error */}
        {(error || missingToken) && (
          <p
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{error || "El enlace está incompleto o no es válido. Solicita uno nuevo."}</span>
          </p>
        )}

        {/* Mensaje de éxito / confirmación */}
        {message ? (
          <div className="mt-6 space-y-5">
            <p
              role="status"
              className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>{message}</span>
            </p>
            <Link
              to="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:from-orange-600 hover:to-amber-700"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Ir a iniciar sesión
            </Link>
          </div>
        ) : !missingToken && (
          <form onSubmit={submit} className="mt-6 space-y-4" aria-busy={busy} noValidate>
            {reset ? (
              <>
                {/* Campo: Nueva Contraseña */}
                <div>
                  <label htmlFor="recovery-password" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                    <input
                      id="recovery-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={12}
                      className="w-full rounded-xl border border-slate-300 bg-slate-100 py-2.5 pl-10 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-800"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (error) setError("");
                      }}
                      placeholder="Mínimo 12 caracteres"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>

                  {/* Indicador visual de regla: mínimo 12 caracteres */}
                  <div className="mt-2 space-y-1 text-xs">
                    <div
                      className={`flex items-center gap-1.5 transition-colors ${
                        hasMinLength
                          ? "font-medium text-emerald-600 dark:text-emerald-400"
                          : password
                          ? "text-slate-600 dark:text-slate-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {hasMinLength ? (
                        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <div className="mx-1 h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" aria-hidden="true" />
                      )}
                      <span>
                        Mínimo 12 caracteres {password && !hasMinLength ? `(${passwordLength}/12)` : ""}
                      </span>
                    </div>

                    {!isByteLengthValid && (
                      <p className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>La contraseña no debe superar 72 bytes.</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Campo: Confirmar Contraseña */}
                <div>
                  <label htmlFor="recovery-confirm" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Confirmar nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                    <input
                      id="recovery-confirm"
                      type={showConfirmation ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={12}
                      className="w-full rounded-xl border border-slate-300 bg-slate-100 py-2.5 pl-10 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-800"
                      value={confirmation}
                      onChange={(event) => {
                        setConfirmation(event.target.value);
                        if (error) setError("");
                      }}
                      placeholder="Repite la contraseña"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmation ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"}
                      aria-pressed={showConfirmation}
                      onClick={() => setShowConfirmation((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      {showConfirmation ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>

                  {/* Indicador visual de coincidencia de contraseñas */}
                  {confirmation && (
                    <div
                      className={`mt-2 flex items-center gap-1.5 text-xs transition-colors ${
                        passwordsMatch
                          ? "font-medium text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {passwordsMatch ? (
                        <>
                          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>Las contraseñas coinciden</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>Las contraseñas no coinciden aún</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Campo: Correo Electrónico */
              <div>
                <label htmlFor="recovery-email" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  <input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-800"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError("");
                    }}
                    placeholder="ejemplo@atlasfsm.cl"
                  />
                </div>
              </div>
            )}

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:from-orange-600 hover:to-amber-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-orange-500 disabled:hover:to-amber-600"
            >
              {busy ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Procesando…</span>
                </>
              ) : reset ? (
                "Guardar nueva contraseña"
              ) : (
                "Enviar instrucciones"
              )}
            </button>
          </form>
        )}

        {/* Enlaces de pie de formulario */}
        {reset && !message && (
          <Link
            to="/forgot-password"
            className="mt-5 block text-center text-sm font-medium text-orange-600 transition hover:underline dark:text-orange-400"
          >
            Solicitar otro enlace
          </Link>
        )}

        <Link
          to="/login"
          className="mt-4 flex items-center justify-center gap-1.5 text-center text-sm text-slate-600 transition hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Volver al inicio de sesión</span>
        </Link>
      </section>
    </main>
  );
}
