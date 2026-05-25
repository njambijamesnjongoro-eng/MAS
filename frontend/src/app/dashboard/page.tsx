import { AppShell } from "@/components/dashboard/app-shell";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export default function DashboardPage() {
  return (
    <AppShell
      title="Hospital Dashboard"
      description="Move quickly between clinical care, admissions, billing, imaging, and queue awareness with server-enforced access controls."
    >
      <DashboardOverview />
    </AppShell>
  );
}
