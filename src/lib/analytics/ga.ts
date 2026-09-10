type GtagWindow = Window & {
  gtag?: (command: "event", name: string, params?: Record<string, unknown>) => void;
};

export type PlanParam = "free" | "beginner" | "professional" | "enterprise";
export type ModeParam = "slideshow" | "talking_object";

function send(name: string, params?: Record<string, string | number>): void {
  if (typeof window === "undefined") return;
  const gtag = (window as GtagWindow).gtag;
  if (typeof gtag !== "function") return;
  try {
    gtag("event", name, params);
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
