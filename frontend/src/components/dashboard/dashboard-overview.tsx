"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  AnalyticsBarChart,
  AnalyticsDonutChart,
  AnalyticsLineChart,
  AnalyticsMetricCard,
} from "@/components/dashboard/analytics-widgets";
import { PatientJourneyGuide } from "@/components/workflow/patient-journey-guide";
import { clearCachedAuthUser, getCachedAuthUser, setCachedAuthUser } from "@/lib/auth-user-cache";
import { apiRequest } from "@/lib/client-api";
import { formatCurrency, formatDate, formatDateTime, formatRoleLabel, formatStatusLabel } from "@/lib/format";
import { canStartEncounterRole } from "@/lib/role-access";
import type {
  AuthUser,
  ClinicalDashboardSummary,
  NotificationSummary,
  OperationsDashboardSummary,
  RoleCode,
} from "@/types";

const operationalRoles = new Set<RoleCode>(["super_admin", "hospital_admin", "receptionist"]);
const patientRegistrationRoles = new Set<RoleCode>(["super_admin", "hospital_admin", "clinical_officer", "nurse", "receptionist"]);
const appointmentWorkflowRoles = new Set<RoleCode>([
  "super_admin",
  "hospital_admin",
  "clinical_officer",
  "doctor",
  "nurse",
  "receptionist",
]);
const admissionWorkflowRoles = new Set<RoleCode>(["super_admin", "hospital_admin", "clinical_officer", "doctor", "nurse", "receptionist"]);
const billingWorkflowRoles = new Set<RoleCode>(["super_admin", "hospital_admin", "receptionist", "pharmacist"]);
const imagingWorkflowRoles = new Set<RoleCode>([
  "super_admin",
  "hospital_admin",
  "clinical_officer",
  "doctor",
  "nurse",
  "lab_technician",
]);

function isOperationalRole(role: RoleCode) {
  return operationalRoles.has(role);
}

type DashboardPayload =
  | {
      mode: "operations";
      notifications: NotificationSummary;
      operations: OperationsDashboardSummary;
      role: RoleCode;
    }
  | {
      mode: "clinical";
      notifications: NotificationSummary;
      clinical: ClinicalDashboardSummary;
      role: RoleCode;
    };

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

const hospitalFlowSteps = [
  {
    label: "Arrival",
    title: "Patient comes in",
    helper: "Reception confirms identity, checks whether the patient is already registered, and opens the chart.",
  },
  {
    label: "Triage",
    title: "Nurse checks vitals",
    helper: "Vitals, allergies, urgency, and safety alerts are reviewed before the clinician sees the patient.",
  },
  {
    label: "Consultation",
    title: "Clinician records visit",
    helper: "The clinical officer or doctor documents symptoms, diagnosis, treatment plan, medicine, labs, imaging, and follow-up.",
  },
  {
    label: "Orders",
    title: "Labs, imaging, pharmacy",
    helper: "Requested services move to the right department queue and return results to the patient chart.",
  },
  {
    label: "Finish",
    title: "Billing, admission, or discharge",
    helper: "The patient is billed, admitted, discharged, or given a follow-up appointment depending on the outcome.",
  },
];

const clinicalChecklist = [
  "Open the patient chart before starting treatment.",
  "Check allergies, chronic conditions, and previous visits.",
  "Record or review vitals before diagnosis.",
  "Save diagnosis, medicines, lab requests, and follow-up.",
  "Finish the visit once the patient is handed to the next department.",
];

const operationsChecklist = [
  "Check active admissions and bed pressure.",
  "Review pending invoices and payment follow-up.",
  "Confirm wards have available beds before admission.",
  "Watch new lab, imaging, and pharmacy handovers.",
  "Keep unread notifications cleared during the shift.",
];

