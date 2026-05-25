import { cookies } from "next/headers";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

type Context = {
  params: Promise<{ visitId: string }>;
};

export async function POST(_request: Request, context: Context) {
  const { visitId } = await context.params;
  const cookieStore = await cookies();
  return createAuthenticatedJsonResponse(cookieStore, `/api/clinical/visits/${visitId}/close/`, {
    method: "POST",
  });
}
