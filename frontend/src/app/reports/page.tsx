import { AppShell } from "@/components/dashboard/app-shell";
import { ReportingWorkspace } from "@/components/reporting/reporting-workspace";

export default function ReportsPage() {
  return (
    <AppShell
      title="Reporting Foundation"
      description="Generate operational exports for admissions, revenue, diagnoses, lab activity, and pharmacy usage."
    >
      <ReportingWorkspace />
    </AppShell>
  );
}
