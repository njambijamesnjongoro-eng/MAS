import { cookies } from "next/headers";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

type Context = {
  params: Promise<{ admissionId: string }>;
};

export async function POST(request: Request, context: Context) {
  const { admissionId } = await context.params;
  const cookieStore = await cookies();
  const body = await request.json();
  return createAuthenticatedJsonResponse(cookieStore, `/api/operations/admissions/${admissionId}/transfer/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
