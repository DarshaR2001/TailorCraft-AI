"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import api from "@/lib/api";
import type { AuthTokenResponse, UserProfile, UserCreate, UserLogin } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: UserLogin) => Promise<void>;
  register: (data: UserCreate) => Promise<void>;
  logout: () => void;
  openAuthModal: (initialTab?: "login" | "register") => void;
  closeAuthModal: () => void;
}

// ── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"login" | "register">("login");

  // Persist & rehydrate token
  const persistToken = useCallback((t: string | null) => {
    setToken(t);
    if (t) localStorage.setItem("tc_access_token", t);
    else localStorage.removeItem("tc_access_token");
  }, []);

  const fetchProfile = useCallback(async (t: string) => {
    try {
      const res = await api.get<UserProfile>("/auth/profile", {
        headers: { Authorization: `Bearer ${t}` },
      });
      setUser(res.data);
    } catch {
      persistToken(null);
      setUser(null);
    }
  }, [persistToken]);

  // Rehydrate on mount
  useEffect(() => {
    const stored = localStorage.getItem("tc_access_token");
    if (stored) {
      setToken(stored);
      fetchProfile(stored).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  // Listen for global 401 events
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setToken(null);
      setModalOpen(true);
      setModalTab("login");
    };
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, []);

  const login = useCallback(
    async (data: UserLogin) => {
      const res = await api.post<AuthTokenResponse>("/auth/login", data);
      const t = res.data.access_token;
      persistToken(t);
      await fetchProfile(t);
      setModalOpen(false);
    },
    [persistToken, fetchProfile]
  );

  const register = useCallback(
    async (data: UserCreate) => {
      await api.post("/auth/register", data);
      // Auto-login after registration
      await login({ email: data.email, password: data.password });
    },
    [login]
  );

  const logout = useCallback(() => {
    persistToken(null);
    setUser(null);
  }, [persistToken]);

  const openAuthModal = useCallback((tab: "login" | "register" = "login") => {
    setModalTab(tab);
    setModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setModalOpen(false), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
      {modalOpen && (
        <AuthModal
          tab={modalTab}
          onTabChange={setModalTab}
          onClose={closeAuthModal}
          onLogin={login}
          onRegister={register}
        />
      )}
    </AuthContext.Provider>
  );
}

// ── Auth Modal ─────────────────────────────────────────────────────────────
interface AuthModalProps {
  tab: "login" | "register";
  onTabChange: (t: "login" | "register") => void;
  onClose: () => void;
  onLogin: (d: UserLogin) => Promise<void>;
  onRegister: (d: UserCreate) => Promise<void>;
}

function AuthModal({ tab, onTabChange, onClose, onLogin, onRegister }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") {
        await onLogin({ email, password });
      } else {
        await onRegister({ email, password, full_name: fullName });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="auth-overlay"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="auth-modal" role="dialog" aria-modal="true">
        {/* Close */}
        <button
          onClick={onClose}
          className="auth-modal-close"
          aria-label="Close authentication modal"
        >
          ✕
        </button>

        {/* Logo */}
        <div className="auth-modal-logo">
          <span className="logo-text">TailorCraft</span>
          <span className="logo-accent"> AI</span>
        </div>
        <p className="auth-modal-subtitle">
          {tab === "login"
            ? "Sign in to generate tailored documents"
            : "Create an account — it&apos;s free"}
        </p>

        {/* Tabs */}
        <div className="auth-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "login"}
            className={tab === "login" ? "auth-tab active" : "auth-tab"}
            onClick={() => { onTabChange("login"); setError(""); }}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={tab === "register"}
            className={tab === "register" ? "auth-tab active" : "auth-tab"}
            onClick={() => { onTabChange("register"); setError(""); }}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {tab === "register" && (
            <div className="form-group">
              <label htmlFor="auth-fullname">Full Name</label>
              <input
                id="auth-fullname"
                type="text"
                required
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              required
              placeholder="••••••••"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
            id="auth-submit-btn"
          >
            {loading
              ? "Please wait…"
              : tab === "login"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
