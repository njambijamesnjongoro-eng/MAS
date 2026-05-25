import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { applyAuthCookies, clearAuthCookies, createProxyResponse, proxyAuthenticatedRequest } from "@/lib/server-api";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const cookieStore = await cookies();
  const result = await proxyAuthenticatedRequest(cookieStore, `/api/patients/${id}/history/`);
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

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const cookieStore = await cookies();
  const body = await request.json();
  const result = await proxyAuthenticatedRequest(cookieStore, `/api/patients/${id}/history/`, {
    method: "PATCH",
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
