import { AppShell } from "@/components/dashboard/app-shell";
import { PatientProfile } from "@/components/patients/patient-profile";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PatientProfilePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AppShell
      title="Patient Chart"
      description="Confirm the patient, review alerts and history, then continue to triage, doctor visit, orders, billing, or admission."
    >
      <PatientProfile patientId={id} />
    </AppShell>
  );
}
