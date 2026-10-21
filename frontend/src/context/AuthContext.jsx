import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("atlas_token"));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("atlas_user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("atlas_token");
    localStorage.removeItem("atlas_user");
    setToken(null);
    setUser(null);
  }, []);

  const login = async (email, password) => {
    const res = await api.auth.login(email, password);
    if (!res?.access_token) {
      throw new Error("No se recibió token de acceso");
    }

    const accessToken = res.access_token;
    localStorage.setItem("atlas_token", accessToken);
    setToken(accessToken);

    // Obtener perfil verificado desde /auth/me
    try {
      const me = await api.auth.me();
      localStorage.setItem("atlas_user", JSON.stringify(me));
      setUser(me);
      return me;
    } catch (err) {
      // Si falla me(), usar datos básicos de la respuesta de token
      const fallbackUser = {
        email,
        full_name: res.full_name || email.split("@")[0],
        role: res.role || "COORDINADOR",
      };
      localStorage.setItem("atlas_user", JSON.stringify(fallbackUser));
      setUser(fallbackUser);
      return fallbackUser;
    }
  };

  // Validar sesión al montar
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const savedToken = localStorage.getItem("atlas_token");
      if (!savedToken) {
        if (!cancelled) {
          setUser(null);
          setToken(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const me = await api.auth.me();
        if (!cancelled) {
          setUser(me);
          localStorage.setItem("atlas_user", JSON.stringify(me));
        }
      } catch (err) {
        if (!cancelled) {
          // Token expirado o inválido
          logout();
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    checkSession();

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      cancelled = true;
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [logout]);

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
