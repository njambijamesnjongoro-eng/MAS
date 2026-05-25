import { AppShell } from "@/components/dashboard/app-shell";
import { PatientSearch } from "@/components/patients/patient-search";

export default function PatientsPage() {
  return (
    <AppShell
      title="Patient Search"
      description="Instant patient lookup across demographics and identifiers, with pagination and backend-enforced access rules."
    >
      <PatientSearch />
    </AppShell>
  );
}
