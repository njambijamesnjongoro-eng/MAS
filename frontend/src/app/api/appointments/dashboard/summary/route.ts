import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

export async function GET() {
  const cookieStore = await cookies();
  return createAuthenticatedJsonResponse(cookieStore, "/api/appointments/dashboard/summary/");
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const body = await request.json().catch(() => ({}));
  return createAuthenticatedJsonResponse(cookieStore, "/api/appointments/dashboard/summary/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
