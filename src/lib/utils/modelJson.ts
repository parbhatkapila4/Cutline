const FENCE_RE = /```[^\n`]*\n?([\s\S]*?)```/g;
const MAX_BRACE_SCAN_ATTEMPTS = 20;

function isParseable(s: string): boolean {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

function extractBalanced(s: string, start: number): string | null {
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function balancedParseableFrom(s: string): string | null {
  let searchFrom = 0;
  for (let attempts = 0; attempts < MAX_BRACE_SCAN_ATTEMPTS; attempts++) {
    const offset = s.slice(searchFrom).search(/[{[]/);
    if (offset === -1) return null;
    const start = searchFrom + offset;
    const candidate = extractBalanced(s, start);
    if (candidate && isParseable(candidate)) return candidate;
    searchFrom = start + 1;
  }
  return null;
}

export function extractJsonFromModelOutput(raw: string): string {
  const trimmed = raw.trim();
  if (isParseable(trimmed)) return trimmed;

  for (const match of trimmed.matchAll(FENCE_RE)) {
    const inner = (match[1] ?? "").trim();
    if (!inner) continue;
    if (isParseable(inner)) return inner;
    const rescued = balancedParseableFrom(inner);
    if (rescued) return rescued;
  }

  const rescued = balancedParseableFrom(trimmed);
  if (rescued) return rescued;

  return trimmed;
}
