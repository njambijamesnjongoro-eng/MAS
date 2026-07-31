import { AppShell } from "@/components/dashboard/app-shell";
import { PatientSearch } from "@/components/patients/patient-search";

export default function PatientsPage() {
  return (
    <AppShell
      title="Find Patient"
      description="Search by name, health ID, national ID, or phone number, then open the patient chart and continue care."
    >
      <PatientSearch />
    </AppShell>
  );
}
