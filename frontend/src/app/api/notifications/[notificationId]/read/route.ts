import { cookies } from "next/headers";

import { createAuthenticatedJsonResponse } from "@/lib/server-api";

type Context = {
  params: Promise<{ notificationId: string }>;
};

export async function POST(_request: Request, context: Context) {
  const { notificationId } = await context.params;
  const cookieStore = await cookies();
  return createAuthenticatedJsonResponse(cookieStore, `/api/notifications/${notificationId}/read/`, {
    method: "POST",
  });
}
