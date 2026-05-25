import { ReminderDashboardWorkspace } from "@/components/appointments/reminder-dashboard-workspace";
import { AppShell } from "@/components/dashboard/app-shell";

export default function RemindersPage() {
  return (
    <AppShell
      title="Reminder Dashboard"
      description="Monitor appointment reminder delivery, trigger the daily scheduler, and keep SMS and email communication operational."
    >
      <ReminderDashboardWorkspace />
    </AppShell>
  );
}
