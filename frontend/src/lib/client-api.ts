export async function apiRequest<T>(
  input: string,
  init?: RequestInit,
): Promise<{ data: T; status: number }> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  let payload: T;
  try {
    payload = (await response.json()) as T;
  } catch {
    payload = {} as T;
  }

  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload !== null && "detail" in payload
        ? String((payload as { detail: string }).detail)
        : "Request failed.";
    throw new Error(detail);
  }

  return { data: payload, status: response.status };
}
