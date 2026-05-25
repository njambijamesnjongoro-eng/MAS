import { AppShell } from "@/components/dashboard/app-shell";
import { PatientProfile } from "@/components/patients/patient-profile";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PatientProfilePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AppShell
      title="Patient Profile"
      description="Access the patient record quickly, review risk information, and maintain a clean medical history foundation."
    >
      <PatientProfile patientId={id} />
    </AppShell>
  );
}
