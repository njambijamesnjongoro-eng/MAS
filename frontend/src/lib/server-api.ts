import { NextResponse } from "next/server";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8001";
const ACCESS_COOKIE = "ehr_access";
const REFRESH_COOKIE = "ehr_refresh";

interface TokenPair {
  access: string;
  refresh?: string;
}

type CookieStoreLike = {
  get(name: string): { value: string } | undefined;
};

interface ProxyResult {
  response: Response;
  refreshedTokens?: TokenPair;
}

function buildBackendUrl(path: string) {
  return new URL(path, BACKEND_URL).toString();
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function backendRequest(path: string, init: RequestInit = {}) {
  return fetch(buildBackendUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

async function refreshAccessToken(refresh: string): Promise<TokenPair | null> {
  const response = await backendRequest("/api/auth/refresh/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await parseJson(response)) as TokenPair;
  return {
    access: data.access,
    refresh: data.refresh ?? refresh,
  };
}

export async function proxyAuthenticatedRequest(
  cookieStore: CookieStoreLike,
  path: string,
  init: RequestInit = {},
): Promise<ProxyResult> {
  const access = cookieStore.get(ACCESS_COOKIE)?.value;
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;

  const firstResponse = await backendRequest(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
  });

  if (firstResponse.status !== 401 || !refresh) {
    return { response: firstResponse };
  }

  const refreshedTokens = await refreshAccessToken(refresh);
  if (!refreshedTokens) {
    return { response: firstResponse };
  }

  const secondResponse = await backendRequest(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${refreshedTokens.access}`,
    },
  });

  return { response: secondResponse, refreshedTokens };
}

export async function createProxyResponse(result: ProxyResult) {
  const payload = await parseJson(result.response);
  return { payload, status: result.response.status, refreshedTokens: result.refreshedTokens };
}

export async function createAuthenticatedJsonResponse(
  cookieStore: CookieStoreLike,
  path: string,
  init: RequestInit = {},
) {
  const result = await proxyAuthenticatedRequest(cookieStore, path, init);
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

export async function createAuthenticatedPassthroughResponse(
  cookieStore: CookieStoreLike,
  path: string,
  init: RequestInit = {},
) {
  const result = await proxyAuthenticatedRequest(cookieStore, path, init);
  const buffer = await result.response.arrayBuffer();
  const response = new NextResponse(buffer, {
    status: result.response.status,
    headers: {
      "Content-Type": result.response.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": result.response.headers.get("Content-Disposition") ?? "",
    },
  });

  if (result.refreshedTokens) {
    applyAuthCookies(response, result.refreshedTokens);
  }
  if (result.response.status === 401) {
    clearAuthCookies(response);
  }

  return response;
}

export function applyAuthCookies(response: NextResponse, tokens: TokenPair) {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ACCESS_COOKIE, tokens.access, {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: 60 * 15,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refresh ?? "", {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
