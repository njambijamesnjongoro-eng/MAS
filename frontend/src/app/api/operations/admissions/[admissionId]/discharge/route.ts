import { cookies } from "next/headers";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

type Context = {
  params: Promise<{ admissionId: string }>;
};

export async function POST(_request: Request, context: Context) {
  const { admissionId } = await context.params;
  const cookieStore = await cookies();
  return createAuthenticatedJsonResponse(cookieStore, `/api/operations/admissions/${admissionId}/discharge/`, {
    method: "POST",
  });
}
