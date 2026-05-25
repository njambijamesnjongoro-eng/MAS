import { cookies } from "next/headers";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

type Context = {
  params: Promise<{ prescriptionId: string }>;
};

export async function POST(_request: Request, context: Context) {
  const { prescriptionId } = await context.params;
  const cookieStore = await cookies();
  return createAuthenticatedJsonResponse(cookieStore, `/api/clinical/prescriptions/${prescriptionId}/dispense/`, {
    method: "POST",
  });
}
