type AnalyticsWindow = Window & {
  gtag?: (command: "event", name: string, params?: Record<string, unknown>) => void;
  datafast?: ((name: string, params?: Record<string, string>) => void) & { q?: unknown[] };
};

export type PlanParam = "free" | "beginner" | "professional" | "enterprise";
export type ModeParam = "slideshow" | "talking_object";

function sendToDatafast(w: AnalyticsWindow, name: string, params?: Record<string, string | number>): void {
  if (typeof w.datafast !== "function") {
    const queued = function (...args: unknown[]) {
      (queued.q ??= []).push(args);
    } as NonNullable<AnalyticsWindow["datafast"]>;
    w.datafast = queued;
  }
  const values = params && Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));
  w.datafast(name, values);
}

function send(name: string, params?: Record<string, string | number>): void {
  if (typeof window === "undefined") return;
  const w = window as AnalyticsWindow;
  try {
    if (typeof w.gtag === "function") w.gtag("event", name, params);
  } catch {
  }
  try {
    sendToDatafast(w, name, params);
  } catch {
  }
}

export function trackSignUp(): void {
  send("sign_up");
}

export function trackGenerateSubmit(mode: ModeParam, plan: PlanParam): void {
  send("generate_submit", { mode, plan });
}

export function trackGenerateComplete(mode: ModeParam, plan: PlanParam): void {
  send("generate_complete", { mode, plan });
}

export function trackGenerateFailed(
  mode: ModeParam,
  plan: PlanParam,
  errorCode: string
): void {
  send("generate_failed", { mode, plan, error_code: errorCode });
}

export function trackCheckoutStart(plan: PlanParam): void {
  send("checkout_start", { plan });
}
