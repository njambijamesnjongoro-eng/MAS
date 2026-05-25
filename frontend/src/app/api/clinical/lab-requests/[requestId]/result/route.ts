import { cookies } from "next/headers";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

type Context = {
  params: Promise<{ requestId: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { requestId } = await context.params;
  const cookieStore = await cookies();
  return createAuthenticatedJsonResponse(cookieStore, `/api/clinical/lab-requests/${requestId}/result/`);
}

export async function POST(request: Request, context: Context) {
  const { requestId } = await context.params;
  const cookieStore = await cookies();
  const formData = await request.formData();
  return createAuthenticatedJsonResponse(cookieStore, `/api/clinical/lab-requests/${requestId}/result/`, {
    method: "POST",
    body: formData,
  });
}

export async function PATCH(request: Request, context: Context) {
  const { requestId } = await context.params;
  const cookieStore = await cookies();
  const formData = await request.formData();
  return createAuthenticatedJsonResponse(cookieStore, `/api/clinical/lab-requests/${requestId}/result/`, {
    method: "PATCH",
    body: formData,
  });
}
