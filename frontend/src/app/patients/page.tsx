import { cookies } from "next/headers";

import { AppShell } from "@/components/dashboard/app-shell";
import { PatientSearch } from "@/components/patients/patient-search";
import { createProxyResponse, proxyAuthenticatedRequest } from "@/lib/server-api";
import type { PaginatedResponse, PatientSummary } from "@/types";

async function loadInitialPatients(): Promise<PaginatedResponse<PatientSummary> | null> {
  try {
    const cookieStore = await cookies();
    const result = await proxyAuthenticatedRequest(cookieStore, "/api/patients/?page=1&page_size=100");
    const { payload, status } = await createProxyResponse(result);

    if (status !== 200 || typeof payload !== "object" || payload === null || !("results" in payload)) {
      return null;
    }

    return payload as PaginatedResponse<PatientSummary>;
  } catch {
    return null;
  }
}

export default async function PatientsPage() {
  const initialPatients = await loadInitialPatients();

  return (
    <AppShell
      title="Find Patient"
      description="Open the full patient registry first, then search only if you need to narrow the list."
    >
      <PatientSearch initialData={initialPatients} />
    </AppShell>
  );
}
