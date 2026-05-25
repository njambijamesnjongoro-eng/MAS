import { cookies } from "next/headers";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

type Context = {
  params: Promise<{ requestId: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { requestId } = await context.params;
  const cookieStore = await cookies();
  return createAuthenticatedJsonResponse(cookieStore, `/api/imaging/requests/${requestId}/`);
}

export async function PATCH(request: Request, context: Context) {
  const { requestId } = await context.params;
  const cookieStore = await cookies();
  const body = await request.json();
  return createAuthenticatedJsonResponse(cookieStore, `/api/imaging/requests/${requestId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
