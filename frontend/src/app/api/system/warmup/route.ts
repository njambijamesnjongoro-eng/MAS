import { NextResponse } from "next/server";

import { BACKEND_URL } from "@/lib/server-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const startedAt = Date.now();

  try {
    const response = await fetch(new URL("/api/health/", BACKEND_URL), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(
      {
        ok: response.ok,
        backend_status: response.status,
        duration_ms: Date.now() - startedAt,
        payload,
      },
      { status: response.ok ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        detail: "Backend warmup request failed.",
        duration_ms: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }
}
