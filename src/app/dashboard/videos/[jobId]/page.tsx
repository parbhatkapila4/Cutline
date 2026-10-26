"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Check,
  ChevronLeft,
  Copy,
  Download,
  Ellipsis,
  Film,
  Link2,
  Lock,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Wand2,
  X,
} from "lucide-react";
import type {
  DashboardVideoDetail,
  DashboardVideoStatus,
  DashboardVideoVersion,
} from "@/app/api/dashboard/videos/[jobId]/route";
import { DeleteVideoDialog, type DeleteFailure } from "@/components/dashboard/DeleteVideoDialog";
import { VideoCardFrame } from "@/components/dashboard/VideoCardFrame";
import { BTN_PRIMARY, BTN_SECONDARY, BTN_SM, ICON_BTN } from "@/components/dashboard/video/buttons";
import { Composer, MoreIdeas, QuickEdits, UpgradeCard } from "@/components/dashboard/video/EditComposer";
import { RenderingFrame, UnavailableFrame } from "@/components/dashboard/video/RenderVisuals";
import { AiMessage, NoteBox, RunCard, Spinner, UserBubble, VersionCard } from "@/components/dashboard/video/Thread";
import { useRenderStatus, type RenderStatus } from "@/components/dashboard/video/useRenderStatus";
import { VideoPageSkeleton } from "@/components/dashboard/video/VideoPageSkeleton";
import { VideoPlayer, formatClock, type VideoDimensions } from "@/components/dashboard/video/VideoPlayer";
import { PIPELINE_STEPS } from "@/components/generate/constants";
import { absoluteVideoUrl } from "@/lib/dashboard/videoLink";
import {
  SHARE_LINKS_PLAN_NOTE,
  canShareLinks,
  isPlanId,
  isProPlan,
  videoRetentionHoursForPlan,
  type PlanId,
} from "@/lib/plans";
import { cn } from "@/lib/utils";
import { ASPECT_RATIOS } from "@/lib/validation/aspectRatio";

type Version = DashboardVideoVersion;

type ThreadNote = {
  key: number;
  afterCount: number;
  text: string;
  request?: string;
  retryFromId?: string;
};

const SHAPE_NAMES: Record<string, string> = {
  "16:9": "landscape",
  "9:16": "vertical",
  "1:1": "square",
  "4:5": "portrait",
  "3:2": "landscape",
  "21:9": "widescreen",
};

const SETTLE_ATTEMPTS = 6;
const SETTLE_RETRY_MS = 2000;

function ratioValue(label: string | undefined): number {
  const m = /^(\d+):(\d+)$/.exec(label ?? "");
  return m ? Number(m[1]) / Number(m[2]) : 16 / 9;
}

function ratioLabelFor(width: number, height: number): string {
  const r = width / height;
  return ASPECT_RATIOS.find((label) => Math.abs(ratioValue(label) - r) / r < 0.02) ?? `${width}:${height}`;
}

function madeAt(iso: string, today: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === today) return time;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}

function retentionLine(plan: PlanId | null): string {
  if (plan === null) return "Videos are kept for 24 hours on Free and 90 days on paid plans.";
  const hours = videoRetentionHoursForPlan(plan);
  const span = hours >= 48 && hours % 24 === 0 ? `${hours / 24} days` : `${hours} hours`;
  return plan === "free" ? `Free plan videos are kept for ${span}.` : `Videos on your plan are kept for ${span}.`;
}

function absoluteUrl(url: string): string {
  return absoluteVideoUrl(url, window.location.origin);
}

function replaceUrl(jobId: string) {
  window.history.replaceState(null, "", `/dashboard/videos/${encodeURIComponent(jobId)}`);
}

function latest<T>(items: T[], test: (item: T) => boolean): T | null {
  for (let i = items.length - 1; i >= 0; i--) if (test(items[i])) return items[i];
  return null;
}

const isEditable = (v: Version) => v.status === "completed" || v.status === "expired";

function initialSelection(data: DashboardVideoDetail): string {
  const index = data.versions.findIndex((v) => v.id === data.id);
  const own = data.versions[index];
  if (own && (isEditable(own) || index === 0)) return own.id;
  return latest(data.versions, (v) => v.status === "completed")?.id ?? data.id;
}

function editFailure(status: number, body: { error?: unknown; code?: unknown }): { text: string; retry: boolean } {
  const raw = typeof body.error === "string" ? body.error.trim() : "";
  if (status === 429) return { text: "Too many requests. Try again in a minute.", retry: true };
  if (body.code === "PLAN_REQUIRED") {
    return { text: "Editing is available on Professional and Enterprise plans.", retry: false };
  }
  if (status === 404) return { text: "This video can't be edited any more. It may have been deleted.", retry: false };
  if (status < 500 && raw) return { text: raw, retry: false };
  return { text: "The edit didn't start. Please try again.", retry: true };
}

