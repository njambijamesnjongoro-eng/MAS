import { cookies } from "next/headers";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

export async function POST() {
  const cookieStore = await cookies();
  return createAuthenticatedJsonResponse(cookieStore, "/api/notifications/read-all/", {
    method: "POST",
  });
}
