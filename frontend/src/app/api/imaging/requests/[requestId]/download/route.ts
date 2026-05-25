import { cookies } from "next/headers";

import { createAuthenticatedPassthroughResponse } from "@/lib/server-api";

type Context = {
  params: Promise<{ requestId: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { requestId } = await context.params;
  const cookieStore = await cookies();
  return createAuthenticatedPassthroughResponse(cookieStore, `/api/imaging/requests/${requestId}/download/`);
}
