import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUT = path.join(ROOT, "public", "hero", "footer-painting.jpg");

function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i).trim();
    const v = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

function args() {
  const out = { _: [] };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : "true";
      out[k] = v;
    } else out._.push(a[i]);
  }
  return out;
}

const SCENE = `
A wide panoramic alpine valley in soft overcast daylight, painted as a matte gouache
illustration: flat-ish painted shapes, visible dry-brush texture, faint paper grain,
muted natural colours, no harsh shadows, no glow, no rim light, no lens effects.

Composition, left to right:
- The left edge is framed by a stand of tall dark blue-green spruce and fir trees,
  the nearest ones almost full height, with a dense conifer forest falling away
  behind them into the valley.
- The centre and right are dominated by a great jagged range of snow-capped
  mountains in cool blue-grey, with painted rock facets, snowfields and couloirs.
  Below them, layered forested foothills in deep green fade toward blue-green.
- Rolling bright green alpine meadows roll down from the foothills, with a few
  scattered trees and a small barn.
- A small village sits right of centre: two or three traditional wooden chalets
  with wide, gently pitched roofs, dark timber upper storeys, white plastered
  ground floors, wooden balconies lined with window boxes of red and pink
  geraniums; beside them a white chapel with a grey onion-domed steeple and a
  small gold finial.
- A pale winding dirt lane curves from the bottom of the picture up into the
  village, lined with rustic wooden post-and-rail fences.
- The foreground, along the bottom edge, is a meadow of tall grasses and seed
  heads with wildflowers: white daisies, edelweiss, blue and violet bellflowers
  and small yellow blooms, thickest at the bottom-left and bottom-right corners.
- The right edge is framed by another cluster of dark spruces.
- The sky is pale and milky, almost paper-white at the very top, with soft
  grey-white clouds.

Absolutely no text, letters, logos, watermarks, signatures, borders, frames or
vignettes. No people, no animals, no vehicles. The painting must fill the whole
canvas edge to edge.`;

const CREW = `
A small film crew is at work on the meadow in the middle distance, painted in
the same matte gouache style and at the correct scale for that meadow (each
figure only a few percent of the picture's height): a cinema camera on a
tripod aimed toward the village, a camera operator standing behind it, a
director seated in a folding canvas chair beside a small monitor on a stand,
one crew member holding up a white bounce board, two black equipment cases in
the grass, and a small quadcopter drone hovering in the sky above the meadow.
Figures are simple and painterly with no faces, in muted dark jackets, one
with a cap. No text anywhere.`;

const EDITS = {
  crewLeft: `Edit this gouache painting. Keep the landscape, palette, brushwork,
lighting and every existing element exactly as they are; change nothing else.
ADD ${CREW}
Place the crew on the open meadow left of the winding lane, between the far
fence and the foreground flowers, the camera pointing right toward the
chalets and chapel. The drone hangs in the sky above them, left of centre.`,
  crewRight: `Edit this gouache painting. Keep the landscape, palette, brushwork,
lighting and every existing element exactly as they are; change nothing else.
ADD ${CREW}
Place the crew on the meadow in front of and slightly below the chalets, just
right of the lane where it reaches the village, the camera pointing left up
the valley toward the mountains. The drone hangs in the sky above the meadow
to the left of centre.`,
  crewVan: `Edit this gouache painting. Keep the landscape, palette, brushwork,
lighting and every existing element exactly as they are; change nothing else.
ADD ${CREW}
Place the crew on the open meadow left of the winding lane, between the far
fence and the foreground flowers, the camera pointing right toward the
chalets. Also add a small white production van parked on the lane by the
fence near the crew, rear doors open, painted in the same style.`,
  crewGolden: `Edit this gouache painting. Keep the composition and every existing
element exactly as they are, but shift the light to late afternoon: warm
low sun from the right, a gentle apricot warmth on the snow peaks and the
chalet walls, long soft shadows across the meadow, the sky a pale warm
cream with the same soft clouds. Keep it matte gouache, no glow, no lens
effects. ADD ${CREW}
Place the crew on the open meadow left of the winding lane, the camera
pointing right toward the village; the drone above them.`,
};

const TECHNIQUE = `
Use the attached painting ONLY for its technique: matte gouache, flat-ish
painted shapes, visible dry-brush texture, faint paper grain, muted natural
colours, soft overcast daylight with no glow, no rim light, no lens effects.
Do NOT reuse its composition, its buildings or its motifs. Paint an original
ultra-wide 21:9 panorama. Absolutely no text, letters, logos, watermarks,
signatures, borders or vignettes. The painting fills the canvas edge to edge.`;

