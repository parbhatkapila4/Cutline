import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function getAdminSecret(): string | undefined {
  const v = process.env.ADMIN_SECRET ?? process.env.ADMIN_API_SECRET;
  if (typeof v !== "string" || v.trim() === "") return undefined;
  return v.trim();
}

function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  if (bufA.length === 0) return true;
  return timingSafeEqual(bufA, bufB);
}

function getProvidedSecret(request: Request): string | undefined {
  const header = request.headers.get("x-admin-secret");
  if (header && header.trim() !== "") return header.trim();

  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(
      new RegExp(`${COOKIE_NAME}=([^;]+)`, "i")
    );
    if (match?.[1]) {
      const value = decodeURIComponent(match[1].trim());
      return value;
    }
  }

  return undefined;
}

function verifySessionCookie(secret: string, cookieValue: string): boolean {
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;
  const [expiryStr, hmacHex] = parts;
  const expiry = parseInt(expiryStr ?? "", 10);
  if (Number.isNaN(expiry) || expiry <= Date.now()) return false;
  if (!hmacHex || !/^[a-f0-9]+$/i.test(hmacHex)) return false;

  const expected = createHmac("sha256", secret)
    .update(expiryStr!)
    .digest("hex");
  const provided = Buffer.from(hmacHex, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (provided.length !== expectedBuf.length) return false;
  return timingSafeEqual(provided, expectedBuf);
}

export function isAdminRequest(request: Request): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;

  const provided = getProvidedSecret(request);
  if (!provided) return false;

  if (provided.includes(".")) {
    return verifySessionCookie(secret, provided);
  }

  return constantTimeCompare(provided, secret);
}

export type RequireAdminResult =
  | { ok: true }
  | { ok: false; status: number; body: { error: string } };

export function requireAdmin(request: Request): RequireAdminResult {
  const secret = getAdminSecret();
  if (!secret) {
    return { ok: false, status: 401, body: { error: "Admin not configured" } };
  }
  if (!isAdminRequest(request)) {
    return { ok: false, status: 401, body: { error: "Unauthorized" } };
  }
  return { ok: true };
}

export function createAdminSessionCookie(): string {
  const secret = getAdminSecret();
  if (!secret) return "";

  const expiry = Date.now() + SESSION_DURATION_MS;
  const expiryStr = String(expiry);
  const hmac = createHmac("sha256", secret).update(expiryStr).digest("hex");
  return `${expiryStr}.${hmac}`;
}

export function getAdminSessionCookieName(): string {
  return COOKIE_NAME;
}
