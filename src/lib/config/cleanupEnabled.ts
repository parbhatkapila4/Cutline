const ENABLED_VALUES = new Set(["true", "1", "yes", "on"]);
const DISABLED_VALUES = new Set(["false", "0", "no", "off"]);

let warnedValue: string | undefined;

export function isCleanupEnabled(): boolean {
  const raw = process.env.CLEANUP_ENABLED;
  const value = raw?.trim().toLowerCase() ?? "";
  if (value === "" || ENABLED_VALUES.has(value)) return true;
  if (DISABLED_VALUES.has(value)) return false;
  if (warnedValue !== raw) {
    warnedValue = raw;
    console.warn(
      `[config] CLEANUP_ENABLED=${JSON.stringify(raw)} is not one of true, false, 1, 0, yes, no, on, off; ` +
      "cleanup stays off. Unset it to use the default (on)."
    );
  }
  return false;
}
