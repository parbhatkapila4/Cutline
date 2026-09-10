import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { REQUEST_URL_HEADER, safeRequestPath } from "@/lib/http/requestUrl";

export default async function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (session?.user?.id == null) {
    const returnTo = safeRequestPath(requestHeaders.get(REQUEST_URL_HEADER), "/create");
    redirect(`/auth/sign-in?redirect=${encodeURIComponent(returnTo)}`);
  }
  return <>{children}</>;
}
