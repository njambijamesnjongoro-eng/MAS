import { ReminderHistoryWorkspace } from "@/components/appointments/reminder-history-workspace";
import { AppShell } from "@/components/dashboard/app-shell";

export default function ReminderHistoryPage() {
  return (
    <AppShell
      title="Reminder History"
      description="Review reminder outcomes, inspect retry attempts, and recover failed patient notifications from one secure operational view."
    >
      <ReminderHistoryWorkspace />
    </AppShell>
  );
}
