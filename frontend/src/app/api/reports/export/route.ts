import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { createAuthenticatedPassthroughResponse } from "@/lib/server-api";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  return createAuthenticatedPassthroughResponse(cookieStore, `/api/reports/export/${request.nextUrl.search}`);
}
