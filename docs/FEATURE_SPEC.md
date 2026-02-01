# CUTLINE — Feature & Functionality Spec

Source of truth for product behavior, system responsibilities, and implementation scope. Internal use.

---

## 1. Core Principle

CUTLINE takes one sentence of user intent and produces a finished short video. The user provides no assets, no script, and no configuration. The system owns all creative and editorial decisions: what the video says, how it’s structured, what each shot is, how long it holds, and how it’s captioned.

The system behaves like a director and an editor. It does not fill templates or stitch pre-made clips. It reasons about narrative, pacing, and motion from the intent alone and outputs a single, coherent video.

---

## 2. User Experience

### Input

- **One sentence of intent.** Free-form natural language describing what the user wants the video to accomplish (e.g. “A 60-second explainer on how solar panels work,” “A product teaser for our new API”).
- **No uploads.** No scripts, images, B-roll, logos, or other assets.
- **No configuration.** No duration picker, style selector, or format options at MVP. The system infers or decides these.

### Output

- **One finished short video.** Ready to download or share. Includes picture, pacing, and subtitles. Duration is determined by the system based on intent and narrative needs.

---

## 3. Core Functional Capabilities (MVP)

### Intent Understanding

The system parses the user’s single sentence to extract: topic, purpose (e.g. explainer vs. teaser), implied audience, and any constraints (e.g. “60-second”) if stated. Output is a structured representation of intent that downstream modules consume. Ambiguity is resolved by the system, not by asking the user.

### Narrative Planning

From the structured intent, the system produces a narrative plan: what the video will say, in what order, and with what emphasis. This includes beat structure, key messages, and tone. No user-facing storyboard; this is an internal representation that drives shot and script decisions.

### Shot-Level Reasoning

For each narrative beat, the system decides: what the shot represents (e.g. “concept,” “example,” “transition”), how long it holds, and how it relates to the previous and next shots. Shot-level reasoning respects pacing (e.g. faster cuts for energy, longer holds for explanation) and maintains continuity. No templates; each shot is chosen for this video.

### Script Generation

The system generates spoken or on-screen copy that matches the narrative plan and fits the chosen shot structure. Script is aligned to shot boundaries so that timing and wording can be passed to subtitle and rendering modules. Voice or text-only is an implementation choice; the spec assumes the system produces a script that can be voiced or displayed.

### Subtitle Intelligence

Subtitles are generated from the script and edited for readability and rhythm: line breaks, display duration, and optional simplification for fast reading. They are paced to the edit, not dumped word-for-word. The system owns subtitle placement and timing.

### Motion Composition

The system decides how visual content is composed and animated within each shot (e.g. layout, motion type, emphasis). “Motion” here means the movement and composition of on-screen elements, not live-action capture. Asset strategy (see below) determines what those elements are; motion composition determines how they behave in the timeline.

### Asset Strategy

The system decides what visual and audio assets are needed to realize the narrative and shot plan (e.g. stock footage, illustrations, text cards, music, SFX). In MVP, “asset” may mean: selected from a licensed pool, generated, or abstract placeholders. The system does not accept user uploads; it selects or generates all assets required for the edit.

### Video Rendering

The final stage takes the locked narrative plan, shot list, script, subtitles, motion decisions, and resolved assets and produces a single video file. Output format and resolution are fixed at MVP (e.g. one standard format). Rendering is deterministic given the same inputs and system version.

---

## 4. System Characteristics

### Determinism

For the same intent string and same system version, the system aims to produce the same output. No “surprise me” mode at MVP. Determinism simplifies debugging, quality control, and user trust. Any randomness (e.g. in asset selection) must be seedable or eliminated for MVP.

### Repeatability

Re-running with the same intent should yield the same video. If the system or data changes, versioning and release notes should make it clear what might change. Repeatability is a product guarantee, not best-effort.

### Explainability

The system must be able to expose, for internal or power-user use: what intent was inferred, what narrative plan was chosen, what shots were selected and why, and what assets were used. This does not require a full UI at MVP; it means the pipeline produces interpretable intermediate outputs (e.g. structured logs, JSON artifacts) so that behavior can be inspected and improved.

---

## 5. Explicit Non-Goals (What CUTLINE Does NOT Do)

- **User-provided assets.** No uploads of script, images, video, or audio. The system is input-complete from one sentence.
- **Template-based generation.** No “pick a template, fill the blanks.” Every video is directed from intent.
- **User-controlled creative knobs at MVP.** No duration slider, style picker, or “tone” selector. The system infers or decides.
- **Collaborative or multi-user editing.** One user, one intent, one video. No real-time collaboration or version history in MVP.
- **Live-action or custom footage generation.** Motion and visuals are determined by the system from its asset strategy (e.g. stock, generated, or placeholder). The system does not film or capture custom footage.
- **Guaranteed factual or legal correctness.** The system does not verify claims in the script or rights for chosen assets. Responsibility for use (e.g. compliance, licensing) lies with the user or operator.
- **Real-time or streaming generation.** MVP is batch: intent in, video out after processing. Latency targets are out of scope for this spec.

---

## 6. Future Extensions (High-Level)

- **Optional overrides.** Allow user to lock duration, tone, or asset style without full creative control.
- **Asset uploads.** Allow brand assets (logo, footage) as optional input while keeping one-sentence intent as the primary driver.
- **Multi-format output.** Multiple aspect ratios or formats from one intent.
- **Versioning and branching.** Save intents and outputs; regenerate with same or updated system.
- **Explainability UI.** Surfaces narrative plan, shot list, and asset choices to the user.
- **Collaboration.** Shared projects, comments, approval flows.
- **Long-form or episodic.** Extend narrative and shot reasoning to longer or multi-part videos.

---

*Last updated: January 2025. Scope is MVP unless stated otherwise.*
