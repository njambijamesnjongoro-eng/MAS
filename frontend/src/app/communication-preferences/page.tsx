import { CommunicationPreferencesWorkspace } from "@/components/appointments/communication-preferences-workspace";
import { AppShell } from "@/components/dashboard/app-shell";

export default function CommunicationPreferencesPage() {
  return (
    <AppShell
      title="Reminder Settings"
      description="Manage how appointment reminders reach patients while keeping contact data validated and operationally ready."
    >
      <CommunicationPreferencesWorkspace />
    </AppShell>
  );
}
