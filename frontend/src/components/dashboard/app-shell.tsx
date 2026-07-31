"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { clearCachedAuthUser, getCachedAuthUser, setCachedAuthUser } from "@/lib/auth-user-cache";
import { apiRequest } from "@/lib/client-api";
import { formatRoleLabel } from "@/lib/format";
import type { AuthUser, RoleCode } from "@/types";

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function NavigationIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const navigationIcons: Record<string, React.ReactNode> = {
  dashboard: <NavigationIcon path="M4 12.5 12 4l8 8.5M6.5 10.5v8h11v-8" />,
  patients: <NavigationIcon path="M7 18v-1.5A3.5 3.5 0 0 1 10.5 13h3A3.5 3.5 0 0 1 17 16.5V18M9.5 8.5A2.5 2.5 0 1 0 14.5 8.5A2.5 2.5 0 1 0 9.5 8.5" />,
  admissions: <NavigationIcon path="M5 19V7.5A1.5 1.5 0 0 1 6.5 6h11A1.5 1.5 0 0 1 19 7.5V19M9 6V4.5M15 6V4.5M8.5 12h7M12 8.5v7" />,
  appointments: <NavigationIcon path="M7 5.5h10A1.5 1.5 0 0 1 18.5 7v10A1.5 1.5 0 0 1 17 18.5H7A1.5 1.5 0 0 1 5.5 17V7A1.5 1.5 0 0 1 7 5.5zM8.5 4v3M15.5 4v3M8 10h8M8.5 14h2.5" />,
  billing: <NavigationIcon path="M7 6.5h10v11H7zM9.5 10.5h5M9.5 13.5h5M12 6.5v-2" />,
  imaging: <NavigationIcon path="M5 7.5A1.5 1.5 0 0 1 6.5 6h11A1.5 1.5 0 0 1 19 7.5v9A1.5 1.5 0 0 1 17.5 18h-11A1.5 1.5 0 0 1 5 16.5zM8.5 14l2.5-2.5 2 2 2.5-3 1.5 2" />,
  reports: <NavigationIcon path="M7 18V6h10v12M9.5 14h5M9.5 10.5h5M9.5 7.5h3" />,
  notifications: <NavigationIcon path="M12 4.5A4 4 0 0 1 16 8.5v2.7c0 .7.2 1.3.6 1.9l1 1.4H6.4l1-1.4c.4-.6.6-1.2.6-1.9V8.5A4 4 0 0 1 12 4.5zM10.5 18a1.5 1.5 0 0 0 3 0" />,
};

const roleNavMap: Record<RoleCode, NavigationItem[]> = {
  super_admin: [
    { href: "/dashboard", label: "Today / Patient Flow", icon: navigationIcons.dashboard },
    { href: "/patients", label: "Find Patient", icon: navigationIcons.patients },
    { href: "/patients/register", label: "New Patient", icon: navigationIcons.patients },
    { href: "/appointments", label: "Appointments", icon: navigationIcons.appointments },
    { href: "/admissions", label: "Wards & Beds", icon: navigationIcons.admissions },
    { href: "/billing", label: "Bills & Payments", icon: navigationIcons.billing },
    { href: "/imaging", label: "X-Ray / Imaging", icon: navigationIcons.imaging },
    { href: "/reports", label: "Reports", icon: navigationIcons.reports },
    { href: "/notifications", label: "Messages", icon: navigationIcons.notifications },
  ],
  hospital_admin: [
    { href: "/dashboard", label: "Today / Patient Flow", icon: navigationIcons.dashboard },
    { href: "/patients", label: "Find Patient", icon: navigationIcons.patients },
    { href: "/patients/register", label: "New Patient", icon: navigationIcons.patients },
    { href: "/appointments", label: "Appointments", icon: navigationIcons.appointments },
    { href: "/admissions", label: "Wards & Beds", icon: navigationIcons.admissions },
    { href: "/billing", label: "Bills & Payments", icon: navigationIcons.billing },
    { href: "/imaging", label: "X-Ray / Imaging", icon: navigationIcons.imaging },
    { href: "/reports", label: "Reports", icon: navigationIcons.reports },
    { href: "/notifications", label: "Messages", icon: navigationIcons.notifications },
  ],
  doctor: [
    { href: "/dashboard", label: "Today / Patient Flow", icon: navigationIcons.dashboard },
    { href: "/patients", label: "Find Patient", icon: navigationIcons.patients },
    { href: "/appointments", label: "Appointments", icon: navigationIcons.appointments },
    { href: "/admissions", label: "Inpatients / Beds", icon: navigationIcons.admissions },
    { href: "/imaging", label: "X-Ray / Imaging", icon: navigationIcons.imaging },
    { href: "/notifications", label: "Messages", icon: navigationIcons.notifications },
  ],
  nurse: [
    { href: "/dashboard", label: "Today / Patient Flow", icon: navigationIcons.dashboard },
    { href: "/patients", label: "Find Patient", icon: navigationIcons.patients },
    { href: "/patients/register", label: "New Patient", icon: navigationIcons.patients },
    { href: "/appointments", label: "Appointments", icon: navigationIcons.appointments },
    { href: "/admissions", label: "Wards & Beds", icon: navigationIcons.admissions },
    { href: "/notifications", label: "Messages", icon: navigationIcons.notifications },
  ],
  lab_technician: [
    { href: "/dashboard", label: "Today / Lab Queue", icon: navigationIcons.dashboard },
    { href: "/patients", label: "Find Patient", icon: navigationIcons.patients },
    { href: "/imaging", label: "X-Ray / Imaging", icon: navigationIcons.imaging },
    { href: "/notifications", label: "Messages", icon: navigationIcons.notifications },
  ],
  pharmacist: [
    { href: "/dashboard", label: "Today / Pharmacy Queue", icon: navigationIcons.dashboard },
    { href: "/patients", label: "Find Patient", icon: navigationIcons.patients },
    { href: "/billing", label: "Bills & Payments", icon: navigationIcons.billing },
    { href: "/notifications", label: "Messages", icon: navigationIcons.notifications },
  ],
  receptionist: [
    { href: "/dashboard", label: "Today / Front Desk", icon: navigationIcons.dashboard },
    { href: "/patients", label: "Find Patient", icon: navigationIcons.patients },
    { href: "/patients/register", label: "New Patient", icon: navigationIcons.patients },
    { href: "/appointments", label: "Appointments", icon: navigationIcons.appointments },
    { href: "/admissions", label: "Wards & Beds", icon: navigationIcons.admissions },
    { href: "/billing", label: "Bills & Payments", icon: navigationIcons.billing },
    { href: "/notifications", label: "Messages", icon: navigationIcons.notifications },
  ],
  patient: [
    { href: "/dashboard", label: "My Home", icon: navigationIcons.dashboard },
    { href: "/patients", label: "My Record", icon: navigationIcons.patients },
    { href: "/notifications", label: "Messages", icon: navigationIcons.notifications },
  ],
};

type AppShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AppShell({ title, description, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(() => getCachedAuthUser());
  const [error, setError] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [isLoggingOut, startLogoutTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const { data } = await apiRequest<AuthUser>("/api/auth/me");
        if (!cancelled) {
          setCachedAuthUser(data);
          setUser(data);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          clearCachedAuthUser();
          setError("Your session could not be confirmed.");
          router.replace("/login");
        }
      }
    }
    void loadUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const navigation = useMemo(() => {
    return user
      ? roleNavMap[user.effective_role]
      : [{ href: "/dashboard", label: "Dashboard", icon: navigationIcons.dashboard }];
  }, [user]);

  function handleLogout() {
    startLogoutTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      clearCachedAuthUser();
      router.replace("/login");
    });
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="mx-auto flex min-h-screen max-w-[1680px] gap-3 overflow-x-hidden px-4 py-4 lg:px-6">
        {navOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm lg:hidden"
          />
        )}

        <aside
          className={`medical-sidebar fixed inset-y-4 left-4 z-40 flex w-[20rem] flex-col rounded-[2rem] p-5 transition duration-200 lg:sticky lg:top-4 lg:z-10 lg:h-[calc(100vh-2rem)] lg:translate-x-0 ${
            navOpen ? "translate-x-0" : "-translate-x-[120%]"
          }`}
        >
          <div className="medical-brand-panel rounded-[1.6rem] border border-white/10 p-5">
            <div className="medical-brand-muted text-xs uppercase tracking-[0.24em]">Hospital EHR</div>
            <h1 className="mt-2 text-2xl font-semibold">Hospital Workflow</h1>
            <p className="medical-brand-muted mt-2 text-sm">
              Follow each patient from arrival, triage, doctor visit, orders, billing, and follow-up.
            </p>
          </div>

          <div className="mt-6 flex-1 overflow-y-auto">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-medical-muted">Where to go</div>
            <nav className="mt-3 space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setNavOpen(false)}
                    className={`flex items-center gap-3 rounded-[1.3rem] px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-[var(--accent-soft)] text-[var(--text-primary)] shadow-[0_0_20px_rgba(37,99,235,0.18)]"
                        : "text-medical-secondary hover:bg-[var(--panel-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <span className={`${isActive ? "text-[var(--accent)]" : "text-medical-muted"}`}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="medical-subtle-panel mt-8 rounded-[1.5rem] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-medical-muted">Signed In</div>
            <div className="mt-2 text-base font-semibold text-medical-primary">
              {user ? `${user.first_name || user.username} ${user.last_name}`.trim() : "Loading user"}
            </div>
            <div className="mt-1 text-sm text-medical-secondary">
              {user ? formatRoleLabel(user.effective_role) : "Please wait"}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="medical-button medical-button-ghost mt-4 w-full"
            >
              {isLoggingOut ? "Signing out..." : "Logout"}
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-6 overflow-x-hidden">
          <section className="medical-card medical-hero overflow-hidden rounded-[2rem] px-5 py-5 lg:px-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <button
                  type="button"
                  onClick={() => setNavOpen(true)}
                  className="medical-button medical-button-ghost w-full sm:w-auto lg:hidden"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                    <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                  </svg>
                  Menu
                </button>
                <div className="hidden lg:block" />
                <div className="w-full sm:w-auto sm:self-start">
                  <ThemeToggle />
                </div>
              </div>

              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="medical-badge">Single-hospital secure workspace</div>
                  <h2 className="mt-3 text-3xl font-semibold text-medical-primary">{title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-medical-secondary">{description}</p>
                </div>

                {user && (
                  <div className="medical-glass min-w-0 rounded-[1.5rem] border border-[var(--border)] px-4 py-4 text-sm text-medical-secondary">
                    <div className="break-all font-semibold text-medical-primary">{user.email}</div>
                    <div className="mt-1">Backend access is enforced for {formatRoleLabel(user.effective_role)}.</div>
                  </div>
                )}
              </div>
            </div>

            {error && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          </section>

          {children}
        </main>
      </div>
    </div>
  );
}
