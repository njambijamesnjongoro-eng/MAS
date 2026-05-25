"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ToastNotice } from "@/components/clinical/toast-notice";
import {
  AnalyticsBarChart,
  AnalyticsDonutChart,
  AnalyticsMetricCard,
} from "@/components/dashboard/analytics-widgets";
import { apiRequest } from "@/lib/client-api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";
import type { AppointmentReminderDashboardSummary } from "@/types";

export function ReminderDashboardWorkspace() {
  const [summary, setSummary] = useState<AppointmentReminderDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  async function loadSummary() {
    const { data } = await apiRequest<AppointmentReminderDashboardSummary>("/api/appointments/dashboard/summary");
    return data;
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      try {
        const data = await loadSummary();
        if (!cancelled) {
          setSummary(data);
        }
      } catch (error) {
        if (!cancelled) {
          setToast({ message: error instanceof Error ? error.message : "Unable to load reminder dashboard.", tone: "error" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const barSeries = useMemo(
    () => [
      { label: "Tomorrow's Appointments", value: summary?.appointments_tomorrow_count ?? 0, color: "var(--gradient-secondary)" },
      { label: "Sent Today", value: summary?.reminders_sent_today_count ?? 0, color: "var(--gradient-success)" },
      { label: "Failed", value: summary?.reminders_failed_count ?? 0, color: "var(--gradient-danger)" },
      { label: "Retry Queue", value: summary?.reminders_retrying_count ?? 0, color: "var(--gradient-warning)" },
    ],
    [summary],
  );

  const donutSegments = useMemo(
    () => [
      { label: "SMS Sent", value: summary?.sms_sent_count ?? 0, color: "var(--chart-activity)" },
      { label: "Email Sent", value: summary?.email_sent_count ?? 0, color: "var(--chart-patients)" },
      { label: "Failures", value: summary?.reminders_failed_count ?? 0, color: "var(--chart-emergency)" },
      { label: "Retries", value: summary?.reminders_retrying_count ?? 0, color: "var(--chart-pending)" },
    ],
    [summary],
  );

  async function triggerDailyRun() {
    setTriggering(true);
    try {
      const response = await fetch("/api/appointments/dashboard/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload === "object" && payload !== null && "detail" in payload ? String((payload as { detail: string }).detail) : "Unable to trigger reminder run.");
      }
      setToast({ message: "Reminder scheduler queued successfully.", tone: "success" });
      setSummary(await loadSummary());
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Unable to trigger reminder run.", tone: "error" });
    } finally {
      setTriggering(false);
    }
  }

  if (loading) {
    return <div className="medical-card rounded-[2rem] p-6 text-sm text-medical-secondary">Loading reminder dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {toast && <ToastNotice message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          label="Tomorrow"
          value={String(summary?.appointments_tomorrow_count ?? 0)}
          helper="Appointments due for next-day reminder processing."
          accent="blue"
          trendLabel="Schedule"
        />
        <AnalyticsMetricCard
          label="Sent Today"
          value={String(summary?.reminders_sent_today_count ?? 0)}
          helper="Reminder deliveries completed successfully today."
          accent="green"
          trendLabel="Delivery"
        />
        <AnalyticsMetricCard
          label="Failed"
          value={String(summary?.reminders_failed_count ?? 0)}
          helper="Reminder attempts that need review or retry."
          accent="red"
          trendLabel="Attention"
        />
        <AnalyticsMetricCard
          label="Retry Queue"
          value={String(summary?.reminders_retrying_count ?? 0)}
          helper="Reminder retries waiting for the next retry window."
          accent="orange"
          trendLabel="Recovery"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <AnalyticsBarChart
          title="Reminder operations"
          subtitle="Track tomorrow's queue, successful sends, failures, and retries in one operational view."
          bars={barSeries}
        />
        <AnalyticsDonutChart
          title="Channel outcomes"
          subtitle="Compare SMS and email output against delivery failures and retry pressure."
          segments={donutSegments}
        />
      </section>

      <section className="medical-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-medical-primary">Scheduler controls</h3>
            <p className="mt-2 text-sm text-medical-secondary">
              Trigger the next-day reminder scheduler manually when staff need to re-run the daily batch.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={triggerDailyRun} disabled={triggering} className="medical-button medical-button-primary">
              {triggering ? "Queueing..." : "Run reminder scheduler"}
            </button>
            <Link href="/reminders/history" className="medical-button medical-button-secondary">
              Open reminder history
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <article className="medical-card rounded-[2rem] p-6">
          <h3 className="text-xl font-semibold text-medical-primary">Upcoming appointments</h3>
          <div className="mt-5 space-y-3">
            {summary?.upcoming_appointments.length ? (
              summary.upcoming_appointments.map((appointment) => (
                <div key={appointment.id} className="medical-subtle-panel rounded-[1.4rem] px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-medical-primary">{appointment.patient_name}</div>
                    <div className="medical-badge">{formatStatusLabel(appointment.status)}</div>
                  </div>
                  <div className="mt-2 text-sm text-medical-secondary">
                    {appointment.doctor_name} • {formatDateTime(appointment.appointment_datetime)}
                  </div>
                </div>
              ))
            ) : (
              <div className="medical-empty-state rounded-2xl px-4 py-5 text-sm">No upcoming appointments in the current window.</div>
            )}
          </div>
        </article>

        <article className="medical-card rounded-[2rem] p-6">
          <h3 className="text-xl font-semibold text-medical-primary">Recent failures</h3>
          <div className="mt-5 space-y-3">
            {summary?.failed_logs.length ? (
              summary.failed_logs.map((log) => (
                <div key={log.id} className="rounded-[1.4rem] border border-red-200 bg-red-50 px-4 py-4">
                  <div className="font-semibold text-medical-primary">{log.patient_name}</div>
                  <div className="mt-2 text-sm text-medical-secondary">
                    {formatStatusLabel(log.channel)} • {log.error_message || "Delivery failure"}
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.16em] text-medical-muted">
                    {log.recipient} • {formatDateTime(log.created_at)}
                  </div>
                </div>
              ))
            ) : (
              <div className="medical-empty-state rounded-2xl px-4 py-5 text-sm">No reminder failures right now.</div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
