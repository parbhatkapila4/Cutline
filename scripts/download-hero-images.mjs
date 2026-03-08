import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "hero");

const HERO_IMAGE_URLS = [
  "https://images.unsplash.com/photo-1612548403247-aa2873e9422d?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1607276159787-9ef4db5c0d0b?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1589976584396-cf8baebe2beb?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1470338229081-eb5980be28c9?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1567506476376-1282584643ca?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1589337068036-86d6826cd3a9?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1543235074-4768b5c2233c?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1493804714600-6edb1cd93080?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506765515384-028b60a970df?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=300&auto=format&fit=crop&q=80",
];

async function download(url, filepath) {
  const res = await fetch(url, { headers: { "User-Agent": "CutlineHero/1.0" } });
  if (!res.ok) throw new Error(`${url} => ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buf);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log("Downloading 20 hero images to public/hero/ ...");
  for (let i = 0; i < HERO_IMAGE_URLS.length; i++) {
    const num = i + 1;
    const filepath = path.join(OUT_DIR, `${num}.jpg`);
    try {
      await download(HERO_IMAGE_URLS[i], filepath);
      console.log(`  ${num}/20 ${path.basename(filepath)}`);
    } catch (e) {
      console.error(`  ${num}/20 FAILED:`, e.message);
    }
  }
  console.log("Done. Hero now uses local files from /hero/1.jpg ... /hero/20.jpg");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
