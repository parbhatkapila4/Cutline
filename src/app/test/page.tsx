"use client";

import type {
  AbstractShapesParams,
  GradientParams,
  Intent,
  MotionSpec,
  NarrativePlan,
  Script,
  ShotList,
  SolidParams,
  SubtitleTrack,
  VisualSpec,
} from "@/lib/types";
import Link from "next/link";
import { useCallback, useState } from "react";

function StageLoading({ message }: { message: string }) {
  return (
    <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600"
        aria-hidden
      />
      {message}
    </div>
  );
}

function StageError({ message }: { message: string }) {
  return (
    <div
      className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      {message}
    </div>
  );
}

export default function TestIntentPage() {
  const [input, setInput] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [plan, setPlan] = useState<NarrativePlan | null>(null);
  const [shotList, setShotList] = useState<ShotList | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [subtitleTrack, setSubtitleTrack] = useState<SubtitleTrack | null>(null);
  const [motionSpec, setMotionSpec] = useState<MotionSpec | null>(null);
  const [visualSpec, setVisualSpec] = useState<VisualSpec | null>(null);
  const [ttsAudioBase64, setTtsAudioBase64] = useState<string | null>(null);
  const [ttsAudioFormat, setTtsAudioFormat] = useState<"wav" | "mp3">("wav");
  const [renderVideoUrl, setRenderVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [shotsLoading, setShotsLoading] = useState(false);
  const [motionLoading, setMotionLoading] = useState(false);
  const [visualsLoading, setVisualsLoading] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [subtitlesLoading, setSubtitlesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [shotsError, setShotsError] = useState<string | null>(null);
  const [motionError, setMotionError] = useState<string | null>(null);
  const [visualsError, setVisualsError] = useState<string | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [subtitlesError, setSubtitlesError] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [renderLoading, setRenderLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setError(null);
    setPlanError(null);
    setShotsError(null);
    setScriptError(null);
    setSubtitlesError(null);
    setIntent(null);
    setPlan(null);
    setShotList(null);
    setScript(null);
    setSubtitleTrack(null);
    setMotionSpec(null);
    setVisualSpec(null);
    setTtsAudioBase64(null);
    setTtsAudioFormat("wav");
    setRenderVideoUrl(null);
    setLoading(true);
    try {
      const res = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to analyze. Check your API key and try again.");
        return;
      }
      setIntent(data as Intent);
    } catch {
      setError("Failed to analyze. Check your API key and try again.");
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handlePlanNarrative = useCallback(async () => {
    if (!intent) return;
    setPlanError(null);
    setShotsError(null);
    setScriptError(null);
    setSubtitlesError(null);
    setPlan(null);
    setShotList(null);
    setScript(null);
    setSubtitleTrack(null);
    setMotionSpec(null);
    setVisualSpec(null);
    setTtsAudioBase64(null);
    setTtsAudioFormat("wav");
    setRenderVideoUrl(null);
    setPlanLoading(true);
    try {
      const res = await fetch("/api/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlanError(data.error ?? "Failed to plan narrative. Try again.");
        return;
      }
      setPlan(data as NarrativePlan);
    } catch {
      setPlanError("Failed to plan narrative. Try again.");
    } finally {
      setPlanLoading(false);
    }
  }, [intent]);

  const handlePlanShots = useCallback(async () => {
    if (!intent || !plan) return;
    setShotsError(null);
    setScriptError(null);
    setSubtitlesError(null);
    setMotionError(null);
    setShotList(null);
    setScript(null);
    setSubtitleTrack(null);
    setMotionSpec(null);
    setVisualSpec(null);
    setTtsAudioBase64(null);
    setTtsAudioFormat("wav");
    setRenderVideoUrl(null);
    setShotsLoading(true);
    try {
      const res = await fetch("/api/shots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShotsError(data.error ?? "Failed to plan shots. Try again.");
        return;
      }
      setShotList(data as ShotList);
    } catch {
      setShotsError("Failed to plan shots. Try again.");
    } finally {
      setShotsLoading(false);
    }
  }, [intent, plan]);

  const handleComposeMotion = useCallback(async () => {
    if (!shotList) return;
    setMotionError(null);
    setMotionSpec(null);
    setMotionLoading(true);
    try {
      const res = await fetch("/api/motion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotList }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMotionError(data.error ?? "Failed to compose motion. Try again.");
        return;
      }
      setMotionSpec(data as MotionSpec);
    } catch {
      setMotionError("Failed to compose motion. Try again.");
    } finally {
      setMotionLoading(false);
    }
  }, [shotList]);

  const handleComposeVisuals = useCallback(async () => {
    if (!intent || !shotList) return;
    setVisualsError(null);
    setVisualSpec(null);
    setVisualsLoading(true);
    try {
      const res = await fetch("/api/visuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, shotList }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVisualsError(data.error ?? "Failed to compose visuals. Try again.");
        return;
      }
      setVisualSpec(data as VisualSpec);
    } catch {
      setVisualsError("Failed to compose visuals. Try again.");
    } finally {
      setVisualsLoading(false);
    }
  }, [intent, shotList]);

  const handleGenerateScript = useCallback(async () => {
    if (!intent || !plan || !shotList) return;
    setScriptError(null);
    setSubtitlesError(null);
    setScript(null);
    setSubtitleTrack(null);
    setScriptLoading(true);
    try {
      const res = await fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, plan, shotList }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScriptError(data.error ?? "Failed to generate script. Try again.");
        return;
      }
      setScript(data as Script);
    } catch {
      setScriptError("Failed to generate script. Try again.");
    } finally {
      setScriptLoading(false);
    }
  }, [intent, plan, shotList]);

  const handleGenerateSubtitles = useCallback(async () => {
    if (!script || !shotList) return;
    setSubtitlesError(null);
    setSubtitleTrack(null);
    setSubtitlesLoading(true);
    try {
      const res = await fetch("/api/subtitles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, shotList }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubtitlesError(data.error ?? "Failed to generate subtitles. Try again.");
        return;
      }
      setSubtitleTrack(data as SubtitleTrack);
    } catch {
      setSubtitlesError("Failed to generate subtitles. Try again.");
    } finally {
      setSubtitlesLoading(false);
    }
  }, [script, shotList]);

  const handleGenerateTTS = useCallback(async () => {
    if (!script || !shotList) return;
    setTtsError(null);
    setTtsAudioBase64(null);
    setTtsAudioFormat("wav");
    setRenderVideoUrl(null);
    setTtsLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, shotList }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTtsError(data.error ?? "Failed to generate TTS. Try again.");
        return;
      }
      if (typeof data.audioBase64 === "string") {
        setTtsAudioBase64(data.audioBase64);
        setTtsAudioFormat(data.audioFormat === "mp3" ? "mp3" : "wav");
      } else {
        setTtsError("TTS returned no audio.");
      }
    } catch {
      setTtsError("Failed to generate TTS. Try again.");
    } finally {
      setTtsLoading(false);
    }
  }, [script, shotList]);

  const handleRenderVideo = useCallback(async () => {
    if (
      !intent ||
      !plan ||
      !shotList ||
      !script ||
      !subtitleTrack ||
      !motionSpec ||
      !visualSpec
    ) {
      return;
    }
    setRenderError(null);
    setRenderVideoUrl(null);
    setRenderLoading(true);
    try {
      const sourceRes = await fetch("/api/images/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, shotList, script }),
      });
      const imageSpecData = await sourceRes.json();
      if (!sourceRes.ok) {
        setRenderError(imageSpecData.error ?? "Image sourcing failed. Set UNSPLASH_ACCESS_KEY or PEXELS_API_KEY and OPENAI_API_KEY in .env.local.");
        return;
      }
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          narrativePlan: plan,
          shotList,
          script,
          subtitleTrack,
          motionSpec,
          visualSpec,
          imageSpec: imageSpecData,
          audioBase64: ttsAudioBase64 ?? undefined,
          audioFormat: ttsAudioFormat,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRenderError(data.error ?? "Render failed. Try again.");
        return;
      }
      if (typeof data.videoUrl === "string") {
        setRenderVideoUrl(data.videoUrl);
      } else {
        setRenderError("Render returned no video URL.");
      }
    } catch {
      setRenderError("Render request failed. Try again.");
    } finally {
      setRenderLoading(false);
    }
  }, [
    intent,
    plan,
    shotList,
    script,
    subtitleTrack,
    motionSpec,
    visualSpec,
    ttsAudioBase64,
    ttsAudioFormat,
  ]);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <Link href="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
            ← CUTLINE
          </Link>
          <span className="ml-4 text-sm text-zinc-400">Stage 1-5: Intent → Narrative → Shots → Script → Subtitles</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          Intent interpretation
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          One sentence in → intent → narrative → shots → script → subtitles → TTS → render video.
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          <label htmlFor="intent-input" className="sr-only">
            Sentence of intent
          </label>
          <textarea
            id="intent-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Explain why coffee makes you feel awake in 30 seconds"
            rows={3}
            disabled={loading}
            className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="mt-3 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </form>

        {loading && <StageLoading message="Analyzing…" />}

        {error && <StageError message={error} />}

        {intent && !loading && (
          <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
            <h2 className="text-sm font-medium text-zinc-500">Interpreted intent</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-zinc-500">Raw input</dt>
                <dd className="mt-0.5 font-medium text-zinc-900">{intent.rawInput}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Audience</dt>
                <dd className="mt-0.5 font-medium text-zinc-900">{intent.audience}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Goal</dt>
                <dd className="mt-0.5 font-medium text-zinc-900">{intent.goal}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Tone</dt>
                <dd className="mt-0.5 font-medium text-zinc-900">{intent.tone}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Complexity</dt>
                <dd className="mt-0.5 font-medium text-zinc-900">{intent.complexity}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Duration</dt>
                <dd className="mt-0.5 font-medium text-zinc-900">
                  {intent.durationSeconds} seconds
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={handlePlanNarrative}
              disabled={planLoading}
              className="mt-4 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {planLoading ? "Planning…" : "Plan narrative"}
            </button>
          </div>
        )}

        {planLoading && <StageLoading message="Planning narrative…" />}

        {planError && <StageError message={planError} />}

        {plan && !planLoading && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
            <h2 className="text-sm font-medium text-zinc-500">Narrative plan</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-zinc-500">Arc</dt>
                <dd className="mt-0.5 font-medium text-zinc-900">{plan.arc}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Rationale</dt>
                <dd className="mt-0.5 font-medium text-zinc-900">{plan.rationale}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Total duration</dt>
                <dd className="mt-0.5 font-medium text-zinc-900">
                  {plan.totalDurationSeconds} seconds
                </dd>
              </div>
            </dl>
            <h3 className="mt-4 text-sm font-medium text-zinc-500">Beats</h3>
            <ul className="mt-2 space-y-2">
              {plan.beats.map((beat) => (
                <li
                  key={beat.id}
                  className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="font-medium text-zinc-900">{beat.id}</span>
                  <span className="text-zinc-500"> · {beat.purpose}</span>
                  <span className="text-zinc-500">
                    {" "}
                    · {beat.durationSeconds}s · {beat.pacing}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handlePlanShots}
              disabled={shotsLoading}
              className="mt-4 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {shotsLoading ? "Planning shots…" : "Plan shots"}
            </button>
          </div>
        )}

        {shotsLoading && <StageLoading message="Planning shots…" />}

        {shotsError && <StageError message={shotsError} />}

        {shotList && !shotsLoading && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
            <h2 className="text-sm font-medium text-zinc-500">Shot list</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {shotList.shots.length} shots · {shotList.totalDurationSeconds}s total
            </p>
            <ul className="mt-4 space-y-2">
              {shotList.shots.map((shot) => (
                <li
                  key={shot.id}
                  className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="font-medium text-zinc-900">{shot.id}</span>
                  <span className="text-zinc-500"> · {shot.beatId}</span>
                  <span className="text-zinc-500"> · {shot.durationSeconds}s</span>
                  <span className="text-zinc-500"> · {shot.purpose}</span>
                  <span className="text-zinc-500"> · {shot.motionType}</span>
                  <span className="text-zinc-500"> · {shot.emotionalIntent}</span>
                  <span className="text-zinc-500"> · density {shot.textDensity}</span>
                  <span className="text-zinc-400"> · #{shot.order}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleComposeMotion}
              disabled={motionLoading}
              className="mt-4 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {motionLoading ? "Composing…" : "Compose motion"}
            </button>
            <button
              type="button"
              onClick={handleComposeVisuals}
              disabled={visualsLoading}
              className="mt-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 sm:mt-2"
            >
              {visualsLoading ? "Composing…" : "Compose visuals"}
            </button>
            <button
              type="button"
              onClick={handleGenerateScript}
              disabled={scriptLoading}
              className="mt-2 ml-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 sm:ml-0 sm:mt-2"
            >
              {scriptLoading ? "Generating script…" : "Generate script"}
            </button>
          </div>
        )}

        {visualsLoading && <StageLoading message="Composing visuals…" />}

        {visualsError && <StageError message={visualsError} />}

        {visualSpec && !visualsLoading && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
            <h2 className="text-sm font-medium text-zinc-500">Visual spec</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {visualSpec.entries.length} entries (zero-asset layer; consumed by Remotion)
            </p>
            <ul className="mt-4 space-y-2">
              {visualSpec.entries.map((entry) => (
                <li
                  key={entry.shotId}
                  className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="font-medium text-zinc-900">{entry.shotId}</span>
                  <span className="text-zinc-500"> · {entry.backgroundType}</span>
                  <span className="text-zinc-400"> · #{entry.order}</span>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {entry.backgroundType === "gradient" && (() => {
                      const p = entry.params as GradientParams;
                      return (
                        <>
                          <span
                            className="h-5 w-8 rounded border border-zinc-200"
                            style={{ backgroundColor: p.color1 }}
                            title={p.color1}
                          />
                          <span
                            className="h-5 w-8 rounded border border-zinc-200"
                            style={{ backgroundColor: p.color2 }}
                            title={p.color2}
                          />
                          <span className="text-zinc-500">{p.angle}°</span>
                        </>
                      );
                    })()}
                    {entry.backgroundType === "solid" && (() => {
                      const p = entry.params as SolidParams;
                      return (
                        <span
                          className="h-5 w-8 rounded border border-zinc-200"
                          style={{ backgroundColor: p.color }}
                          title={p.color}
                        />
                      );
                    })()}
                    {entry.backgroundType === "abstract-shapes" && (() => {
                      const p = entry.params as AbstractShapesParams;
                      return (
                        <>
                          <span
                            className="h-5 w-8 rounded border border-zinc-200"
                            style={{ backgroundColor: p.baseColor }}
                            title={p.baseColor}
                          />
                          <span
                            className="h-5 w-8 rounded border border-zinc-200"
                            style={{ backgroundColor: p.accentColor }}
                            title={p.accentColor}
                          />
                          <span className="text-zinc-500">{p.shapeCount} shapes</span>
                        </>
                      );
                    })()}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {motionLoading && <StageLoading message="Composing motion…" />}

        {motionError && <StageError message={motionError} />}

        {motionSpec && !motionLoading && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
            <h2 className="text-sm font-medium text-zinc-500">Motion spec</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {motionSpec.entries.length} entries (consumed by Remotion in rendering)
            </p>
            <ul className="mt-4 space-y-2">
              {motionSpec.entries.map((entry) => (
                <li
                  key={entry.shotId}
                  className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="font-medium text-zinc-900">{entry.shotId}</span>
                  <span className="text-zinc-500"> · {entry.motionType}</span>
                  <span className="text-zinc-500"> · {entry.durationSeconds}s</span>
                  {Object.keys(entry.params).length > 0 && (
                    <span className="ml-2 text-zinc-500">
                      · {JSON.stringify(entry.params)}
                    </span>
                  )}
                  <span className="text-zinc-400"> · #{entry.order}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {scriptLoading && <StageLoading message="Generating script…" />}

        {scriptError && <StageError message={scriptError} />}

        {script && !scriptLoading && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
            <h2 className="text-sm font-medium text-zinc-500">Script</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {script.entries.length} entries (one per shot)
            </p>
            <ul className="mt-4 space-y-2">
              {script.entries.map((entry) => (
                <li
                  key={entry.shotId}
                  className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="font-medium text-zinc-900">{entry.shotId}</span>
                  <span className="text-zinc-400"> · #{entry.order}</span>
                  <span className="block mt-1 text-zinc-700">
                    {entry.text ?? "(silence)"}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleGenerateSubtitles}
              disabled={subtitlesLoading}
              className="mt-4 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {subtitlesLoading ? "Generating subtitles…" : "Generate subtitles"}
            </button>
          </div>
        )}

        {subtitlesLoading && <StageLoading message="Generating subtitles…" />}

        {subtitlesError && <StageError message={subtitlesError} />}

        {subtitleTrack && !subtitlesLoading && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
            <h2 className="text-sm font-medium text-zinc-500">Subtitle track</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {subtitleTrack.chunks.length} chunks (phrase-boundary, estimated timing)
            </p>
            <ul className="mt-4 space-y-2">
              {subtitleTrack.chunks.map((chunk, i) => (
                <li
                  key={`${chunk.shotId}-${i}`}
                  className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="font-medium text-zinc-900">{chunk.text}</span>
                  <span className="ml-2 text-zinc-500">
                    {chunk.startMs}ms - {chunk.endMs}ms
                  </span>
                  <span className="ml-2 text-zinc-400">· {chunk.shotId}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleGenerateTTS}
              disabled={ttsLoading}
              className="mt-4 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {ttsLoading ? "Generating TTS…" : "Generate TTS"}
            </button>
            <button
              type="button"
              onClick={handleRenderVideo}
              disabled={
                renderLoading ||
                !intent ||
                !plan ||
                !shotList ||
                !script ||
                !subtitleTrack ||
                !motionSpec ||
                !visualSpec
              }
              className="mt-2 ml-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 sm:ml-0 sm:mt-2"
            >
              {renderLoading ? "Rendering…" : "Render video"}
            </button>
          </div>
        )}

        {ttsLoading && <StageLoading message="Generating TTS…" />}

        {ttsError && <StageError message={ttsError} />}

        {ttsAudioBase64 && !ttsLoading && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-sm text-zinc-600">TTS audio ready. Use &quot;Render video&quot; to produce MP4.</p>
          </div>
        )}

        {renderLoading && <StageLoading message="Rendering… this may take a minute." />}

        {renderError && <StageError message={renderError} />}

        {renderVideoUrl && !renderLoading && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
            <h2 className="text-sm font-medium text-zinc-500">Rendered video</h2>
            <video
              src={renderVideoUrl}
              controls
              className="mt-4 w-full max-w-2xl rounded-lg border border-zinc-200"
            />
            <a
              href={renderVideoUrl}
              download
              className="mt-4 inline-block text-sm font-medium text-zinc-700 underline hover:text-zinc-900"
            >
              Download MP4
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
