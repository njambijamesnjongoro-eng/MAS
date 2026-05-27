"use client";

import { useId } from "react";

type Accent = "blue" | "green" | "orange" | "purple" | "teal" | "red";

type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
  accent: Accent;
  trendLabel: string;
};

type LineChartProps = {
  title: string;
  subtitle: string;
  values: number[];
  accent: Accent;
};

type DonutChartProps = {
  title: string;
  subtitle: string;
  segments: Array<{ label: string; value: number; color: string }>;
};

type BarChartProps = {
  title: string;
  subtitle: string;
  bars: Array<{ label: string; value: number; color: string }>;
};

const accentMap: Record<Accent, { gradient: string; glow: string; dot: string }> = {
  blue: {
    gradient: "var(--gradient-secondary)",
    glow: "0 0 20px rgba(37, 99, 235, 0.28)",
    dot: "var(--chart-patients)",
  },
  green: {
    gradient: "var(--gradient-success)",
    glow: "0 0 20px rgba(34, 197, 94, 0.24)",
    dot: "var(--chart-revenue)",
  },
  orange: {
    gradient: "var(--gradient-warning)",
    glow: "0 0 20px rgba(249, 115, 22, 0.28)",
    dot: "var(--chart-pending)",
  },
  purple: {
    gradient: "var(--gradient-purple)",
    glow: "0 0 20px rgba(139, 92, 246, 0.28)",
    dot: "var(--chart-analytics)",
  },
  teal: {
    gradient: "var(--gradient-primary)",
    glow: "0 0 20px rgba(20, 184, 166, 0.28)",
    dot: "var(--chart-activity)",
  },
  red: {
    gradient: "var(--gradient-danger)",
    glow: "0 0 20px rgba(239, 68, 68, 0.26)",
    dot: "var(--chart-emergency)",
  },
};

function normalizeSeries(values: number[]) {
  const safeValues = values.length ? values : [0];
  const max = Math.max(...safeValues, 1);
  return safeValues.map((value) => value / max);
}

function buildLinePath(values: number[]) {
  const normalized = normalizeSeries(values);
  return normalized
    .map((value, index) => {
      const x = (index / Math.max(normalized.length - 1, 1)) * 100;
      const y = 100 - value * 76 - 12;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function buildAreaPath(values: number[]) {
  const linePath = buildLinePath(values);
  return `${linePath} L 100 100 L 0 100 Z`;
}

export function AnalyticsMetricCard({ label, value, helper, accent, trendLabel }: MetricCardProps) {
  const accentStyles = accentMap[accent];

  return (
    <article className="medical-analytics-card min-w-0 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-medical-muted">{label}</div>
          <div className="mt-3 text-3xl font-semibold text-medical-primary">{value}</div>
        </div>
        <span
          aria-hidden="true"
          className="mt-1 h-11 w-11 rounded-2xl"
          style={{ background: accentStyles.gradient, boxShadow: accentStyles.glow }}
        />
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-medical-secondary">{helper}</div>
        <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-medical-muted">
          {trendLabel}
        </div>
      </div>
    </article>
  );
}

export function AnalyticsLineChart({ title, subtitle, values, accent }: LineChartProps) {
  const gradientId = useId();
  const strokeId = useId();
  const accentStyles = accentMap[accent];
  const safeValues = values.length ? values : [0, 0, 0, 0, 0];
  const linePath = buildLinePath(safeValues);
  const areaPath = buildAreaPath(safeValues);

  return (
    <article className="medical-analytics-card medical-grid-pattern min-w-0 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-medical-primary">{title}</h3>
          <p className="mt-2 text-sm text-medical-secondary">{subtitle}</p>
        </div>
        <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-medical-muted">
          Live
        </div>
      </div>

      <div className="mt-6 h-40 sm:h-44 lg:h-52">
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentStyles.dot} stopOpacity="0.45" />
              <stop offset="100%" stopColor={accentStyles.dot} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={strokeId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={accentStyles.dot} />
              <stop offset="100%" stopColor="var(--primary)" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={`url(#${strokeId})`} strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    </article>
  );
}

export function AnalyticsDonutChart({ title, subtitle, segments }: DonutChartProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(
    segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0),
    1,
  );
  const chartSegments = segments.map((segment, index) => {
    const previousValue = segments
      .slice(0, index)
      .reduce((sum, currentSegment) => sum + Math.max(currentSegment.value, 0), 0);
    return {
      ...segment,
      length: (Math.max(segment.value, 0) / total) * circumference,
      offset: (previousValue / total) * circumference,
    };
  });

  return (
    <article className="medical-analytics-card min-w-0 p-5">
      <h3 className="text-lg font-semibold text-medical-primary">{title}</h3>
      <p className="mt-2 text-sm text-medical-secondary">{subtitle}</p>

      <div className="mt-6 grid min-w-0 items-center gap-6 md:grid-cols-[0.95fr_1.05fr]">
        <div className="mx-auto h-36 w-36 sm:h-40 sm:w-40 lg:h-44 lg:w-44">
          <svg viewBox="0 0 120 120" className="h-full w-full">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(148, 163, 184, 0.16)" strokeWidth="14" />
            {chartSegments.map((segment) => {
              const strokeDasharray = `${segment.length} ${circumference - segment.length}`;
              return (
                <circle
                  key={segment.label}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="14"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={-segment.offset}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                />
              );
            })}
            <text x="60" y="56" textAnchor="middle" className="fill-current text-[12px]" style={{ color: "var(--text-muted)" }}>
              Total
            </text>
            <text x="60" y="74" textAnchor="middle" className="fill-current text-[20px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {total}
            </text>
          </svg>
        </div>

        <div className="min-w-0 space-y-3">
          {segments.map((segment) => (
            <div key={segment.label} className="medical-subtle-panel rounded-[1.2rem] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="text-sm font-medium text-medical-primary">{segment.label}</span>
                </div>
                <span className="text-sm font-semibold text-medical-secondary">{segment.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function AnalyticsBarChart({ title, subtitle, bars }: BarChartProps) {
  const max = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <article className="medical-analytics-card min-w-0 p-5">
      <h3 className="text-lg font-semibold text-medical-primary">{title}</h3>
      <p className="mt-2 text-sm text-medical-secondary">{subtitle}</p>

      <div className="mt-6 space-y-4">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-medical-primary">{bar.label}</span>
              <span className="text-medical-secondary">{bar.value}</span>
            </div>
            <div className="h-3 rounded-full bg-[var(--panel-muted)]">
              <div
                className="h-3 rounded-full"
                style={{
                  width: `${Math.max((bar.value / max) * 100, bar.value > 0 ? 12 : 0)}%`,
                  background: bar.color,
                  boxShadow: "0 0 16px rgba(37, 99, 235, 0.18)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
