import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clearAuthCookies, proxyAuthenticatedRequest } from "@/lib/server-api";

export async function POST() {
  const cookieStore = await cookies();
  const refresh = cookieStore.get("ehr_refresh")?.value;

  if (refresh) {
    await proxyAuthenticatedRequest(cookieStore, "/api/auth/logout/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh }),
    });
  }

  const response = NextResponse.json({ message: "Logout successful." });
  clearAuthCookies(response);
  return response;
}
