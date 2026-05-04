import { auth } from "@/lib/auth";

const SESSION_READ_MS = Math.min(
  30_000,
  Math.max(1500, Number(process.env.AUTH_SESSION_READ_TIMEOUT_MS ?? "4500") || 4500)
);

export async function getSessionSafe(
  headers: Headers
): Promise<Awaited<ReturnType<typeof auth.api.getSession>> | null> {
  try {
    return await Promise.race([
      auth.api.getSession({ headers }),
      new Promise<null>((_, reject) => {
        setTimeout(() => reject(Object.assign(new Error("auth_session_timeout"), { code: "AUTH_SESSION_TIMEOUT" })), SESSION_READ_MS);
      }),
    ]);
  } catch {
    return null;
  }
}
