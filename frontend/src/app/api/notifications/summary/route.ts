import { cookies } from "next/headers";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

export async function GET() {
  const cookieStore = await cookies();
  return createAuthenticatedJsonResponse(cookieStore, "/api/notifications/summary/");
}
