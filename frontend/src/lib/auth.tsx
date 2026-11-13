import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setToken } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    // With login switched off on the server, /api/auth/me answers without a token (default user).
    try {
      setUser(await api.get<User>("/api/auth/me"));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setReady(true));
    const onUnauthorized = () => setUser(null);
    window.addEventListener("sentinel:unauthorized", onUnauthorized);
    return () => window.removeEventListener("sentinel:unauthorized", onUnauthorized);
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: User }>("/api/auth/login", { email, password });
    setToken(res.access_token);
    setUser(res.user);
  };

  const logout = async () => {
    try { await api.post("/api/auth/logout"); } catch { /* token may already be invalid */ }
    setToken(null);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, ready, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}
