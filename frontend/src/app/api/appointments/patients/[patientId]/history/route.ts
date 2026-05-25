import { cookies } from "next/headers";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

type RouteContext = {
  params: Promise<{ patientId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const cookieStore = await cookies();
  const { patientId } = await context.params;
  return createAuthenticatedJsonResponse(cookieStore, `/api/appointments/patients/${patientId}/history/`);
}
