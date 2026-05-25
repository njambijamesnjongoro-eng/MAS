import { cookies } from "next/headers";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

type Context = {
  params: Promise<{ invoiceId: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { invoiceId } = await context.params;
  const cookieStore = await cookies();
  return createAuthenticatedJsonResponse(cookieStore, `/api/finance/invoices/${invoiceId}/receipt/`);
}
