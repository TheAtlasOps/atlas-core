import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-900 text-white">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
          <span className="absolute text-lg">🌍</span>
        </div>
        <p className="mt-4 text-xs font-medium tracking-widest text-slate-400 uppercase animate-pulse">
          Verificando sesión segura...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
