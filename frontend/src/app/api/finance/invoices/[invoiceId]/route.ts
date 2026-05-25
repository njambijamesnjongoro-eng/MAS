import { cookies } from "next/headers";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

type Context = {
  params: Promise<{ invoiceId: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { invoiceId } = await context.params;
  const cookieStore = await cookies();
  return createAuthenticatedJsonResponse(cookieStore, `/api/finance/invoices/${invoiceId}/`);
}

export async function PATCH(request: Request, context: Context) {
  const { invoiceId } = await context.params;
  const cookieStore = await cookies();
  const body = await request.json();
  return createAuthenticatedJsonResponse(cookieStore, `/api/finance/invoices/${invoiceId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