function StartCarePanel({ role, isOperationalDashboard }: { role: RoleCode; isOperationalDashboard: boolean }) {
  const actions = [
    {
      href: "/patients",
      label: "Find patient",
      helper: "Open the patient chart first. This is the safest starting point for care.",
      tone: "medical-button-primary",
    },
  ];

  if (patientRegistrationRoles.has(role)) {
    actions.push({
      href: "/patients/register",
      label: "Register new arrival",
      helper: "Use this only when the patient is not already in the hospital registry.",
      tone: "medical-button-secondary",
    });
  }

  if (appointmentWorkflowRoles.has(role)) {
    actions.push({
      href: "/appointments",
      label: "Today appointments",
      helper: "Check who is expected, confirmed, completed, cancelled, or missed.",
      tone: "medical-button-secondary",
    });
  }

  if (isOperationalDashboard && admissionWorkflowRoles.has(role)) {
    actions.push({
      href: "/admissions",
      label: "Wards and beds",
      helper: "Admit, transfer, or discharge inpatients after the clinical decision.",
      tone: "medical-button-secondary",
    });
  }

  if (isOperationalDashboard && billingWorkflowRoles.has(role)) {
    actions.push({
      href: "/billing",
      label: "Bills and payments",
      helper: "Prepare invoices, record payments, and check outstanding balances.",
      tone: "medical-button-secondary",
    });
  }

  if (!isOperationalDashboard && imagingWorkflowRoles.has(role)) {
    actions.push({
      href: "/imaging",
      label: "Lab/X-Ray follow-up",
      helper: "Review requested investigations and results that affect today care.",
      tone: "medical-button-secondary",
    });
  }

  return (
    <section className="medical-card medical-hero rounded-[2rem] p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="medical-badge">Start here</div>
          <h3 className="mt-3 text-2xl font-semibold text-medical-primary">Patient care in the right order</h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-medical-secondary">
            Use this row during a shift: find the patient, open the chart, then continue to the next hospital step. It
            keeps the workflow simple and avoids jumping into the wrong module.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action, index) => (
          <Link
            key={action.href}
            href={action.href}
            className="medical-subtle-panel medical-card-interactive rounded-[1.4rem] p-4"
          >
            <div className="medical-badge">Step {index + 1}</div>
            <h4 className="mt-3 text-base font-semibold text-medical-primary">{action.label}</h4>
            <p className="mt-2 min-h-12 text-sm leading-6 text-medical-secondary">{action.helper}</p>
            <span className={`medical-button ${action.tone} mt-4 inline-flex`}>Open</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DashboardScrollSections({ isOperationalDashboard }: { isOperationalDashboard: boolean }) {
  const checklist = isOperationalDashboard ? operationsChecklist : clinicalChecklist;
  const departmentLinks = isOperationalDashboard
    ? [
        { href: "/admissions", label: "Wards and beds", helper: "Track admissions, transfers, discharges, and available beds." },
        { href: "/billing", label: "Bills and payments", helper: "Review invoices, partial payments, and outstanding balances." },
        { href: "/reports", label: "Reports", helper: "Open the reporting foundation for hospital activity and revenue." },
        { href: "/notifications", label: "Messages", helper: "Read internal alerts from lab, billing, admissions, and wards." },
      ]
    : [
        { href: "/patients", label: "Patient registry", helper: "Open charts quickly and continue patient care from the record." },
        { href: "/appointments", label: "Appointments", helper: "Review booked patients, follow-ups, cancellations, and no-shows." },
        { href: "/imaging", label: "X-Ray and imaging", helper: "Track requests, uploaded files, reports, and result readiness." },
        { href: "/notifications", label: "Messages", helper: "Read clinical alerts and pending work from other departments." },
      ];

  return (
    <section className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
      <article className="medical-card rounded-[2rem] p-6">
        <div className="medical-badge">Full hospital flow</div>
        <h3 className="mt-3 text-xl font-semibold text-medical-primary">How a patient moves through the hospital</h3>
        <p className="mt-2 text-sm leading-7 text-medical-secondary">
          This lower section keeps the dashboard long enough to scroll while showing the real sequence staff follow
          from arrival to finish.
        </p>

        <div className="mt-5 grid gap-3">
          {hospitalFlowSteps.map((step, index) => (
            <div key={step.label} className="medical-subtle-panel rounded-[1.4rem] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start">
                <div className="medical-badge shrink-0">Step {index + 1}</div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-medical-muted">
                    {step.label}
                  </div>
                  <h4 className="mt-1 font-semibold text-medical-primary">{step.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-medical-secondary">{step.helper}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="medical-card rounded-[2rem] p-6">
        <div className="medical-badge">Shift checklist</div>
        <h3 className="mt-3 text-xl font-semibold text-medical-primary">
          {isOperationalDashboard ? "Admin handover checks" : "Clinician shift checks"}
        </h3>
        <p className="mt-2 text-sm leading-7 text-medical-secondary">
          Use this as a simple reminder before handing patients to the next staff member or department.
        </p>

        <div className="mt-5 space-y-3">
          {checklist.map((item, index) => (
            <div key={item} className="medical-subtle-panel rounded-[1.3rem] px-4 py-3">
              <div className="flex gap-3">
                <div className="medical-badge h-fit">{index + 1}</div>
                <div className="text-sm leading-6 text-medical-secondary">{item}</div>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="medical-card rounded-[2rem] p-6 xl:col-span-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="medical-badge">More work areas</div>
            <h3 className="mt-3 text-xl font-semibold text-medical-primary">Scroll down for department queues</h3>
            <p className="mt-2 text-sm leading-7 text-medical-secondary">
              These shortcuts make the dashboard feel like a hospital command page, not just a short summary screen.
            </p>
          </div>
          <Link href="/patients" className="medical-button medical-button-primary whitespace-nowrap">
            Open patient registry
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {departmentLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="medical-subtle-panel medical-card-interactive rounded-[1.4rem] p-4"
            >
              <h4 className="font-semibold text-medical-primary">{item.label}</h4>
              <p className="mt-2 text-sm leading-6 text-medical-secondary">{item.helper}</p>
              <span className="medical-button medical-button-ghost mt-4 inline-flex">Open</span>
            </Link>
          ))}
        </div>
      </article>
    </section>
  );
}

const lowResourceGuides = [
  {
    title: "Slow internet or older phone",
    helper: "Turn on Low data mode in the top theme switcher. It removes heavy glows, blur, and motion so pages feel lighter.",
  },
  {
    title: "Power or network interruption",
    helper: "Clinical visit notes are kept as a local draft until they are saved. Staff should still save before leaving the patient.",
  },
  {
    title: "Cash, M-Pesa, card, or insurance",
    helper: "Use bills and payments to issue the hospital bill, payment receipt, and medicine receipt as one-page PDFs.",
  },
  {
    title: "Paper backup day",
    helper: "Print the patient health ID, bill receipt, payment receipt, and prescription when the hospital needs a paper trail.",
  },
];

const staffPlaybook = [
  {
    role: "Clinical officer",
    work: "First clinical contact, quick assessment, simple diagnosis, medicines, labs, referrals, and doctor handoff.",
    href: "/patients",
  },
  {
    role: "Nurse",
    work: "Triage, vitals, allergies, chronic conditions, ward care notes, and patient preparation before consultation.",
    href: "/patients",
  },
  {
    role: "Doctor",
    work: "Complex consultation, diagnosis confirmation, treatment plan, admissions, follow-up, and high-risk decisions.",
    href: "/patients",
  },
  {
    role: "Lab / imaging",
    work: "Receive requests, upload results, attach files, and return findings to the patient timeline.",
    href: "/imaging",
  },
  {
    role: "Pharmacy",
    work: "View prescriptions, dispense medicines, confirm medicine receipts, and support stock/billing handoff.",
    href: "/patients",
  },
  {
    role: "Front desk / billing",
    work: "Register arrivals, book follow-ups, prepare invoices, record cash/M-Pesa/card/insurance payments, and print receipts.",
    href: "/billing",
  },
  {
    role: "Wards",
    work: "Admit patients, assign beds, transfer wards, discharge patients, and keep bed status current.",
    href: "/admissions",
  },
  {
    role: "Hospital admin",
    work: "Monitor admissions, revenue, reports, user access, queues, notifications, and overall hospital operations.",
    href: "/reports",
  },
];

function StaffPlaybookPanel() {
  return (
    <section className="medical-card rounded-[2rem] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="medical-badge">Staff workflow map</div>
          <h3 className="mt-3 text-xl font-semibold text-medical-primary">One system for every hospital desk</h3>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-medical-secondary">
            Each role sees the same patient journey, but uses the parts of the system that match their work. This keeps
            handoffs clear from entrance to discharge, payment, pharmacy, and follow-up.
          </p>
        </div>
        <Link href="/patients" className="medical-button medical-button-primary whitespace-nowrap">
          Start at patient list
        </Link>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {staffPlaybook.map((item) => (
          <Link key={item.role} href={item.href} className="medical-subtle-panel medical-card-interactive rounded-[1.4rem] p-4">
            <h4 className="font-semibold text-medical-primary">{item.role}</h4>
            <p className="mt-2 text-sm leading-6 text-medical-secondary">{item.work}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function LowResourceReadinessPanel({ isOperationalDashboard }: { isOperationalDashboard: boolean }) {
  return (
    <section className="medical-card rounded-[2rem] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="medical-badge">Low-resource ready</div>
          <h3 className="mt-3 text-xl font-semibold text-medical-primary">Built for real hospital conditions</h3>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-medical-secondary">
            This system now supports the practical realities many hospitals face: slow phones, expensive bundles,
            shared computers, unstable electricity, paper backups, cash payments, and M-Pesa reconciliation.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/patients" className="medical-button medical-button-primary">
            Open patient list
          </Link>
          <Link href={isOperationalDashboard ? "/billing" : "/appointments"} className="medical-button medical-button-secondary">
            {isOperationalDashboard ? "Open payments" : "Open appointments"}
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {lowResourceGuides.map((item) => (
          <article key={item.title} className="medical-subtle-panel rounded-[1.4rem] p-4">
            <h4 className="font-semibold text-medical-primary">{item.title}</h4>
            <p className="mt-2 text-sm leading-6 text-medical-secondary">{item.helper}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DashboardOverview() {
  const [user, setUser] = useState<AuthUser | null>(() => getCachedAuthUser());
  const [clinical, setClinical] = useState<ClinicalDashboardSummary | null>(null);
  const [operations, setOperations] = useState<OperationsDashboardSummary | null>(null);
  const [notifications, setNotifications] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function applyDashboardPayload(payload: DashboardPayload) {
      if (payload.mode === "operations") {
        setOperations(payload.operations);
        setClinical(null);
      } else {
        setClinical(payload.clinical);
        setOperations(null);
      }
      setNotifications(payload.notifications);
    }

    async function fetchDashboardPayload(role: RoleCode): Promise<DashboardPayload> {
      const [primaryResponse, notificationResponse] = await Promise.all([
        isOperationalRole(role)
          ? apiRequest<OperationsDashboardSummary>("/api/operations/dashboard/summary")
          : apiRequest<ClinicalDashboardSummary>("/api/clinical/dashboard/summary"),
        apiRequest<NotificationSummary>("/api/notifications/summary"),
      ]);

      if (isOperationalRole(role)) {
        return {
          mode: "operations",
          notifications: notificationResponse.data,
          operations: primaryResponse.data as OperationsDashboardSummary,
          role,
        };
      }

      return {
        mode: "clinical",
        notifications: notificationResponse.data,
        clinical: primaryResponse.data as ClinicalDashboardSummary,
        role,
      };
    }

    async function refreshAuthUser() {
      try {
        const { data: authUser } = await apiRequest<AuthUser>("/api/auth/me");
        if (!cancelled) {
          setCachedAuthUser(authUser);
          setUser(authUser);
        }
        return authUser;
      } catch {
        if (!cancelled) {
          clearCachedAuthUser();
        }
        return null;
      }
    }

    async function loadSummary() {
      const cachedUser = getCachedAuthUser();
      const cachedRole = cachedUser?.effective_role;

      if (cachedUser && !cancelled) {
        setUser(cachedUser);
      }

      try {
        if (cachedRole) {
          applyDashboardPayload(await fetchDashboardPayload(cachedRole));
          void refreshAuthUser().then(async (refreshedUser) => {
            if (!refreshedUser || refreshedUser.effective_role === cachedRole || cancelled) {
              return;
            }

            try {
              const correctedPayload = await fetchDashboardPayload(refreshedUser.effective_role);
              if (!cancelled) {
                applyDashboardPayload(correctedPayload);
              }
            } catch {
              // Keep the initial dashboard data visible if background revalidation fails.
            }
          });
        } else {
          const authUser = await refreshAuthUser();
          if (!authUser) {
            throw new Error("Your session could not be confirmed.");
          }
          applyDashboardPayload(await fetchDashboardPayload(authUser.effective_role));
        }
        if (!cancelled) {
          setError(null);
        }
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
    <div className="space-y-6 pb-10">
      <PatientJourneyGuide activeStep={1} canStartEncounter={canStartEncounterRole(user.effective_role)} />

      <StartCarePanel role={user.effective_role} isOperationalDashboard={isOperationalDashboard} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <AnalyticsMetricCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[1.3fr_0.95fr_0.95fr]">
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

      <section className="grid min-w-0 gap-6 xl:grid-cols-[1.55fr_1fr]">
        <InsightList
          title={isOperationalDashboard ? "What needs action now" : "Clinician worklist"}
          subtitle={
            isOperationalDashboard
              ? "Admissions, bed occupancy, and finance queues prepared for fast administrative decisions."
              : "Open the patient chart, continue visits, review labs, and finish the consultation without hunting through menus."
          }
        >
          <div className="flex flex-wrap gap-3">
            <Link href="/patients" className="medical-button medical-button-secondary">
              Find patient
            </Link>
            {isOperationalDashboard ? (
              <Link href="/admissions" className="medical-button medical-button-primary">
                Open wards
              </Link>
            ) : (
              <Link href="/imaging" className="medical-button medical-button-primary">
                Check imaging
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

      <section className="grid min-w-0 gap-6 xl:grid-cols-[1.2fr_1fr]">
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
          subtitle="Plain-language shortcuts for the common hospital tasks during a shift."
        >
          <div className="grid gap-3">
            {[
              { href: "/patients", label: "Find or open a patient chart", helper: "Search by name, health ID, ID number, or phone." },
              { href: "/appointments", label: "See appointments", helper: "Check booked patients and follow-up visits." },
              { href: "/admissions", label: "Check wards and beds", helper: "Coordinate inpatients, transfers, and discharge." },
              { href: "/billing", label: "Handle bills and payments", helper: "Review invoices and record partial payments." },
              { href: "/imaging", label: "Check X-Ray and imaging", helper: "Track requests, uploads, and result access." },
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

      <DashboardScrollSections isOperationalDashboard={isOperationalDashboard} />

      <StaffPlaybookPanel />

      <LowResourceReadinessPanel isOperationalDashboard={isOperationalDashboard} />
    </div>
  );
}
