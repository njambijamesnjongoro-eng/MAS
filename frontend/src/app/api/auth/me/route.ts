import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { applyAuthCookies, clearAuthCookies, createProxyResponse, proxyAuthenticatedRequest } from "@/lib/server-api";

export async function GET() {
  const cookieStore = await cookies();
  const result = await proxyAuthenticatedRequest(cookieStore, "/api/auth/me/");
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
