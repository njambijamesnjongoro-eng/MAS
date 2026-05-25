import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const cookieStore = await cookies();
  const search = request.nextUrl.search;
  return createAuthenticatedJsonResponse(cookieStore, `/api/clinical/patients/${id}/visits/${search}`);
}
