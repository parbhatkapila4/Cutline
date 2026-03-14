import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

async function withErrorLog(req: Request, method: "GET" | "POST") {
    try {
        const fn = method === "GET" ? handler.GET : handler.POST;
        const res = await fn(req);
        if (res.status >= 500) {
            const clone = res.clone();
            const body = await clone.text();
            console.error("[Better Auth]", method, req.url, "status", res.status, body || res.statusText);
            let message = body || res.statusText || "Server error";
            try {
                const parsed = JSON.parse(body) as { message?: string; error?: string };
                message = parsed.message ?? parsed.error ?? message;
            } catch {
            }
            return new Response(
                JSON.stringify({ error: true, message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        return res;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[Better Auth]", method, req.url, err);
        return new Response(
            JSON.stringify({ error: true, message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

export async function GET(req: Request) {
    return withErrorLog(req, "GET");
}

export async function POST(req: Request) {
    return withErrorLog(req, "POST");
}
