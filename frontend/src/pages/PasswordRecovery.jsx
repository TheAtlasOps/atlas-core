import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, LockKeyhole } from "lucide-react";
import ThemeToggle from "../components/ui/ThemeToggle";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { passwordRecoveryError, recoveryTokenFromHash } from "../utils/passwordRecovery";

const INPUT = "w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

export default function PasswordRecovery({ reset = false }) {
  const { logout } = useAuth();
  const [token, setToken] = useState(() => recoveryTokenFromHash(window.location.hash));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
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

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (reset) {
      const validation = passwordRecoveryError(password, confirmation);
      if (validation) { setError(validation); return; }
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
    <main className="relative flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900/90" aria-labelledby="recovery-title">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/20"><LockKeyhole aria-hidden="true" /></div>
        <p className="text-center text-xs font-semibold text-orange-600 dark:text-orange-400">ATLAS · Entel FSM</p>
        <h1 id="recovery-title" className="mt-2 text-center text-2xl font-bold">{reset ? "Establecer nueva contraseña" : "Recuperar acceso"}</h1>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">{reset ? "Elige una contraseña única de al menos 12 caracteres." : "Ingresa el correo asociado a tu cuenta de ATLAS."}</p>
        {(error || missingToken) && <p role="alert" className="mt-5 flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"><AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />{error || "El enlace está incompleto o no es válido. Solicita uno nuevo."}</p>}
        {message ? <p role="status" className="mt-5 flex gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />{message}</p> : !missingToken && (
          <form onSubmit={submit} className="mt-6 space-y-4" aria-busy={busy}>
            {reset ? <>
              <div><label htmlFor="recovery-password" className="mb-1.5 block text-sm font-medium">Nueva contraseña</label><input id="recovery-password" type="password" autoComplete="new-password" required minLength={12} className={INPUT} value={password} onChange={(event) => setPassword(event.target.value)} /></div>
              <div><label htmlFor="recovery-confirm" className="mb-1.5 block text-sm font-medium">Confirmar nueva contraseña</label><input id="recovery-confirm" type="password" autoComplete="new-password" required minLength={12} className={INPUT} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
            </> : <div><label htmlFor="recovery-email" className="mb-1.5 block text-sm font-medium">Correo electrónico</label><input id="recovery-email" type="email" autoComplete="email" required className={INPUT} value={email} onChange={(event) => setEmail(event.target.value)} /></div>}
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-700 disabled:cursor-wait disabled:opacity-60">{busy ? "Procesando…" : reset ? "Guardar nueva contraseña" : "Enviar instrucciones"}</button>
          </form>
        )}
        {reset && !message && <Link to="/forgot-password" className="mt-5 block text-center text-sm font-medium text-orange-600 hover:underline dark:text-orange-400">Solicitar otro enlace</Link>}
        <Link to="/login" className="mt-5 block text-center text-sm text-slate-600 hover:underline dark:text-slate-400">Volver al inicio de sesión</Link>
      </section>
    </main>
  );
}
