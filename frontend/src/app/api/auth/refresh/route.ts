import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { applyAuthCookies, BACKEND_URL } from "@/lib/server-api";

export async function POST() {
  const cookieStore = await cookies();
  const refresh = cookieStore.get("ehr_refresh")?.value;

  if (!refresh) {
    return NextResponse.json({ detail: "No refresh token." }, { status: 401 });
  }

  const response = await fetch(`${BACKEND_URL}/api/auth/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ refresh }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  const nextResponse = NextResponse.json(payload, { status: response.status });

  if (response.ok && payload.access) {
    applyAuthCookies(nextResponse, {
      access: payload.access as string,
      refresh: (payload.refresh as string | undefined) ?? refresh,
    });
  }

  return nextResponse;
}
