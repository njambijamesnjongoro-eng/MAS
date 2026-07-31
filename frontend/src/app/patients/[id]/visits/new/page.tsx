import { VisitWorkspace } from "@/components/clinical/visit-workspace";
import { AppShell } from "@/components/dashboard/app-shell";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewVisitPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AppShell
      title="Start Doctor Visit"
      description="Follow the consultation steps: complaint, vitals, diagnosis, treatment plan, medicines, lab requests, and follow-up."
    >
      <VisitWorkspace patientId={id} />
    </AppShell>
  );
}
