"use client";

import { useTheme } from "@/components/theme/theme-provider";

function ThemeIcon({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
        active ? "bg-white/14 text-white shadow-[0_0_20px_rgba(20,184,166,0.28)]" : "text-[var(--text-secondary)]"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
        <path d="M12 3v3" />
        <path d="M12 18v3" />
        <path d="M4.93 4.93l2.12 2.12" />
        <path d="M16.95 16.95l2.12 2.12" />
        <path d="M3 12h3" />
        <path d="M18 12h3" />
        <path d="M4.93 19.07l2.12-2.12" />
        <path d="M16.95 7.05l2.12-2.12" />
        <circle cx="12" cy="12" r="4.25" />
      </svg>
    </span>
  );
}

function LowDataIcon({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
        active ? "bg-white/14 text-white shadow-[0_0_20px_rgba(20,184,166,0.28)]" : "text-[var(--text-secondary)]"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
        <path d="M5 16.5a7 7 0 0 1 14 0" strokeLinecap="round" />
        <path d="M8.4 14a4.5 4.5 0 0 1 7.2 0" strokeLinecap="round" />
        <path d="M11.1 11.7a2 2 0 0 1 1.8 0" strokeLinecap="round" />
        <path d="M12 18h.01" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function ThemeToggle() {
  const { lowDataMode, setLowDataMode, theme, setTheme } = useTheme();

  return (
    <div className="medical-theme-switcher">
      <button
        type="button"
        onClick={() => setTheme("original")}
        aria-pressed={theme === "original"}
        className={theme === "original" ? "is-active" : undefined}
      >
        <ThemeIcon active={theme === "original"} />
        <span>
          <span className="block text-left text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Theme
          </span>
          <span className="block text-sm font-semibold text-[var(--text-primary)]">White</span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => setTheme("dark-medical")}
        aria-pressed={theme === "dark-medical"}
        className={theme === "dark-medical" ? "is-active" : undefined}
      >
        <ThemeIcon active={theme === "dark-medical"} />
        <span>
          <span className="block text-left text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Theme
          </span>
          <span className="block text-sm font-semibold text-[var(--text-primary)]">Black</span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => setLowDataMode(!lowDataMode)}
        aria-pressed={lowDataMode}
        className={`medical-low-data-toggle ${lowDataMode ? "is-active" : ""}`}
      >
        <LowDataIcon active={lowDataMode} />
        <span className="min-w-0">
          <span className="block text-left text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Slow network
          </span>
          <span className="block text-sm font-semibold text-[var(--text-primary)]">
            {lowDataMode ? "Low data on" : "Low data off"}
          </span>
        </span>
      </button>
    </div>
  );
}
