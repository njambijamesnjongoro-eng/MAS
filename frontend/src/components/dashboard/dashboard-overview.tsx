"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  AnalyticsBarChart,
  AnalyticsDonutChart,
  AnalyticsLineChart,
  AnalyticsMetricCard,
} from "@/components/dashboard/analytics-widgets";
import { apiRequest } from "@/lib/client-api";
import { formatCurrency, formatDate, formatDateTime, formatRoleLabel, formatStatusLabel } from "@/lib/format";
import type {
  AuthUser,
  ClinicalDashboardSummary,
  NotificationSummary,
  OperationsDashboardSummary,
} from "@/types";

function InsightList({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <article className="medical-card rounded-[2rem] p-6">
      <h3 className="text-xl font-semibold text-medical-primary">{title}</h3>
      <p className="mt-2 text-sm text-medical-secondary">{subtitle}</p>
      <div className="mt-5 space-y-3">{children}</div>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="medical-empty-state rounded-2xl px-4 py-5 text-sm">{message}</div>;
}

export function DashboardOverview() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [clinical, setClinical] = useState<ClinicalDashboardSummary | null>(null);
  const [operations, setOperations] = useState<OperationsDashboardSummary | null>(null);
  const [notifications, setNotifications] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        const { data: authUser } = await apiRequest<AuthUser>("/api/auth/me");
        if (cancelled) {
          return;
        }
        setUser(authUser);

        const requests: Array<Promise<unknown>> = [apiRequest<NotificationSummary>("/api/notifications/summary")];
        const operationalRoles = ["super_admin", "hospital_admin", "receptionist"];

        if (operationalRoles.includes(authUser.effective_role)) {
          requests.unshift(apiRequest<OperationsDashboardSummary>("/api/operations/dashboard/summary"));
        } else {
          requests.unshift(apiRequest<ClinicalDashboardSummary>("/api/clinical/dashboard/summary"));
        }

        const [primaryResponse, notificationResponse] = await Promise.all(requests);
        if (cancelled) {
          return;
        }

        if (operationalRoles.includes(authUser.effective_role)) {
          setOperations((primaryResponse as { data: OperationsDashboardSummary }).data);
        } else {
          setClinical((primaryResponse as { data: ClinicalDashboardSummary }).data);
        }

        setNotifications((notificationResponse as { data: NotificationSummary }).data);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
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

  const isOperationalDashboard = Boolean(operations);

  const metricCards = useMemo(() => {
    if (isOperationalDashboard) {
      return [
        {
          label: "Active Admissions",
          value: String(operations?.active_admissions_count ?? 0),
          helper: "Current inpatient census across active beds.",
          accent: "blue" as const,
          trendLabel: "Census",
        },
        {
          label: "Occupied Beds",
          value: String(operations?.occupied_beds_count ?? 0),
          helper: `Available beds: ${operations?.available_beds_count ?? 0}`,
          accent: "orange" as const,
          trendLabel: "Bed Load",
        },
        {
          label: "Pending Invoices",
          value: String(operations?.pending_invoices_count ?? 0),
          helper: "Outstanding billing items still awaiting settlement.",
          accent: "purple" as const,
          trendLabel: "Finance",
        },
        {
          label: "Revenue Today",
          value: formatCurrency(operations?.revenue_collected_today ?? "0"),
          helper: "Collected and reconciled payments for the current day.",
          accent: "green" as const,
          trendLabel: "Collections",
        },
      ];
    }

    return [
      {
        label: "Patients In Scope",
        value: String(clinical?.patient_count ?? 0),
        helper: "Count reflects the signed-in user's clinical access.",
        accent: "blue" as const,
        trendLabel: "Patient Panel",
      },
      {
        label: "Today's Visits",
        value: String(clinical?.today_visits_count ?? 0),
        helper: "Current-day appointments and encounter queue volume.",
        accent: "teal" as const,
        trendLabel: "Queue",
      },
      {
        label: "Pending Labs",
        value: String(clinical?.pending_lab_results_count ?? 0),
        helper: "Lab work still waiting for result upload or completion.",
        accent: "orange" as const,
        trendLabel: "Results",
      },
      {
        label: "Workflow",
        value: user ? formatRoleLabel(user.effective_role) : "Clinical",
        helper: "Permissions stay backend-enforced for every action.",
        accent: "purple" as const,
        trendLabel: "RBAC",
      },
    ];
  }, [clinical, isOperationalDashboard, operations, user]);

  const activitySeries = useMemo(() => {
    if (isOperationalDashboard) {
      return [
        operations?.active_admissions_count ?? 0,
        operations?.occupied_beds_count ?? 0,
        operations?.available_beds_count ?? 0,
        operations?.pending_invoices_count ?? 0,
        Number.parseFloat(operations?.revenue_collected_today ?? "0") || 0,
      ];
    }

    return [
      clinical?.patient_count ?? 0,
      clinical?.today_visits_count ?? 0,
      clinical?.open_visits_count ?? 0,
      clinical?.pending_lab_results_count ?? 0,
      clinical?.recent_patients.length ?? 0,
    ];
  }, [clinical, isOperationalDashboard, operations]);

  const barSeries = useMemo(() => {
    if (isOperationalDashboard) {
      return [
        { label: "Admissions", value: operations?.active_admissions_count ?? 0, color: "var(--gradient-secondary)" },
        { label: "Beds", value: operations?.occupied_beds_count ?? 0, color: "var(--gradient-warning)" },
        { label: "Invoices", value: operations?.pending_invoices_count ?? 0, color: "var(--gradient-purple)" },
        {
          label: "Lab Activity",
          value: operations?.recent_lab_activity.length ?? 0,
          color: "var(--gradient-primary)",
        },
      ];
    }

    return [
      { label: "Visits", value: clinical?.today_visits_count ?? 0, color: "var(--gradient-primary)" },
      { label: "Open Visits", value: clinical?.open_visits_count ?? 0, color: "var(--gradient-secondary)" },
      { label: "Pending Labs", value: clinical?.pending_lab_results_count ?? 0, color: "var(--gradient-warning)" },
      { label: "Recent Patients", value: clinical?.recent_patients.length ?? 0, color: "var(--gradient-purple)" },
    ];
  }, [clinical, isOperationalDashboard, operations]);

  const donutSegments = useMemo(() => {
    if (isOperationalDashboard) {
      return [
        { label: "Occupied Beds", value: operations?.occupied_beds_count ?? 0, color: "var(--chart-patients)" },
        { label: "Available Beds", value: operations?.available_beds_count ?? 0, color: "var(--chart-activity)" },
        { label: "Pending Invoices", value: operations?.pending_invoices_count ?? 0, color: "var(--chart-pending)" },
      ];
    }

    return [
      { label: "Today's Visits", value: clinical?.today_visits_count ?? 0, color: "var(--chart-activity)" },
      { label: "Open Visits", value: clinical?.open_visits_count ?? 0, color: "var(--chart-patients)" },
      { label: "Pending Labs", value: clinical?.pending_lab_results_count ?? 0, color: "var(--chart-pending)" },
      { label: "Recent Patients", value: clinical?.recent_patients.length ?? 0, color: "var(--chart-analytics)" },
    ];
  }, [clinical, isOperationalDashboard, operations]);

  if (loading) {
    return <div className="medical-card rounded-[2rem] p-6 text-sm text-medical-secondary">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="rounded-[2rem] bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <AnalyticsMetricCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.95fr_0.95fr]">
        <AnalyticsLineChart
          title={isOperationalDashboard ? "Operational activity pulse" : "Clinical activity pulse"}
          subtitle={
            isOperationalDashboard
              ? "Admissions, bed occupancy, invoices, and collections aligned for fast hospital coordination."
              : "Visits, open encounters, lab backlog, and recent intake aligned for fast bedside care."
          }
          values={activitySeries}
          accent={isOperationalDashboard ? "blue" : "teal"}
        />

        <AnalyticsDonutChart
          title={isOperationalDashboard ? "Capacity mix" : "Clinical queue mix"}
          subtitle={
            isOperationalDashboard
              ? "Quick ratio view of beds, capacity headroom, and unsettled finance."
              : "Quick ratio view of visits, open encounters, pending results, and recent registrations."
          }
          segments={donutSegments}
        />

        <AnalyticsBarChart
          title={isOperationalDashboard ? "Department load" : "Care workflow load"}
          subtitle="Prioritize the queues that are pulling the most staff attention right now."
          bars={barSeries}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <InsightList
          title={isOperationalDashboard ? "Hospital operations snapshot" : "Clinical workflow snapshot"}
          subtitle={
            isOperationalDashboard
              ? "Admissions, bed occupancy, and finance queues prepared for fast administrative decisions."
              : "Search, open, document, and close patient care with minimal clicks."
          }
        >
          <div className="flex flex-wrap gap-3">
            <Link href="/patients" className="medical-button medical-button-secondary">
              Search patient
            </Link>
            {isOperationalDashboard ? (
              <Link href="/admissions" className="medical-button medical-button-primary">
                Open admissions
              </Link>
            ) : (
              <Link href="/imaging" className="medical-button medical-button-primary">
                Open imaging
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {isOperationalDashboard
              ? operations?.active_admissions.map((admission) => (
                  <Link
                    key={admission.id}
                    href={`/patients/${admission.patient}`}
                    className="medical-card medical-card-interactive flex flex-col gap-3 rounded-[1.4rem] px-5 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-semibold text-medical-primary">{admission.patient_name}</div>
                      <div className="mt-1 text-sm text-medical-secondary">
                        {admission.ward_name} • Bed {admission.bed_number}
                      </div>
                    </div>
                    <div className="grid gap-1 text-sm text-medical-secondary md:text-right">
                      <div>{formatDateTime(admission.admission_date)}</div>
                      <div>{formatStatusLabel(admission.status)}</div>
                    </div>
                  </Link>
                ))
              : clinical?.today_visits.map((visit) => (
                  <Link
                    key={visit.id}
                    href={`/patients/${visit.patient}/visits/${visit.id}`}
                    className="medical-card medical-card-interactive flex flex-col gap-3 rounded-[1.4rem] px-5 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-semibold text-medical-primary">{visit.patient_name}</div>
                      <div className="mt-1 text-sm text-medical-secondary">
                        {visit.visit_id} • {visit.chief_complaint}
                      </div>
                    </div>
                    <div className="grid gap-1 text-sm text-medical-secondary md:text-right">
                      <div>{formatDateTime(visit.visit_date)}</div>
                      <div>{formatStatusLabel(visit.status)}</div>
                    </div>
                  </Link>
                ))}

            {((isOperationalDashboard && !operations?.active_admissions.length) ||
              (!isOperationalDashboard && !clinical?.today_visits.length)) && (
              <EmptyState message="No priority records are waiting right now." />
            )}
          </div>
        </InsightList>

        <InsightList
          title="Notifications"
          subtitle={`${notifications?.unread_count ?? 0} unread alerts for ${formatRoleLabel(user.effective_role)}.`}
        >
          {notifications?.recent.length ? (
            notifications.recent.map((notification) => (
              <div key={notification.id} className="medical-subtle-panel rounded-[1.4rem] px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-medical-primary">{notification.title}</div>
                    <div className="mt-2 text-sm text-medical-secondary">{notification.message}</div>
                  </div>
                  {!notification.is_read && <div className="medical-badge">Unread</div>}
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.16em] text-medical-muted">
                  {notification.module} • {formatDateTime(notification.created_at)}
                </div>
              </div>
            ))
          ) : (
            <EmptyState message="No internal notifications yet." />
          )}

          <Link href="/notifications" className="medical-button medical-button-ghost mt-2 inline-flex">
            Open notifications
          </Link>
        </InsightList>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <InsightList
          title={isOperationalDashboard ? "Pending invoices" : "Recent patients"}
          subtitle={
            isOperationalDashboard
              ? "Finance teams can move directly into partial payment recording from this queue."
              : "Recent registrations stay one click away for fast chart access and encounter start."
          }
        >
          {isOperationalDashboard ? (
            operations?.pending_invoices.length ? (
              operations.pending_invoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href="/billing"
                  className="medical-card medical-card-interactive flex items-center justify-between rounded-2xl px-4 py-4"
                >
                  <div>
                    <div className="font-semibold text-medical-primary">{invoice.invoice_number}</div>
                    <div className="mt-1 text-sm text-medical-secondary">
                      {invoice.patient_name} • {formatStatusLabel(invoice.status)}
                    </div>
                  </div>
                  <div className="text-right text-sm text-medical-secondary">
                    <div>{formatCurrency(invoice.balance_due)}</div>
                    <div>{formatDate(invoice.created_at)}</div>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState message="No pending invoices right now." />
            )
          ) : clinical?.recent_patients.length ? (
            clinical.recent_patients.map((patient) => (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="medical-card medical-card-interactive flex items-center justify-between rounded-2xl px-4 py-4"
              >
                <div>
                  <div className="font-semibold text-medical-primary">{patient.full_name}</div>
                  <div className="mt-1 text-sm text-medical-secondary">
                    {patient.health_id} • {patient.phone_number}
                  </div>
                </div>
                <div className="text-sm text-medical-muted">{formatDate(patient.created_at)}</div>
              </Link>
            ))
          ) : (
            <EmptyState message="No patient registrations yet." />
          )}
        </InsightList>

        <InsightList
          title="Quick access"
          subtitle="Designed for long clinical shifts: fewer clicks, clearer routing, and faster context switching."
        >
          <div className="grid gap-3">
            {[
              { href: "/patients", label: "Patient search", helper: "Open demographics, profiles, and history." },
              { href: "/admissions", label: "Admissions and beds", helper: "Coordinate wards, transfers, and discharge." },
              { href: "/billing", label: "Billing and payments", helper: "Review invoices and record partial payments." },
              { href: "/imaging", label: "Imaging workflow", helper: "Track requests, uploads, and result access." },
              { href: "/reports", label: "Reports and exports", helper: "Generate finance and operational summaries." },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="medical-subtle-panel medical-card-interactive rounded-[1.4rem] px-4 py-4"
              >
                <div className="text-sm font-semibold text-medical-primary">{item.label}</div>
                <div className="mt-2 text-sm text-medical-secondary">{item.helper}</div>
              </Link>
            ))}
          </div>
        </InsightList>
      </section>
    </div>
  );
}
