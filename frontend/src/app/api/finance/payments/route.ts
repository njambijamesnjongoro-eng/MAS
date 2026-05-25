import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  return createAuthenticatedJsonResponse(cookieStore, `/api/finance/payments/${request.nextUrl.search}`);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const body = await request.json();
  return createAuthenticatedJsonResponse(cookieStore, "/api/finance/payments/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
