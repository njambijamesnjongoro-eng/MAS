import { cookies } from "next/headers";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

type RouteContext = {
  params: Promise<{ appointmentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const cookieStore = await cookies();
  const { appointmentId } = await context.params;
  return createAuthenticatedJsonResponse(cookieStore, `/api/appointments/appointments/${appointmentId}/`);
}

export async function PATCH(request: Request, context: RouteContext) {
  const cookieStore = await cookies();
  const { appointmentId } = await context.params;
  const body = await request.json();
  return createAuthenticatedJsonResponse(cookieStore, `/api/appointments/appointments/${appointmentId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
