import { VisitWorkspace } from "@/components/clinical/visit-workspace";
import { AppShell } from "@/components/dashboard/app-shell";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewVisitPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AppShell
      title="Start Encounter"
      description="Create a new consultation, capture symptoms and vitals, then complete diagnosis, prescription, and lab requests in one workspace."
    >
      <VisitWorkspace patientId={id} />
    </AppShell>
  );
}
