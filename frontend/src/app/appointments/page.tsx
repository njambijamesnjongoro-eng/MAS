import { AppointmentsWorkspace } from "@/components/appointments/appointments-workspace";
import { AppShell } from "@/components/dashboard/app-shell";

export default function AppointmentsPage() {
  return (
    <AppShell
      title="Appointments"
      description="Schedule appointments, keep patient reminder channels current, and prepare the next-day reminder queue with minimal clicks."
    >
      <AppointmentsWorkspace />
    </AppShell>
  );
}
