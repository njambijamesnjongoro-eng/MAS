import { AppShell } from "@/components/dashboard/app-shell";
import { AdmissionsWorkspace } from "@/components/operations/admissions-workspace";

export default function AdmissionsPage() {
  return (
    <AppShell
      title="Admissions and Bed Management"
      description="Admit, transfer, and discharge inpatients with ward and bed assignment controlled by backend validation."
    >
      <AdmissionsWorkspace />
    </AppShell>
  );
}
