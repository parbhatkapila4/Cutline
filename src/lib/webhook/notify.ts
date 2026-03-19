export type WebhookPayload = {
  jobId: string;
  status: "completed" | "failed" | "cancelled";
  videoUrl?: string;
  variations?: { videoUrl: string }[];
  completedAt: string;
  error?: string;
};

const WEBHOOK_TIMEOUT_MS = 5000;

export async function notifyWebhook(options: {
  callbackUrl: string;
  payload: WebhookPayload;
}): Promise<void> {
  const { callbackUrl, payload } = options;
  if (!callbackUrl || typeof callbackUrl !== "string" || !callbackUrl.startsWith("http")) {
    return;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    const res = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(
        "[webhook] jobId=" + payload.jobId + " callback returned " + res.status + " " + res.statusText
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[webhook] jobId=" + payload.jobId + " failed: " + msg.replace(/\s+/g, " "));
  }
}