const STATUS_BADGES: Record<DashboardVideoStatus, { label: string; className: string }> = {
  completed: { label: "Ready", className: "bg-[#3fd08f]/12 text-[#62dea6]" },
  processing: { label: "Rendering", className: "bg-[#f4b740]/11 text-[#ffd27a] [&>i]:animate-pulse" },
  expired: { label: "Expired", className: "bg-white/6 text-zinc-400" },
  failed: { label: "Didn't finish", className: "bg-[#f3958f]/10 text-[#f3958f]" },
};

function StatusBadge({ status }: { status: DashboardVideoStatus }) {
  const badge = STATUS_BADGES[status];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-[9px] text-xs font-medium",
        badge.className
      )}
    >
      <i
        aria-hidden
        className="size-1.5 rounded-full bg-current shadow-[0_0_0_3px_color-mix(in_srgb,currentColor_18%,transparent)]"
      />
      {badge.label}
    </span>
  );
}

function ProTag() {
  return (
    <span className="inline-flex h-[18px] items-center gap-1 rounded-[5px] bg-[#f4b740]/11 px-1.5 text-[10.5px] font-semibold tracking-[0.02em] text-[#ffd27a]">
      <Lock className="size-2.5" aria-hidden />
      Pro
    </span>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#070708] text-zinc-100">
      <header className="flex h-14 shrink-0 items-center border-b border-white/[0.065] px-2.5">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13.5px] font-medium text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Library
        </Link>
      </header>
      <main className="vd-canvas grid flex-1 place-items-center px-4 py-16">
        <div className="grid max-w-sm justify-items-center gap-2 text-center">
          <span className="mb-2 grid size-12 place-items-center rounded-2xl bg-white/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
            <Film className="size-5 text-zinc-400" aria-hidden />
          </span>
          <h1 className="text-lg font-semibold tracking-[-0.015em]">Video not found</h1>
          <p className="text-[13.5px] leading-relaxed text-zinc-500">
            It may have been deleted, or it belongs to a different account. Sign in with the account that made it, or
            head back to your library.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/dashboard" className={BTN_PRIMARY}>
              Back to my videos
            </Link>
            <Link href="/create" className={BTN_SECONDARY}>
              Create a video
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function liveCopy(live: RenderStatus | null, elapsed: string): { title: string; detail: string; step: number } {
  if (!live) return { title: "Starting…", detail: elapsed, step: 0 };
  if (live.phase === "queued") {
    return {
      title: live.workerOnline === false ? "Waiting for the renderer" : "Waiting to start",
      detail: live.queuePosition ? `Number ${live.queuePosition} in line · ${elapsed}` : `Starting soon · ${elapsed}`,
      step: 0,
    };
  }
  if (live.phase === "stalled") {
    return { title: "Still working on it", detail: "Taking longer than usual. Refresh later to check.", step: live.step };
  }
  if (live.phase === "done") return { title: "Finishing up…", detail: elapsed, step: PIPELINE_STEPS.length - 1 };
  return {
    title: `${PIPELINE_STEPS[live.step] ?? PIPELINE_STEPS[0]}…`,
    detail: `Step ${live.step + 1} of ${PIPELINE_STEPS.length} · ${elapsed}`,
    step: live.step,
  };
}

export default function DashboardVideoPage() {
  const params = useParams();
  const router = useRouter();
  const routeJobId = typeof params?.jobId === "string" ? params.jobId : "";

  const [detail, setDetail] = useState<DashboardVideoDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [dims, setDims] = useState<Record<string, VideoDimensions>>({});
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [notes, setNotes] = useState<ThreadNote[]>([]);
  const [showIdeas, setShowIdeas] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState<"link" | "prompt" | null>(null);
  const [cancel, setCancel] = useState<{ jobId: string; state: "sending" | "sent" | "failed" } | null>(null);
  const [deleting, setDeleting] = useState<{ pending: boolean; failure: DeleteFailure | null } | null>(null);
  const [flashUpsell, setFlashUpsell] = useState(false);
  const [now, setNow] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const upsellRef = useRef<HTMLDivElement>(null);

  const versions = detail?.versions ?? [];
  const selected = versions.find((v) => v.id === selectedId) ?? versions[versions.length - 1] ?? null;
  const selectedIndex = selected ? versions.indexOf(selected) : -1;
  const renderingId = latest(versions, (v) => v.status === "processing")?.id ?? null;
  const busy = renderingId !== null || sending !== null;
  const planKnown = plan !== null;
  const isPro = isProPlan(plan);
  const canShare = canShareLinks(plan);
  const editSource = selected && isEditable(selected) ? selected : latest(versions, isEditable);
  const latestReady = latest(versions, (v) => v.status === "completed");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((d: { plan?: string } | null) => {
        if (!cancelled) setPlan(d && typeof d.plan === "string" && isPlanId(d.plan) ? d.plan : "free");
      })
      .catch(() => {
        if (!cancelled) setPlan("free");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const alreadyShowing = useEffectEvent((jobId: string) => versions.some((v) => v.id === jobId));

  useEffect(() => {
    if (!routeJobId || alreadyShowing(routeJobId)) return;
    let cancelled = false;
    fetch(`/api/dashboard/videos/${encodeURIComponent(routeJobId)}`)
      .then((res) => (res.ok ? (res.json() as Promise<DashboardVideoDetail>) : null))
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setMissing(true);
          return;
        }
        setDetail(data);
        setSelectedId(initialSelection(data));
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [routeJobId]);

  const settleRender = async (jobId: string) => {
    for (let attempt = 0; attempt < SETTLE_ATTEMPTS; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, SETTLE_RETRY_MS));
      try {
        const res = await fetch(`/api/dashboard/videos/${encodeURIComponent(jobId)}`);
        if (res.status === 404) {
          setDetail((prev) => (prev ? { ...prev, versions: prev.versions.filter((v) => v.id !== jobId) } : prev));
          return;
        }
        if (!res.ok) continue;
        const data = (await res.json()) as DashboardVideoDetail;
        const settled = data.versions.find((v) => v.id === jobId);
        if (settled?.status === "processing" && attempt < SETTLE_ATTEMPTS - 1) continue;
        setDetail(data);
        if (settled?.status === "completed") {
          setSelectedId(jobId);
          replaceUrl(jobId);
        }
        return;
      } catch {
        continue;
      }
    }
  };

  const renderStatus = useRenderStatus(renderingId, (jobId) => void settleRender(jobId));

  useEffect(() => {
    if (!busy) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [busy]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!flashUpsell) return;
    const t = setTimeout(() => setFlashUpsell(false), 1400);
    return () => clearTimeout(t);
  }, [flashUpsell]);

  const threadSize = versions.length + notes.length + (sending ? 1 : 0);
  useEffect(() => {
    const el = logRef.current;
    if (!el || (threadSize <= 1 && !renderingId)) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [threadSize, renderingId]);

  if (!detail) {
    return !routeJobId || missing ? <NotFound /> : <VideoPageSkeleton />;
  }

  const title = detail.title || "Untitled video";
  const status = selected?.status ?? detail.status;
  const shapeDims = (selected && dims[selected.id]) ?? Object.values(dims)[0];
  const ratio = shapeDims ? shapeDims.width / shapeDims.height : ratioValue(detail.aspectRatio);
  const shapeLabel = shapeDims ? ratioLabelFor(shapeDims.width, shapeDims.height) : (detail.aspectRatio ?? "16:9");
  const shapeName = SHAPE_NAMES[shapeLabel];
  const lengthText = shapeDims?.duration ? formatClock(shapeDims.duration) : detail.duration !== "-" ? detail.duration : null;
  const spec = [shapeLabel, shapeDims ? `${shapeDims.width} × ${shapeDims.height}` : null, lengthText]
    .filter(Boolean)
    .join(" · ");
  const today = new Date().toDateString();
  const elapsedFor = (iso: string) => formatClock(now ? (now - Date.parse(iso)) / 1000 : 0);
  const recreateHref = `/create?prompt=${encodeURIComponent(detail.originalPrompt)}`;
  const cancelState = cancel && cancel.jobId === renderingId ? cancel.state : null;

  const flash = () => {
    setFlashUpsell(true);
    upsellRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const select = (jobId: string) => {
    setSelectedId(jobId);
    replaceUrl(jobId);
  };

  const copyText = async (text: string, what: "link" | "prompt") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {}
  };

  const prefill = (text: string) => {
    setDraft(text);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(text.length, text.length);
    });
  };

  const sendEdit = async (text: string, from: Version | null = editSource) => {
    const message = text.trim();
    if (!message || busy || !from) return;
    if (!isPro) {
      flash();
      return;
    }
    const afterCount = versions.length;
    setSending(message);
    setDraft("");
    setShowIdeas(false);
    if (textareaRef.current) textareaRef.current.style.height = "";
    try {
      const res = await fetch(`/api/dashboard/videos/${encodeURIComponent(from.id)}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        newJobId?: unknown;
        notice?: unknown;
        error?: unknown;
        code?: unknown;
      };
      if (!res.ok || typeof body.newJobId !== "string" || !body.newJobId) {
        const failure = editFailure(res.status, body);
        setNotes((prev) => [
          ...prev,
          {
            key: Date.now(),
            afterCount,
            request: message,
            text: failure.text,
            retryFromId: failure.retry ? from.id : undefined,
          },
        ]);
        if (body.code === "PLAN_REQUIRED") flash();
        return;
      }
      const created: Version = {
        id: body.newJobId,
        status: "processing",
        createdAt: new Date().toISOString(),
        editMessage: message,
        editFromId: from.id,
      };
      setDetail((prev) => (prev ? { ...prev, versions: [...prev.versions, created] } : prev));
      if (typeof body.notice === "string" && body.notice.trim()) {
        setNotes((prev) => [...prev, { key: Date.now(), afterCount: afterCount + 1, text: String(body.notice) }]);
      }
    } catch {
      setNotes((prev) => [
        ...prev,
        {
          key: Date.now(),
          afterCount,
          request: message,
          text: "The edit didn't start. Check your connection and try again.",
          retryFromId: from.id,
        },
      ]);
    } finally {
      setSending(null);
    }
  };

  const retryNote = (note: ThreadNote) => {
    const from = versions.find((v) => v.id === note.retryFromId) ?? null;
    if (!note.request || !from) return;
    setNotes((prev) => prev.filter((n) => n.key !== note.key));
    void sendEdit(note.request, from);
  };

  const cancelRender = async (jobId: string) => {
    setCancel({ jobId, state: "sending" });
    try {
      const res = await fetch(`/api/generate/${encodeURIComponent(jobId)}/cancel`, { method: "POST" });
      const body = (await res.json().catch(() => null)) as { cancelled?: unknown } | null;
      setCancel({ jobId, state: res.ok && body?.cancelled === true ? "sent" : "failed" });
    } catch {
      setCancel({ jobId, state: "failed" });
    }
  };

  const confirmDelete = async () => {
    if (!selected || deleting?.pending) return;
    const target = selected;
    setDeleting({ pending: true, failure: null });
    try {
      const res = await fetch(`/api/dashboard/videos/${encodeURIComponent(target.id)}`, { method: "DELETE" });
      const body = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (res.ok || res.status === 404) {
        const rest = versions.filter((v) => v.id !== target.id);
        if (rest.length === 0) {
          router.push("/dashboard");
          return;
        }
        const next = latest(rest, (v) => v.status === "completed") ?? rest[rest.length - 1];
        setDetail((prev) => (prev ? { ...prev, versions: rest } : prev));
        setDeleting(null);
        select(next.id);
        return;
      }
      setDeleting({
        pending: false,
        failure: {
          message: typeof body.error === "string" && body.error.trim() ? body.error : "Could not delete the video.",
          action: res.status === 401 ? "signin" : "retry",
        },
      });
    } catch {
      setDeleting({
        pending: false,
        failure: { message: "Could not delete the video. Check your connection and try again.", action: "retry" },
      });
    }
  };

  const versionNumber = (jobId: string | undefined) => versions.findIndex((v) => v.id === jobId) + 1;
  const watchingNumber =
    selected?.status === "completed" ? selectedIndex + 1 : latestReady ? versionNumber(latestReady.id) : 0;

  const versionMeta = (v: Version) =>
    [madeAt(v.createdAt, today), v.status === "expired" ? "Expired" : lengthText, shapeLabel].filter(Boolean).join(" · ");

  const thumb = (v: Version) => (
    <span
      className="relative block h-[54px] max-w-[96px] shrink-0 overflow-hidden rounded-lg bg-[#111] shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
      style={{ aspectRatio: String(ratio) }}
    >
      {v.status === "processing" ? (
        <span className="vd-shimmer absolute inset-0 bg-[#0d0c0b]" />
      ) : (
        <VideoCardFrame videoUrl={v.videoUrl} status={v.status} compact />
      )}
    </span>
  );

  const card = (v: Version, index: number) => (
    <VersionCard
      title={`Version ${index + 1}`}
      meta={versionMeta(v)}
      thumb={thumb(v)}
      selected={selected?.id === v.id}
      onSelect={() => select(v.id)}
    />
  );

  const cancelButton = (jobId: string) =>
    cancelState === "sent" ? (
      <span className="shrink-0 text-zinc-500">Stopping…</span>
    ) : (
      <button
        type="button"
        onClick={() => void cancelRender(jobId)}
        disabled={cancelState === "sending"}
        className="shrink-0 font-medium text-zinc-400 underline decoration-white/20 underline-offset-[3px] transition-colors hover:text-zinc-100 disabled:opacity-50"
      >
        {cancelState === "failed" ? "Cancel didn't go through. Retry" : "Cancel"}
      </button>
    );

  const latestEditable = latest(versions, isEditable);
  const canSuggest = planKnown && !busy && latestEditable !== null && (isPro || latestEditable.status === "completed");
  const suggestions = canSuggest ? (
    <>
      <p>
        {!isPro
          ? "Editing with AI is on Pro. These are the changes it can make:"
          : latestEditable?.status === "expired"
            ? "Or describe a change and I'll render a fresh version."
            : "Want a different take? Pick one, or tell me what to change."}
      </p>
      <div className="grid gap-2.5">
        <QuickEdits disabled={busy || !editSource} onPick={(text) => void sendEdit(text)} />
        {isPro ? (
          <MoreIdeas open={showIdeas} disabled={busy} onToggle={() => setShowIdeas((open) => !open)} onPick={prefill} />
        ) : null}
      </div>
    </>
  ) : null;

  const reply = (v: Version, index: number): ReactNode => {
    const n = index + 1;
    const only = versions.length === 1;
    if (v.status === "completed") {
      const shape = shapeName ? `, ${shapeName}${shapeDims ? ` at ${shapeDims.width} × ${shapeDims.height}` : ""}` : "";
      return (
        <>
          {index === 0 ? (
            <p>
              Here&apos;s {only ? "your video" : "version 1"}
              {shape}.
            </p>
          ) : (
            <p>
              <b>Version {n} is ready.</b>
            </p>
          )}
          {card(v, index)}
          {v.message ? <NoteBox>{v.message}</NoteBox> : null}
        </>
      );
    }
    if (v.status === "processing") {
      const live = liveCopy(renderStatus?.jobId === v.id ? renderStatus : null, elapsedFor(v.createdAt));
      return (
        <>
          {index === 0 ? (
            <p>
              <b>Making your video.</b> It&apos;s safe to leave this page; the finished video lands in your library.
            </p>
          ) : null}
          <RunCard
            title={index === 0 ? live.title : `Rendering version ${n}`}
            elapsed={elapsedFor(v.createdAt)}
            step={live.step}
            foot={
              cancelState === "sent"
                ? "Stopping after the current step."
                : watchingNumber > 0
                  ? `Usually 1–5 min. You can keep watching version ${watchingNumber}.`
                  : "Usually 1–5 min."
            }
            action={v.id === renderingId ? cancelButton(v.id) : null}
          />
        </>
      );
    }
    if (v.status === "expired") {
      return (
        <>
          <p>
            <b>{only ? "This video has expired." : `Version ${n} has expired.`}</b> {retentionLine(plan)}
            {index === 0 ? " Your prompt is saved, so you can make it again." : null}
          </p>
          {only ? null : card(v, index)}
          {index === 0 ? (
            <div className="flex flex-wrap gap-2">
              <Link href={recreateHref} className={cn(BTN_PRIMARY, BTN_SM)}>
                <RefreshCw aria-hidden />
                Recreate video
              </Link>
              <button
                type="button"
                onClick={() => void copyText(detail.originalPrompt, "prompt")}
                className={cn(BTN_SECONDARY, BTN_SM)}
              >
                {copied === "prompt" ? <Check aria-hidden /> : <Copy aria-hidden />}
                {copied === "prompt" ? "Copied" : "Copy prompt"}
              </button>
            </div>
          ) : null}
        </>
      );
    }
    const source = versions.find((x) => x.id === v.editFromId);
    const canRetry = index > 0 && isPro && !busy && v.editMessage && source && isEditable(source);
    return (
      <>
        <p>
          <b>{only ? "This video didn't finish." : `Version ${n} didn't finish.`}</b> {v.error}
        </p>
        {canRetry ? (
          <div>
            <button
              type="button"
              onClick={() => void sendEdit(v.editMessage ?? "", source)}
              className={cn(BTN_SECONDARY, BTN_SM)}
            >
              <RefreshCw aria-hidden />
              Try again
            </button>
          </div>
        ) : index === 0 ? (
          <div>
            <Link href={recreateHref} className={cn(BTN_PRIMARY, BTN_SM)}>
              <RefreshCw aria-hidden />
              Try again
            </Link>
          </div>
        ) : null}
      </>
    );
  };

  const thread: ReactNode[] = [<UserBubble key="prompt">{detail.originalPrompt || title}</UserBubble>];
  const lastIndex = versions.length - 1;
  versions.forEach((v, index) => {
    if (index > 0 && v.editMessage) {
      const parent = versionNumber(v.editFromId);
      thread.push(
        <UserBubble key={`ask-${v.id}`} caption={parent > 0 && parent !== index ? `Edited from version ${parent}` : undefined}>
          {v.editMessage}
        </UserBubble>
      );
    }
    const following = notes.filter((note) => note.afterCount === index + 1);
    const inline = index === lastIndex && following.length === 0 && !sending ? suggestions : null;
    thread.push(
      <AiMessage key={`reply-${v.id}`}>
        {reply(v, index)}
        {inline}
      </AiMessage>
    );
    for (const note of following) {
      if (note.request) thread.push(<UserBubble key={`note-ask-${note.key}`}>{note.request}</UserBubble>);
      thread.push(
        <AiMessage key={`note-${note.key}`}>
          <p>{note.text}</p>
          {note.retryFromId && note.request ? (
            <div>
              <button
                type="button"
                onClick={() => retryNote(note)}
                disabled={busy}
                className={cn(BTN_SECONDARY, BTN_SM)}
              >
                <RefreshCw aria-hidden />
                Try again
              </button>
            </div>
          ) : null}
        </AiMessage>
      );
    }
    if (index === lastIndex && following.length > 0 && !sending && suggestions) {
      thread.push(<AiMessage key="suggestions">{suggestions}</AiMessage>);
    }
  });
  if (sending) {
    thread.push(<UserBubble key="sending">{sending}</UserBubble>);
    thread.push(
      <AiMessage key="starting">
        <RunCard title="Starting the edit…" elapsed={formatClock(0)} step={0} foot="Reading your change." />
      </AiMessage>
    );
  }

  const renderingVersion = renderingId ? versions.find((v) => v.id === renderingId) : undefined;
  const composerPlaceholder =
    renderingVersion && renderingVersion === versions[0]
      ? "Edits open when the video is ready"
      : renderingVersion
        ? `Version ${versionNumber(renderingId ?? undefined)} is rendering…`
        : !editSource
          ? "Nothing to edit yet"
          : editSource.status === "expired"
            ? "Describe a change to render a fresh version…"
            : "Ask for a change…";
  const composerBusy = sending
    ? "Starting the edit…"
    : renderingVersion && renderingVersion !== versions[0]
      ? `Rendering version ${versionNumber(renderingId ?? undefined)}`
      : null;

  const previewMedia = (() => {
    if (!selected) return null;
    if (selected.status === "completed" && selected.videoUrl) {
      return (
        <VideoPlayer
          key={selected.id}
          src={selected.videoUrl}
          ratio={ratio}
          label={`${title}, version ${selectedIndex + 1}`}
          className="mx-auto w-[min(100%,calc(60svh*var(--ar)))] min-[900px]:w-[min(100cqw,calc(100cqh*var(--ar)))]"
          onDimensions={(d) => setDims((prev) => ({ ...prev, [selected.id]: d }))}
        />
      );
    }
    let inner: ReactNode;
    if (selected.status === "processing") {
      const live = liveCopy(renderStatus?.jobId === selected.id ? renderStatus : null, elapsedFor(selected.createdAt));
      inner = (
        <RenderingFrame
          step={live.step}
          title={live.title}
          detail={live.detail}
          footer={
            selectedIndex === 0
              ? ["Safe to leave this page", "Lands in your library"]
              : ["Usually 1–5 min", watchingNumber > 0 ? `Version ${watchingNumber} stays playable` : "Safe to leave this page"]
          }
        />
      );
    } else if (selected.status === "expired") {
      inner = (
        <UnavailableFrame
          kind="expired"
          title={versions.length > 1 ? `Version ${selectedIndex + 1} has expired` : "This video has expired"}
          body={`${retentionLine(plan)} Your prompt is saved, so you can make it again.`}
        />
      );
    } else {
      inner = (
        <UnavailableFrame
          kind="failed"
          title={versions.length > 1 ? `Version ${selectedIndex + 1} didn't finish` : "This video didn't finish"}
          body={selected.error ?? "Something went wrong. Please try again."}
        />
      );
    }
    return (
      <div
        className="relative mx-auto w-[min(100%,calc(60svh*var(--ar)))] overflow-hidden rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_2px_6px_rgba(0,0,0,0.4),0_40px_90px_-30px_rgba(0,0,0,0.9)] min-[900px]:w-[min(100cqw,calc(100cqh*var(--ar)))]"
        style={{ aspectRatio: String(ratio) }}
      >
        {inner}
      </div>
    );
  })();

  const selectedDownloadable = selected?.status === "completed" && selected.videoUrl;
  const failedEdit = selected?.status === "failed" && selectedIndex > 0;
  const unavailable = selected?.status === "expired" || (selected?.status === "failed" && !failedEdit);
  const retrySource = failedEdit ? versions.find((v) => v.id === selected?.editFromId) : undefined;
  const canRetrySelected =
    failedEdit && isPro && !busy && Boolean(selected?.editMessage) && retrySource !== undefined && isEditable(retrySource);

  return (
    <div className="flex min-h-dvh flex-col bg-[#070708] text-zinc-100 min-[900px]:h-dvh min-[900px]:min-h-0">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-1.5 border-b border-white/[0.065] bg-[#070708]/90 pl-2.5 pr-3.5 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2 text-[13.5px]">
          <Link
            href="/dashboard"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-100"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Library
          </Link>
          <span className="text-zinc-600 max-[899px]:hidden" aria-hidden>
            /
          </span>
          <h1 className="min-w-0 truncate px-1 font-[550] text-zinc-100 max-[899px]:hidden" title={title}>
            {title}
          </h1>
          <StatusBadge status={status} />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {status === "processing" && selected ? (
            <button
              type="button"
              onClick={() => void cancelRender(selected.id)}
              disabled={selected.id !== renderingId || cancelState === "sending" || cancelState === "sent"}
              className={cn(BTN_SECONDARY, "max-[899px]:hidden")}
            >
              <X aria-hidden />
              {cancelState === "sent" ? "Stopping…" : "Cancel render"}
            </button>
          ) : failedEdit ? null : unavailable ? (
            <button
              type="button"
              onClick={() => void copyText(detail.originalPrompt, "prompt")}
              className={cn(BTN_SECONDARY, "max-[899px]:hidden")}
            >
              {copied === "prompt" ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied === "prompt" ? "Copied" : "Copy prompt"}
            </button>
          ) : canShare ? (
            <button
              type="button"
              onClick={() => selected?.videoUrl && void copyText(absoluteUrl(selected.videoUrl), "link")}
              className={cn(BTN_SECONDARY, "max-[899px]:hidden")}
            >
              {copied === "link" ? <Check className="text-[#62dea6]" aria-hidden /> : <Link2 aria-hidden />}
              {copied === "link" ? "Link copied" : "Copy link"}
            </button>
          ) : planKnown ? (
            <Link
              href="/pricing"
              title={SHARE_LINKS_PLAN_NOTE}
              className={cn(BTN_SECONDARY, "max-[899px]:hidden")}
            >
              <Link2 aria-hidden />
              Copy link
              <ProTag />
            </Link>
          ) : null}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={ICON_BTN}
            >
              <Ellipsis aria-hidden />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+6px)] z-40 w-[220px] rounded-xl bg-[#16161a] p-[5px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_24px_60px_rgba(0,0,0,0.6)] [&_[role=menuitem]]:flex [&_[role=menuitem]]:w-full [&_[role=menuitem]]:items-center [&_[role=menuitem]]:gap-2.5 [&_[role=menuitem]]:rounded-lg [&_[role=menuitem]]:px-2.5 [&_[role=menuitem]]:py-2 [&_[role=menuitem]]:text-left [&_[role=menuitem]]:text-[13px] [&_[role=menuitem]]:text-zinc-100 [&_[role=menuitem]:hover]:bg-white/6 [&_[role=menuitem]_svg]:size-4 [&_[role=menuitem]_svg]:text-zinc-500"
              >
                {selectedDownloadable && canShare ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="min-[900px]:hidden!"
                    onClick={() => {
                      setMenuOpen(false);
                      if (selected?.videoUrl) void copyText(absoluteUrl(selected.videoUrl), "link");
                    }}
                  >
                    <Link2 aria-hidden />
                    Copy link
                  </button>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    void copyText(detail.originalPrompt, "prompt");
                  }}
                >
                  <Copy aria-hidden />
                  Copy prompt
                </button>
                <Link role="menuitem" href={recreateHref} onClick={() => setMenuOpen(false)}>
                  <RefreshCw aria-hidden />
                  Recreate from prompt
                </Link>
                <hr className="mx-1 my-[5px] h-px border-0 bg-white/[0.065]" />
                <button
                  type="button"
                  role="menuitem"
                  className="text-[#f3958f]! [&_svg]:text-[#f3958f]!"
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleting({ pending: false, failure: null });
                  }}
                >
                  <Trash2 aria-hidden />
                  {versions.length > 1 ? `Delete version ${selectedIndex + 1}` : "Delete video"}
                </button>
              </div>
            ) : null}
          </div>
          {canRetrySelected && selected ? (
            <button
              type="button"
              onClick={() => void sendEdit(selected.editMessage ?? "", retrySource)}
              className={BTN_PRIMARY}
            >
              <RefreshCw aria-hidden />
              Try again
            </button>
          ) : unavailable && selected?.status === "failed" ? (
            <Link href={recreateHref} className={BTN_PRIMARY}>
              <RefreshCw aria-hidden />
              Try again
            </Link>
          ) : unavailable ? (
            <Link href={recreateHref} className={BTN_PRIMARY}>
              <RefreshCw aria-hidden />
              <span className="max-[899px]:hidden">Recreate video</span>
              <span className="min-[900px]:hidden">Recreate</span>
            </Link>
          ) : selectedDownloadable ? (
            <a
              href={`/api/generate/${encodeURIComponent(selected.id)}/download`}
              download={`cutline-${selected.id}.mp4`}
              title="Download MP4"
              className={BTN_PRIMARY}
            >
              <Download aria-hidden />
              Download
            </a>
          ) : (
            <button type="button" disabled className={BTN_PRIMARY}>
              <Download aria-hidden />
              Download
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col min-[900px]:grid min-[900px]:min-h-0 min-[900px]:grid-cols-[400px_minmax(0,1fr)] min-[1200px]:grid-cols-[440px_minmax(0,1fr)] min-[1700px]:grid-cols-[480px_minmax(0,1fr)]">
        <aside
          aria-label="Edit with AI"
          className="order-2 flex flex-col border-t border-white/[0.065] bg-[#0b0b0d] min-[900px]:order-1 min-[900px]:min-h-0 min-[900px]:border-r min-[900px]:border-t-0"
        >
          <div className="flex h-[46px] shrink-0 items-center gap-2 border-b border-white/[0.065] px-[18px] text-[13px] font-semibold">
            <Wand2 className="size-[15px] text-[#f4b740]" aria-hidden />
            Edit with AI
            {planKnown && !isPro ? <ProTag /> : null}
          </div>
          <div
            ref={logRef}
            className="flex flex-col gap-[18px] px-[18px] pb-6 pt-5 [scrollbar-color:#26262b_transparent] [scrollbar-width:thin] min-[900px]:min-h-0 min-[900px]:flex-1 min-[900px]:overflow-y-auto"
          >
            {thread}
          </div>
          <div
            className={cn(
              "shrink-0 border-t border-white/[0.065] bg-[#0b0b0d] px-3.5 pb-3.5 pt-3",
              (!planKnown || isPro) && "sticky bottom-0 z-[5]"
            )}
          >
            {planKnown && !isPro ? (
              <div ref={upsellRef}>
                <UpgradeCard flash={flashUpsell} />
              </div>
            ) : (
              <Composer
                value={draft}
                onChange={setDraft}
                onSubmit={() => void sendEdit(draft)}
                disabled={!planKnown || busy || !editSource}
                busyLabel={composerBusy}
                placeholder={composerPlaceholder}
                textareaRef={textareaRef}
              />
            )}
          </div>
        </aside>

        <section
          aria-label="Preview"
          className="vd-canvas order-1 grid gap-4 px-3.5 pb-4 pt-3 min-[900px]:order-2 min-[900px]:min-h-0 min-[900px]:grid-rows-[auto_minmax(0,1fr)_auto] min-[900px]:px-8 min-[900px]:pb-[22px] min-[900px]:pt-4 min-[1700px]:px-14 min-[1700px]:pb-7 min-[1700px]:pt-5"
          style={{ "--ar": ratio } as CSSProperties}
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Versions"
              className="inline-flex min-w-0 max-w-full gap-0.5 overflow-x-auto rounded-[10px] bg-[#0f0f12] p-[3px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.065)] [scrollbar-width:none]"
            >
              {versions.map((v, index) => {
                const on = selected?.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={on}
                    aria-label={`Version ${index + 1}${v.status === "processing" ? ", rendering" : v.status === "expired" ? ", expired" : v.status === "failed" ? ", didn't finish" : ""}`}
                    onClick={() => select(v.id)}
                    className={cn(
                      "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[7px] px-[11px] text-xs font-medium transition-colors",
                      on
                        ? "bg-[#1f1f24] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_3px_rgba(0,0,0,0.5)]"
                        : "text-zinc-500 hover:text-zinc-100",
                      v.status === "expired" && !on && "text-zinc-600"
                    )}
                  >
                    {v.status === "processing" ? <Spinner className="size-[11px] border-[1.5px]" /> : null}
                    {v.status === "failed" ? <TriangleAlert className="size-3 text-[#f3958f]" aria-hidden /> : null}
                    {versions.length === 1 ? `Version ${index + 1}` : `V${index + 1}`}
                  </button>
                );
              })}
            </div>
            <span className="shrink-0 font-mono text-xs font-medium text-zinc-600 max-[899px]:hidden">{spec}</span>
          </div>
          <div className="relative grid min-h-0 place-items-center min-[900px]:[container-type:size]">{previewMedia}</div>
          {versions.length > 1 && selected ? (
            <p className="flex min-w-0 items-center justify-center gap-2 text-[13px] text-zinc-500">
              <b className="shrink-0 font-[550] text-zinc-100">Version {selectedIndex + 1}</b>
              <span className="min-w-0 truncate">
                · {selected.editMessage ? `“${selected.editMessage}”` : "Original"}
              </span>
              {latestReady?.id === selected.id ? (
                <span className="inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full bg-[#3fd08f]/12 pl-2 pr-[9px] text-xs font-medium text-[#62dea6]">
                  <i aria-hidden className="size-1.5 rounded-full bg-current" />
                  Latest
                </span>
              ) : null}
            </p>
          ) : null}
        </section>
      </div>

      {deleting && selected ? (
        <DeleteVideoDialog
          video={{
            id: selected.id,
            title: versions.length > 1 ? `${title}, version ${selectedIndex + 1}` : title,
            prompt: detail.originalPrompt,
            date: madeAt(selected.createdAt, today),
            duration: lengthText ?? "-",
            status: selected.status,
            videoUrl: selected.videoUrl,
            timestamp: Date.parse(selected.createdAt) || 0,
          }}
          pending={deleting.pending}
          failure={deleting.failure}
          onCancel={() => {
            if (!deleting.pending) setDeleting(null);
          }}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </div>
  );
}
