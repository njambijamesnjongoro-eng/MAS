import { VisitWorkspace } from "@/components/clinical/visit-workspace";
import { AppShell } from "@/components/dashboard/app-shell";

type PageProps = {
  params: Promise<{ id: string; visitId: string }>;
};

export default async function VisitDetailPage({ params }: PageProps) {
  const { id, visitId } = await params;

  return (
    <AppShell
      title="Encounter Workspace"
      description="Review and update the full visit record, including vitals, diagnosis, prescriptions, lab requests, and uploaded results."
    >
      <VisitWorkspace patientId={id} visitId={visitId} />
    </AppShell>
  );
}
