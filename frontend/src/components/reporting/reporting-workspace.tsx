"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AnalyticsBarChart,
  AnalyticsDonutChart,
  AnalyticsMetricCard,
} from "@/components/dashboard/analytics-widgets";
import { apiRequest } from "@/lib/client-api";
import { formatCurrency } from "@/lib/format";
import type { ReportingSummary } from "@/types";

const reportTypes = [
  { id: "admissions", label: "Admissions" },
  { id: "revenue", label: "Revenue" },
  { id: "patient_statistics", label: "Patient Statistics" },
  { id: "diagnoses", label: "Diagnoses" },
  { id: "lab_activity", label: "Lab Activity" },
  { id: "pharmacy_usage", label: "Pharmacy Usage" },
];

export function ReportingWorkspace() {
  const [summary, setSummary] = useState<ReportingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        const { data } = await apiRequest<ReportingSummary>("/api/reports/summary");
        if (!cancelled) {
          setSummary(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load report summary.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const barSeries = useMemo(
    () => [
      { label: "Admissions", value: summary?.admissions ?? 0, color: "var(--gradient-secondary)" },
      { label: "Diagnoses", value: summary?.diagnoses ?? 0, color: "var(--gradient-purple)" },
      { label: "Lab Activity", value: summary?.lab_requests ?? 0, color: "var(--gradient-primary)" },
      { label: "Pharmacy", value: summary?.pharmacy_usage ?? 0, color: "var(--gradient-success)" },
    ],
    [summary],
  );

  const donutSegments = useMemo(
    () => [
      { label: "Active Admissions", value: summary?.active_admissions ?? 0, color: "var(--chart-patients)" },
      { label: "Pending Invoices", value: summary?.pending_invoices ?? 0, color: "var(--chart-pending)" },
      { label: "Lab Requests", value: summary?.lab_requests ?? 0, color: "var(--chart-activity)" },
      { label: "Diagnoses", value: summary?.diagnoses ?? 0, color: "var(--chart-analytics)" },
    ],
    [summary],
  );

  if (loading) {
    return <div className="medical-card rounded-[2rem] p-6 text-sm text-medical-secondary">Loading reports...</div>;
  }

  if (error) {
    return <div className="rounded-[2rem] bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          label="Admissions"
          value={String(summary?.active_admissions ?? 0)}
          helper={`Total admission records: ${summary?.admissions ?? 0}`}
          accent="blue"
          trendLabel="Capacity"
        />
        <AnalyticsMetricCard
          label="Pending Invoices"
          value={String(summary?.pending_invoices ?? 0)}
          helper="Outstanding invoices still awaiting settlement."
          accent="orange"
          trendLabel="Finance"
        />
        <AnalyticsMetricCard
          label="Diagnoses"
          value={String(summary?.diagnoses ?? 0)}
          helper="Clinical diagnosis records in the reporting scope."
          accent="purple"
          trendLabel="Clinical"
        />
        <AnalyticsMetricCard
          label="Revenue"
          value={formatCurrency(summary?.total_revenue ?? "0")}
          helper="Total recorded payments across all invoices."
          accent="green"
          trendLabel="Collections"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <AnalyticsBarChart
          title="Hospital activity mix"
          subtitle="Track where the hospital is generating the most operational data and staff activity."
          bars={barSeries}
        />
        <AnalyticsDonutChart
          title="Reporting ratios"
          subtitle="A quick visual split of active admissions, finance backlog, lab load, and diagnosis volume."
          segments={donutSegments}
        />
      </section>

      <section className="medical-card rounded-[2rem] p-6">
        <h3 className="text-xl font-semibold text-medical-primary">Export-ready hospital reports</h3>
        <p className="mt-2 text-sm text-medical-secondary">
          Download CSV or PDF summaries for operations, finance, diagnoses, and activity monitoring.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {reportTypes.map((report) => (
            <article key={report.id} className="medical-subtle-panel rounded-[1.5rem] p-5">
              <div className="text-lg font-semibold text-medical-primary">{report.label}</div>
              <div className="mt-2 text-sm leading-7 text-medical-secondary">
                Export a structured snapshot for audit review, finance reconciliation, or operational planning.
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={`/api/reports/export?report_type=${report.id}&format=csv`}
                  className="medical-button medical-button-ghost"
                >
                  Export CSV
                </a>
                <a
                  href={`/api/reports/export?report_type=${report.id}&format=pdf`}
                  className="medical-button medical-button-primary"
                >
                  Export PDF
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
