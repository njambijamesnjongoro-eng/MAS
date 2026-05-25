import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("ehr_refresh");
  redirect(refreshToken ? "/dashboard" : "/login");
}
