import { AppShell } from "@/components/dashboard/app-shell";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export default function DashboardPage() {
  return (
    <AppShell
      title="Today / Patient Flow"
      description="Start here each shift. Follow patients from arrival to triage, clinician consultation, orders, billing, admission, and follow-up."
    >
      <DashboardOverview />
    </AppShell>
  );
}
