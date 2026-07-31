"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { setCachedAuthUser } from "@/lib/auth-user-cache";
import type { AuthUser } from "@/types";

type LoginResponse = {
  message: string;
  access: string;
  refresh: string;
  user?: AuthUser;
};

type WarmupResponse = {
  ok?: boolean;
  duration_ms?: number;
};

type ServerStatus = "checking" | "ready" | "slow" | "offline";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slowLogin, setSlowLogin] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  const [warmupMs, setWarmupMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let slowTimer: number | null = null;

    async function warmBackend() {
      const startedAt = Date.now();
      slowTimer = window.setTimeout(() => {
        if (active) {
          setServerStatus("slow");
        }
      }, 4500);

      try {
        const response = await fetch("/api/system/warmup", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as WarmupResponse;
        if (!active) {
          return;
        }
        setWarmupMs(payload.duration_ms ?? Date.now() - startedAt);
        setServerStatus(response.ok ? "ready" : "offline");
      } catch {
        if (active) {
          setServerStatus("offline");
        }
      } finally {
        if (slowTimer) {
          window.clearTimeout(slowTimer);
        }
      }
    }

    router.prefetch("/dashboard");
    void warmBackend();

    return () => {
      active = false;
      if (slowTimer) {
        window.clearTimeout(slowTimer);
      }
    };
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSlowLogin(false);
    setError(null);

    const slowLoginTimer = window.setTimeout(() => {
      setSlowLogin(true);
    }, 6000);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<LoginResponse>;
      if (!response.ok) {
        const message =
          typeof payload === "object" && payload !== null && "non_field_errors" in payload
            ? String((payload as { non_field_errors: string[] }).non_field_errors[0])
            : typeof payload === "object" && payload !== null && "detail" in payload
              ? String((payload as { detail: string }).detail)
              : "Login failed.";
        throw new Error(message);
      }

      if (payload.user) {
        setCachedAuthUser(payload.user);
      }

      router.replace("/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Login failed. If the hospital server is waking up, wait one minute and try again.",
      );
    } finally {
      window.clearTimeout(slowLoginTimer);
      setLoading(false);
      setSlowLogin(false);
    }
  }

  const serverStatusView = {
    checking: {
      label: "Checking hospital server",
      helper: "Preparing the secure backend before you sign in.",
      className: "border border-[var(--border)] bg-[var(--panel-muted)] text-medical-secondary",
    },
    slow: {
      label: "Server is waking up",
      helper: "Free Render hosting can sleep. First login may take 30-60 seconds, then it becomes fast.",
      className: "border border-[var(--border)] bg-[var(--panel-muted)] text-medical-secondary",
    },
    ready: {
      label: "Server ready",
      helper: warmupMs ? `Backend responded in ${(warmupMs / 1000).toFixed(1)}s.` : "You can sign in now.",
      className: "border border-[var(--border)] bg-[var(--panel-muted)] text-medical-secondary",
    },
    offline: {
      label: "Server not reachable",
      helper: "Check Render backend status, then try again. Your username and password may still be correct.",
      className: "border border-red-200 bg-red-50 text-red-700",
    },
  }[serverStatus];

  return (
    <form onSubmit={handleSubmit} className="medical-card medical-hero w-full rounded-[2rem] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
      <div>
        <div className="medical-badge">Secure clinician access</div>
        <h1 className="mt-4 text-3xl font-semibold text-medical-primary">Hospital EHR Login</h1>
        <p className="mt-2 text-sm leading-7 text-medical-secondary">
          Sign in to continue to protected patient records and role-scoped workflows.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        <div>
          <label htmlFor="username" className="medical-label">
            Username
          </label>
          <input
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="medical-input"
            placeholder="Enter your username"
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="medical-label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="medical-input pr-24"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-semibold text-medical-secondary transition hover:bg-[var(--panel-contrast)] hover:text-medical-primary focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className={`mt-5 rounded-[1.4rem] px-4 py-3 text-sm ${serverStatusView.className}`}>
        <div className="font-semibold text-medical-primary">{serverStatusView.label}</div>
        <div className="mt-1 leading-6">{serverStatusView.helper}</div>
      </div>

      {slowLogin && (
        <div className="medical-subtle-panel mt-5 rounded-[1.4rem] px-4 py-3 text-sm leading-6 text-medical-secondary">
          Still connecting to the hospital server. Please do not press login again; the secure backend may be waking up.
        </div>
      )}

      <button type="submit" disabled={loading} className="medical-button medical-button-primary mt-8 w-full">
        {loading ? (slowLogin ? "Still connecting..." : "Signing in...") : "Login"}
      </button>

      <div className="mt-5 rounded-[1.4rem] border border-[var(--border)] bg-[var(--panel-contrast)] px-4 py-4 text-sm text-medical-secondary">
        Use your hospital username, not your email address. Permissions and patient visibility are enforced
        server-side after sign-in.
      </div>
    </form>
  );
}
