import { NextResponse } from "next/server";

import { applyAuthCookies, BACKEND_URL } from "@/lib/server-api";

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch(`${BACKEND_URL}/api/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  const nextResponse = NextResponse.json(payload, { status: response.status });

  if (response.ok && payload.access && payload.refresh) {
    applyAuthCookies(nextResponse, {
      access: payload.access as string,
      refresh: payload.refresh as string,
    });
  }

  return nextResponse;
}
