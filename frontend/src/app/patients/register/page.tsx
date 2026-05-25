import { AppShell } from "@/components/dashboard/app-shell";
import { PatientForm } from "@/components/patients/patient-form";

export default function RegisterPatientPage() {
  return (
    <AppShell
      title="Register Patient"
      description="Capture core demographics, safety notes, and initial medical history without overloading the intake workflow."
    >
      <PatientForm
        endpoint="/api/patients"
        method="POST"
        submitLabel="Create patient record"
        successMessage="Patient registered successfully."
      />
    </AppShell>
  );
}