const CREW_PAINTED = `
The subject is a small film unit at work on location, painted in exactly the
same dry-brush gouache strokes as the landscape (no smooth digital shading,
no faces, figures seen from behind or in profile, muted dark jackets, one
cap), each figure roughly one tenth of the picture's height: a cinema camera
on a tripod with its operator, a director seated in a folding canvas chair
watching a monitor on a stand, a grip holding up a white bounce board, two
black equipment cases in the grass, and a small quadcopter drone hovering in
the sky. The camera points at the view.`;

const DISTINCT = {
  lake: `${TECHNIQUE}
Composition: a still high-alpine lake fills the middle distance and mirrors
the peaks; a weathered wooden boathouse and a short jetty stand on its near
shore. On the far shore, LEFT of centre, a small village of stone-and-timber
houses with slate roofs, a stone church with a slim pointed bell tower, and
a small hotel with green shutters; a cable-car line with two tiny gondolas
climbs the slope behind it. Across the back, a long serrated ridge with one
dominant pyramid peak right of centre, snowfields and a hanging glacier, in
cool blue-grey with painted rock facets, foothills of deep blue-green forest
below it. The RIGHT edge is framed by a dark blue-black stand of larch and
spruce with a hay barn on a knoll; the LEFT edge by a rocky outcrop with one
weathered pine. The foreground is a lush meadow thick with wildflowers:
pink alpine roses, deep-blue gentians, buttercups, white cotton grass and
tall seed heads, densest in the bottom corners. Wisps of mist lie on the
lake; the sky is pale and milky, paper-white at the very top.
${CREW_PAINTED}
The crew stands on the near shore meadow just right of centre, the camera
aimed across the lake at the village, the drone above the water.`,
  pass: `${TECHNIQUE}
Composition: a high mountain pass. A pale gravel road climbs from the
bottom-left in two hairpins to a stone-arched bridge over a white torrent,
then on to a mountain refuge hut on a shelf right of centre: stone base,
dark timber upper floor, a green-shuttered annex, a rain barrel, a wooden
bench outside, a small waterfall behind it. Beyond, a wall of serrated peaks
with snowfields, a glacier tongue coming down between two of them, and a
long scree slope, all in cool blue-grey with painted facets. The LEFT edge is
framed by a dark blue-black spruce stand; the RIGHT edge by a granite
boulder field with dwarf pines. Foreground: a lush meadow thick with
wildflowers, pink alpine roses, deep-blue gentians, buttercups, white cotton
grass and tall seed heads, densest in the bottom corners; a few grazing
brown cows with bells in the middle distance. Sky pale and milky, paper-white
at the top, with soft grey-white clouds sitting on the peaks.
${CREW_PAINTED}
The crew is set up on the meadow right of centre below the refuge, the camera
aimed left along the road toward the bridge and peaks, the drone above the
torrent.`,
  dawn: `${TECHNIQUE}
Composition: a broad glacial valley at first light. A braided milky-blue
river winds through gravel bars in the middle distance, crossed by a covered
wooden bridge; on a terrace LEFT of centre stands a hamlet of stone-and-timber
farmhouses with slate roofs and a squat stone chapel with a pointed slate
spire; a cable-car line climbs the slope behind it. A wall of serrated peaks
closes the valley, their snowfields and one hanging glacier catching the first
warm apricot light while the valley floor is still in cool blue shadow, a
thin band of mist over the river. The RIGHT edge is framed by a dark
blue-black spruce stand with a hay barn on a knoll; the LEFT edge by a rocky
outcrop with one weathered pine. Foreground: a lush meadow thick with
wildflowers, pink alpine roses, deep-blue gentians, buttercups, white cotton
grass and tall seed heads, densest in the bottom corners. Keep it matte
gouache: the warmth is in the pigment on the peaks only, no glow, no rays.
${CREW_PAINTED}
The crew stands on the meadow just right of centre, the camera aimed up the
valley at the lit peaks, the drone above the river.`,
};

