import { Suspense } from "react";
import { RequireSession } from "@/components/auth/RequireSession";
import CreateLoading from "./loading";

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<CreateLoading />}>
      <RequireSession fallbackPath="/create">{children}</RequireSession>
    </Suspense>
  );
}
