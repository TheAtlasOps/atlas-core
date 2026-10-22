import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirigir al dashboard si ya está autenticado
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Por favor ingresa tu correo y contraseña");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email.trim(), password);
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Correo electrónico o contraseña incorrectos");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-slate-950 px-4 py-8 text-slate-100 overflow-hidden selection:bg-orange-500 selection:text-white">
      {/* ── Luces de fondo y efectos dinámicos ── */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-orange-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* ── Tarjeta de Login Glassmorphic ── */}
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in zoom-in-95">
        {/* Cabecera / Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 shadow-lg shadow-orange-500/25 ring-1 ring-white/20">
            <span className="text-2xl">🌍</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400 mb-2">
            <Sparkles className="h-3 w-3" />
            <span>Atlas FSM · Entel B2B</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            Portal Corporativo
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Ingresa tus credenciales autorizadas para acceder a la plataforma
          </p>
        </div>

        {/* Alerta de Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-300 ring-1 ring-rose-500/20 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@atlasops.cl"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-orange-500 focus:bg-slate-800 focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 py-2.5 pl-10 pr-11 text-sm text-white placeholder-slate-500 outline-none transition focus:border-orange-500 focus:bg-slate-800 focus:ring-1 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:from-orange-600 hover:to-amber-700 hover:shadow-orange-500/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Sección de accesos rápidos para evaluación / pruebas */}
        <div className="mt-8 border-t border-slate-800/80 pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3 text-center">
            Accesos de Prueba (Duoc UC / Demo)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill("diego.jimenez@atlasops.cl", "atlas1234")}
              className="flex flex-col items-start rounded-lg border border-slate-800 bg-slate-800/40 p-2.5 text-left transition hover:border-orange-500/50 hover:bg-slate-800 text-xs"
            >
              <span className="font-medium text-slate-200">Admin</span>
              <span className="text-[10px] text-slate-400">diego.jimenez</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("alexander.saez@atlasops.cl", "atlas1234")}
              className="flex flex-col items-start rounded-lg border border-slate-800 bg-slate-800/40 p-2.5 text-left transition hover:border-orange-500/50 hover:bg-slate-800 text-xs"
            >
              <span className="font-medium text-slate-200">Admin BD</span>
              <span className="text-[10px] text-slate-400">alexander.saez</span>
            </button>
          </div>
        </div>

        {/* Footer de seguridad */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Acceso protegido mediante autenticación segura con JWT</span>
        </div>
      </div>
    </div>
  );
}
