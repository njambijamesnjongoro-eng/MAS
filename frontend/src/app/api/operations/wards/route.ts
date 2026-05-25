import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  return createAuthenticatedJsonResponse(cookieStore, `/api/operations/wards/${request.nextUrl.search}`);
}
