"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return ctx;
};

// Bem mais simples que a versão SPA: não há token para gerenciar no cliente
// (fica em cookie httpOnly, cuidado pelos Route Handlers em app/api/auth/*).
// Este contexto só guarda o usuário (para exibir nome/role na UI) e expõe
// login/logout, que conversam com o BFF — nunca com o backend Go direto.
export function AuthProvider({ children, initialUser = null }) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(initialUser === null);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Se o Server Component pai já injetou o usuário (initialUser), não
    // precisa refazer a chamada no mount — carregamento instantâneo.
    if (initialUser === null) refresh();
  }, [initialUser, refresh]);

  const login = useCallback(async ({ email, password }) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data?.error || "Erro ao fazer login" };
      }
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message || "Erro de conexão" };
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    router.push("/login");
  }, [router]);

  const hasRole = useCallback(
    (role) => {
      if (!user) return false;
      switch (role.toLowerCase()) {
        case "administrador":
        case "admin":
          return !!user.is_administrador;
        case "correspondente":
          return !!user.is_correspondente;
        case "corretor":
          return !!user.is_corretor;
        default:
          return false;
      }
    },
    [user]
  );

  const isSuperAdmin = !!user?.is_super_admin;

  const value = { user, loading, isAuthenticated: !!user, login, logout, refresh, hasRole, isSuperAdmin };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