const VARIANTS = {
  fresh: `${SCENE}
${CREW}
Compose it differently from the attached reference: the village and chapel
sit LEFT of centre on a knoll, a small still lake lies in the meadow below
them reflecting the peaks, the lane comes in from the right foreground, and
the tallest summits stand to the right. Match the reference's technique,
palette, lighting and mood as closely as possible, as a NEW original
painting for an ultra-wide 21:9 panoramic canvas.`,
  faithful: `${SCENE}
Match the attached reference painting's technique, palette, lighting and mood as
closely as possible, as a NEW original painting of the same kind of place,
re-composed for an ultra-wide 21:9 panoramic canvas.`,
  sky: `${SCENE}
Match the attached reference painting's technique, palette, lighting and mood as
closely as possible, as a NEW original painting of the same kind of place,
re-composed for an ultra-wide 21:9 panoramic canvas. Give the sky more room than
the reference: the highest summit should top out around forty percent down from
the top edge, so the upper third of the picture is clean pale sky with only faint
clouds. That area is reserved for a wordmark that will be set over it later.`,
};

async function gen(opt, mode = "gen") {
  loadEnv();
  const useVertex = opt.vertex === "true";
  const apiKey = process.env.GEMINI_API_KEY;
  if (!useVertex && !apiKey)
    throw new Error("GEMINI_API_KEY missing from .env.local");
  if (useVertex && !process.env.GOOGLE_CLOUD_PROJECT)
    throw new Error("GOOGLE_CLOUD_PROJECT missing from .env.local");
  const editing = mode === "edit";
  const ref = editing ? opt.base : opt.ref;
  if (!ref || !fs.existsSync(ref))
    throw new Error(
      editing
        ? "--base <painting to edit> is required"
        : "--ref <style-reference image> is required",
    );
  const outDir = opt.out || path.join(ROOT, "tmp", "footer-candidates");
  fs.mkdirSync(outDir, { recursive: true });

  const model = opt.model || "gemini-3-pro-image";
  const n = Number(opt.n || 1);
  const table = editing ? EDITS : { ...VARIANTS, ...DISTINCT };
  const variant = opt.variant || (editing ? "crewLeft" : "faithful");
  const tag = opt.tag || variant;
  const prompt = table[variant];
  if (!prompt)
    throw new Error(
      `unknown --variant ${variant}; use ${Object.keys(table).join("|")}`,
    );

  const refBuf = fs.readFileSync(ref);
  const refMime = ref.toLowerCase().endsWith(".png")
    ? "image/png"
    : "image/jpeg";
  const ai = useVertex
    ? new GoogleGenAI({
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT,
        location: opt.location || process.env.GOOGLE_CLOUD_LOCATION || "global",
      })
    : new GoogleGenAI({ apiKey });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const request = (withSize) =>
    ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: refMime,
                data: refBuf.toString("base64"),
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: opt.ar || "21:9",
          ...(withSize ? { imageSize: opt.size || "2K" } : {}),
        },
      },
    });

  const attempt = async (label) => {
    let withSize = true;
    let delay = 4000;
    for (let k = 1; ; k++) {
      try {
        return await request(withSize);
      } catch (e) {
        const msg = String(e?.message || e);
        if (
          withSize &&
          /image_?size/i.test(msg) &&
          /400|INVALID_ARGUMENT/.test(msg)
        ) {
          console.log(
            `  ${label}: model rejects imageSize, retrying at default size`,
          );
          withSize = false;
          continue;
        }
        const transient =
          /503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|overloaded|deadline/i.test(
            msg,
          );
        if (!transient || k >= Number(opt.retries || 6)) throw e;
        console.log(
          `  ${label}: transient failure (attempt ${k}), retrying in ${delay / 1000}s`,
        );
        await sleep(delay + Math.random() * 1500);
        delay = Math.min(delay * 2, 60000);
      }
    }
  };

  const one = async (i) => {
    const label = `${tag}-${i + 1}`;
    const t0 = Date.now();
    await sleep(i * 1500);
    const res = await attempt(label);
    const parts = res.candidates?.[0]?.content?.parts || [];
    const img = parts.find((p) => p.inlineData?.data);
    if (!img) {
      const why =
        res.candidates?.[0]?.finishReason ||
        res.promptFeedback?.blockReason ||
        "no image part";
      throw new Error(`${label}: model returned no image (${why})`);
    }
    const buf = Buffer.from(img.inlineData.data, "base64");
    const meta = await sharp(buf).metadata();
    const file = path.join(outDir, `${label}.png`);
    await sharp(buf).png().toFile(file);
    console.log(
      `  ${label}: ${meta.width}x${meta.height} ${(buf.length / 1024).toFixed(0)}KB in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${file}`,
    );
    return file;
  };

  console.log(
    `Generating ${n} x ${variant} with ${model}${useVertex ? " via Vertex" : ""} (${opt.ar || "21:9"} @ ${opt.size || "2K"})`,
  );
  const results = await Promise.allSettled(
    Array.from({ length: n }, (_, i) => one(i)),
  );
  const failed = results.filter((r) => r.status === "rejected");
  for (const f of failed)
    console.error("  FAILED:", f.reason?.message || f.reason);
  if (failed.length === results.length) process.exit(1);
}
async function inpaintDark(buf, spec) {
  const [x, y, w, h, luma = 110] = spec.split(",").map(Number);
  const region = await sharp(buf)
    .extract({ left: x, top: y, width: w, height: h })
    .removeAlpha()
    .raw()
    .toBuffer();
  const px = Buffer.from(region);
  const L = (i) => 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  const isStroke = (i) => L(i) < luma || (px[i] - px[i + 1] > 8 && L(i) < 145);
  const PAD = 1;
  const mark = new Uint8Array(w * h);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      if (!isStroke((row * w + col) * 3)) continue;
      for (let c = Math.max(0, col - PAD); c <= Math.min(w - 1, col + PAD); c++)
        mark[row * w + c] = 1;
    }
  }
  let filled = 0;
  for (let row = 0; row < h; row++) {
    let col = 0;
    while (col < w) {
      if (!mark[row * w + col]) {
        col++;
        continue;
      }
      let end = col;
      while (end < w && mark[row * w + end]) end++;
      const li = col > 0 ? col - 1 : end < w ? end : -1;
      const ri = end < w ? end : col > 0 ? col - 1 : -1;
      if (li < 0) break;
      for (let c = col; c < end; c++) {
        const t = ri === li ? 0 : (c - li) / (ri - li);
        for (let ch = 0; ch < 3; ch++) {
          const a = px[(row * w + li) * 3 + ch];
          const b = px[(row * w + ri) * 3 + ch];
          px[(row * w + c) * 3 + ch] = Math.round(a + (b - a) * t);
        }
        filled++;
      }
      col = end;
    }
  }
  const patch = await sharp(px, { raw: { width: w, height: h, channels: 3 } })
    .blur(0.8)
    .png()
    .toBuffer();
  console.log(`  inpainted ${filled} px in ${spec}`);
  return sharp(buf)
    .composite([{ input: patch, left: x, top: y }])
    .png()
    .toBuffer();
}

