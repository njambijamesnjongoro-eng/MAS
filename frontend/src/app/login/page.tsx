import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[var(--surface-pattern)]" />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 grid w-full max-w-7xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="medical-card medical-hero hidden overflow-hidden rounded-[2rem] p-10 lg:block">
          <div className="medical-badge">Healthcare enterprise access</div>
          <h2 className="mt-5 max-w-2xl text-5xl font-semibold leading-tight text-medical-primary">
            Secure hospital workflows with calm, high-clarity clinical access.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-medical-secondary">
            Built for long hospital shifts: fast sign-in, trustworthy patient access, and operational visibility
            without unnecessary friction.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Security", "JWT authentication, backend RBAC, audit trails, CSRF, and throttling."],
              ["Speed", "Fast patient search, lightweight screens, and efficient paginated APIs."],
              ["Scalability", "Clinical, admissions, billing, imaging, and reporting foundations already aligned."],
            ].map(([title, body]) => (
              <div key={title} className="medical-subtle-panel rounded-[1.5rem] p-5">
                <div className="text-lg font-semibold text-medical-primary">{title}</div>
                <div className="mt-2 text-sm leading-7 text-medical-secondary">{body}</div>
              </div>
            ))}
          </div>

          <div className="medical-grid-pattern medical-glass mt-10 rounded-[1.8rem] border border-[var(--border)] p-6">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-medical-muted">
                  Workflow illustration
                </div>
                <div className="mt-4 rounded-[1.8rem] bg-[var(--gradient-secondary)] p-6 text-white shadow-[0_0_22px_rgba(37,99,235,0.24)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
                      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm uppercase tracking-[0.16em] text-sky-100">Hospital command layer</div>
                      <div className="mt-1 text-2xl font-semibold">EHR access node</div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {[
                      "Patient identity and profile access",
                      "Clinical encounters and diagnostics",
                      "Admissions, billing, and imaging operations",
                    ].map((item) => (
                      <div key={item} className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  ["Front desk", "Search and register patients quickly."],
                  ["Clinicians", "Open records, document care, and move decisively."],
                  ["Operations", "Monitor admissions, billing, and hospital activity."],
                ].map(([title, copy]) => (
                  <div key={title} className="medical-subtle-panel rounded-[1.4rem] p-4">
                    <div className="text-sm font-semibold text-medical-primary">{title}</div>
                    <div className="mt-2 text-sm leading-7 text-medical-secondary">{copy}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
