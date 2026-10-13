export function isCancelledFailure(reason: string | null | undefined): boolean {
  return typeof reason === "string" && reason.includes("cancelled");
}
