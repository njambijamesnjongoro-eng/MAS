import { VisitWorkspace } from "@/components/clinical/visit-workspace";
import { AppShell } from "@/components/dashboard/app-shell";

type PageProps = {
  params: Promise<{ id: string; visitId: string }>;
};

export default async function VisitDetailPage({ params }: PageProps) {
  const { id, visitId } = await params;

  return (
    <AppShell
      title="Clinician Visit Workspace"
      description="Review and update this visit step by step: symptoms, vitals, diagnosis, prescriptions, tests, results, and closure."
    >
      <VisitWorkspace patientId={id} visitId={visitId} />
    </AppShell>
  );
}
