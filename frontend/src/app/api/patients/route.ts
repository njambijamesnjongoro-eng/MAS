import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { applyAuthCookies, clearAuthCookies, createProxyResponse, proxyAuthenticatedRequest } from "@/lib/server-api";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const path = `/api/patients/${request.nextUrl.search}`;
  const result = await proxyAuthenticatedRequest(cookieStore, path);
  const { payload, status, refreshedTokens } = await createProxyResponse(result);
  const response = NextResponse.json(payload, { status });

  if (refreshedTokens) {
    applyAuthCookies(response, refreshedTokens);
  }
  if (status === 401) {
    clearAuthCookies(response);
  }
  return response;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const body = await request.json();
  const result = await proxyAuthenticatedRequest(cookieStore, "/api/patients/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const { payload, status, refreshedTokens } = await createProxyResponse(result);
  const response = NextResponse.json(payload, { status });

  if (refreshedTokens) {
    applyAuthCookies(response, refreshedTokens);
  }
  if (status === 401) {
    clearAuthCookies(response);
  }
  return response;
}
