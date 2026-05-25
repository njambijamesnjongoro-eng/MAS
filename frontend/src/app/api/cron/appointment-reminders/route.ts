import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ detail: "Unauthorized." }, { status: 401 });
  }

  const backendUrl = process.env.BACKEND_URL;
  const backendCronSecret = process.env.APPOINTMENT_CRON_SECRET;
  if (!backendUrl || !backendCronSecret) {
    return NextResponse.json(
      { detail: "Cron configuration is incomplete." },
      { status: 500 },
    );
  }

  const response = await fetch(new URL("/api/appointments/cron/run/", backendUrl), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${backendCronSecret}`,
    },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}