async function finalize(opt) {
  const input = opt.in;
  if (!input || !fs.existsSync(input))
    throw new Error("--in <candidate image> is required");
  const aspect = Number(opt.aspect || 2.85);
  const anchor = Math.min(1, Math.max(0, Number(opt.anchor ?? 0.5)));
  const width = Number(opt.width || 2400);
  const quality = Number(opt.quality || 80);
  const out = opt.out ? path.resolve(ROOT, opt.out) : DEFAULT_OUT;

  let source = fs.readFileSync(input);
  for (const spec of (opt.inpaint || "").split(";").filter(Boolean)) {
    source = await inpaintDark(source, spec);
  }
  if (opt.retouched) {
    fs.writeFileSync(path.resolve(ROOT, opt.retouched), source);
  }

  const meta = await sharp(source).metadata();
  let cw = meta.width;
  let ch = Math.round(cw / aspect);
  if (ch > meta.height) {
    ch = meta.height;
    cw = Math.round(ch * aspect);
  }
  const left = Math.round((meta.width - cw) / 2);
  const top = Math.round((meta.height - ch) * anchor);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  const info = await sharp(source)
    .extract({ left, top, width: cw, height: ch })
    .resize({ width, kernel: "lanczos3" })
    .jpeg({
      quality,
      mozjpeg: true,
      progressive: true,
      chromaSubsampling: "4:2:0",
    })
    .toFile(out);
  console.log(
    `crop ${cw}x${ch} @ (${left},${top}) of ${meta.width}x${meta.height} -> ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)}KB q${quality} -> ${path.relative(ROOT, out)}`,
  );
}

const opt = args();
const cmd = opt._[0];
const run =
  cmd === "gen"
    ? gen
    : cmd === "edit"
      ? (o) => gen(o, "edit")
      : cmd === "finalize"
        ? finalize
        : null;
if (!run) {
  console.error(
    "usage: build-footer-painting.mjs gen|edit|finalize [options] (see header)",
  );
  process.exit(2);
}
run(opt).catch((e) => {
  console.error(e);
  process.exit(1);
});
