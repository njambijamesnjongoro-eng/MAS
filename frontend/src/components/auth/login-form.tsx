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

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

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
      setError(submitError instanceof Error ? submitError.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

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
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="medical-input"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </div>
      </div>

      {error && <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <button type="submit" disabled={loading} className="medical-button medical-button-primary mt-8 w-full">
        {loading ? "Signing in..." : "Login"}
      </button>

      <div className="mt-5 rounded-[1.4rem] border border-[var(--border)] bg-[var(--panel-contrast)] px-4 py-4 text-sm text-medical-secondary">
        Use your hospital username, not your email address. Permissions and patient visibility are enforced
        server-side after sign-in.
      </div>
    </form>
  );
}
