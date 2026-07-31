"use client";

import Link from "next/link";

type JourneyAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
};

type JourneyStep = {
  number: number;
  title: string;
  owner: string;
  description: string;
  actions?: JourneyAction[];
};

type PatientJourneyGuideProps = {
  activeStep?: number;
  canStartEncounter?: boolean;
  compact?: boolean;
  patientId?: string;
};

function getButtonClass(variant: JourneyAction["variant"] = "ghost") {
  if (variant === "primary") {
    return "medical-button medical-button-primary";
  }
  if (variant === "secondary") {
    return "medical-button medical-button-secondary";
  }
  return "medical-button medical-button-ghost";
}

export function PatientJourneyGuide({
  activeStep = 1,
  canStartEncounter = false,
  compact = false,
  patientId,
}: PatientJourneyGuideProps) {
  const patientChartHref = patientId ? `/patients/${patientId}` : "/patients";
  const visitHref = patientId ? `/patients/${patientId}/visits/new` : "/patients";

  const steps: JourneyStep[] = [
    {
      number: 1,
      title: "Patient arrives",
      owner: "Reception",
      description: "Find the patient or register a new patient before any clinical work starts.",
      actions: [
        { href: "/patients", label: "Find patient", variant: "secondary" },
        { href: "/patients/register", label: "New patient", variant: "ghost" },
      ],
    },
    {
      number: 2,
      title: "Open chart and triage",
      owner: "Nurse",
      description: "Confirm identity, check alerts, record vitals, and prepare the patient for the doctor.",
      actions: patientId ? [{ href: patientChartHref, label: "Open chart", variant: "ghost" }] : undefined,
    },
    {
      number: 3,
      title: "Doctor consultation",
      owner: "Doctor",
      description: "Record the main complaint, symptoms, examination notes, diagnosis, and care plan.",
      actions:
        patientId && canStartEncounter
          ? [{ href: visitHref, label: "Start doctor visit", variant: "primary" }]
          : undefined,
    },
    {
      number: 4,
      title: "Orders and treatment",
      owner: "Doctor / Lab / Imaging",
      description: "Request labs or imaging, prescribe medicines, and wait for results if needed.",
      actions: [{ href: "/imaging", label: "Imaging", variant: "ghost" }],
    },
    {
      number: 5,
      title: "Medicines, billing, or admission",
      owner: "Pharmacy / Billing / Wards",
      description: "Dispense medicines, create the bill, or admit the patient if inpatient care is required.",
      actions: [
        { href: "/billing", label: "Billing", variant: "ghost" },
        { href: "/admissions", label: "Admit patient", variant: "ghost" },
      ],
    },
    {
      number: 6,
      title: "Finish and follow up",
      owner: "Doctor / Front desk",
      description: "Close the visit, document follow-up date, and give the patient clear next instructions.",
      actions: [{ href: "/appointments", label: "Book follow-up", variant: "ghost" }],
    },
  ];

  return (
    <section className={`medical-card medical-hero rounded-[2rem] ${compact ? "p-5" : "p-6"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="medical-badge">Real hospital patient flow</div>
          <h3 className={`${compact ? "mt-3 text-xl" : "mt-3 text-2xl"} font-semibold text-medical-primary`}>
            Follow the patient from arrival to finish
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-medical-secondary">
            Use this as the map for the whole system. Each module supports one stage of the patient journey.
          </p>
        </div>
        <Link href="/patients" className="medical-button medical-button-secondary whitespace-nowrap">
          Start with patient search
        </Link>
      </div>

      <div className={`mt-5 grid gap-3 ${compact ? "lg:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-3"}`}>
        {steps.map((step) => {
          const isActive = step.number === activeStep;
          return (
            <article
              key={step.number}
              className={`rounded-[1.5rem] border px-4 py-4 transition ${
                isActive
                  ? "border-[var(--border-strong)] bg-[var(--accent-soft)] shadow-[var(--glow-primary)]"
                  : "border-[var(--border)] bg-[var(--panel-contrast)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary-strong)]">
                    {step.number}
                  </span>
                  <div>
                    <h4 className="font-semibold text-medical-primary">{step.title}</h4>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-medical-muted">{step.owner}</div>
                  </div>
                </div>
                {isActive && <span className="medical-badge">Now</span>}
              </div>
              <p className="mt-3 text-sm leading-6 text-medical-secondary">{step.description}</p>
              {step.actions?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {step.actions.map((action) => (
                    <Link key={`${step.number}-${action.label}`} href={action.href} className={getButtonClass(action.variant)}>
                      {action.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
