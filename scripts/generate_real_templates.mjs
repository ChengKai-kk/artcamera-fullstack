import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, ".env.local");

function readEnvKey(name) {
  if (!fs.existsSync(envPath)) return "";
  const content = fs.readFileSync(envPath, "utf8");
  const line = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#") && l.startsWith(`${name}=`));
  if (!line) return "";
  const raw = line.slice(name.length + 1).trim();
  if ((raw.startsWith("\"") && raw.endsWith("\"")) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}

const KEY = process.env.DOUBAO_ARK_KEY || readEnvKey("DOUBAO_ARK_KEY");
if (!KEY) {
  console.error("Missing DOUBAO_ARK_KEY in environment or .env.local");
  process.exit(1);
}

try {
  execFileSync("cwebp", ["-version"], { stdio: "ignore" });
} catch {
  console.error("cwebp not found. Please install it (e.g. brew install webp).");
  process.exit(1);
}

const QUALITY = Number(process.env.WEBP_QUALITY || 82);

const configPath = path.join(repoRoot, "artcamera_front/public/config/styles.json");
const styles = JSON.parse(fs.readFileSync(configPath, "utf8"));

const boyPath = path.join(repoRoot, "artcamera_front/public/小男孩.webp");
if (!fs.existsSync(boyPath)) {
  console.error("Missing reference image:", boyPath);
  process.exit(1);
}
const boyBuffer = fs.readFileSync(boyPath);
const imageDataUrl = `data:image/webp;base64,${boyBuffer.toString("base64")}`;

const base = "high quality portrait, cinematic lighting, rich detail";
const identity = [
  "Use the uploaded photo as the reference image.",
  "Keep the person’s identity, facial features, proportions, and expression unchanged.",
  "Face size can be adjusted to fit the new composition, but keep facial identity consistent.",
  "Keep realistic head-to-body ratio; avoid oversized head. Prefer natural full-body proportions; if the source is half-body, keep half-body framing with correct proportions.",
  "Human face is the top priority: do NOT turn the face into monkey/pig/blue skin/creature; keep a realistic human face.",
  "Realistic skin texture; no face distortion, no exaggerated eyes, no plastic skin.",
  "Stylize only clothing, hair accessories, background, lighting, and colors.",
  "Child-friendly, natural look",
].join(" ");

const themeMap = {
  real:
    "Modern realistic photography, true-to-life colors, clean and natural, soft daylight or studio light, minimal retouch, faithful skin tone.",
};

const templateMap = {
  real: {
    police_officer:
      "A child wearing a police uniform and cap, with a police badge on the chest. Standing beside a police car on a street in bright daylight. The face is clear and unchanged.",
    doctor:
      "A child wearing a white lab coat with a stethoscope around the neck. In a hospital clinic room with medical equipment, bright indoor lighting. The face is clear and unchanged.",
    firefighter:
      "A child wearing an orange firefighter uniform and helmet. Standing beside a red fire truck outdoors in bright daylight. The face is clear and unchanged.",
    teacher:
      "A child wearing neat attire, holding chalk in front of a blackboard. Bright classroom with tidy desks and chairs, well-lit indoors. The face is clear and unchanged.",
    pilot:
      "A child wearing a pilot uniform and pilot cap. Standing on an airport tarmac with an airplane nearby, bright daylight. The face is clear and unchanged.",
    scientist:
      "A child wearing a white lab coat and safety goggles. In a laboratory with test tubes and flasks, bright indoor lighting. The face is clear and unchanged.",
    nurse:
      "A child wearing a light-blue nurse uniform and nurse cap. In a hospital ward with beds and medical devices, bright indoor lighting. The face is clear and unchanged.",
    construction_worker:
      "A child wearing orange workwear with a reflective vest and a yellow hard hat. At a construction site with steel frames and machinery, bright daylight. The face is clear and unchanged.",
    astronaut:
      "A child wearing a white astronaut suit with a clear-visor helmet. Standing on the gray lunar surface with deep space and Earth in the background, sunlit and clear. The face is clear and unchanged.",
  },
};

function buildPrompt(styleId) {
  const id = String(styleId || "");
  const parts = id.split("_");
  const themeId = parts.shift();
  const templateId = parts.join("_");
  const themePrompt = themeMap[themeId] || "";
  const templatePrompt = templateMap?.[themeId]?.[templateId] || "";
  const promptParts = [identity, themePrompt, templatePrompt, base].filter(Boolean);
  return promptParts.join(", ");
}

async function generateImage(prompt) {
  const resp = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: "doubao-seedream-4-5-251128",
      prompt,
      image: imageDataUrl,
      sequential_image_generation: "disabled",
      response_format: "url",
      size: "2K",
      stream: false,
      watermark: true,
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`Doubao generate failed: ${JSON.stringify(data)}`);
  }
  const url = data?.data?.[0]?.url;
  if (!url) {
    throw new Error(`Missing result url: ${JSON.stringify(data)}`);
  }
  return url;
}

async function downloadTo(url, dest) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed ${resp.status}: ${url}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

function toWebp(inputPath, outputPath) {
  execFileSync("cwebp", ["-quiet", "-q", String(QUALITY), inputPath, "-o", outputPath], {
    stdio: "inherit",
  });
}

async function run() {
  const templatesDir = path.join(repoRoot, "artcamera_front/public/templates");
  if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });

  const theme = (styles.themes || []).find((t) => t.id === "real");
  if (!theme) {
    throw new Error("Theme 'real' not found in styles.json");
  }

  for (const tpl of theme.templates || []) {
    const styleId = `real_${tpl.id}`;
    console.log(`Generating template ${styleId}...`);
    const prompt = buildPrompt(styleId);
    const imgUrl = await generateImage(prompt);
    const tmpPath = path.join("/tmp", `${styleId}.jpg`);
    await downloadTo(imgUrl, tmpPath);
    const filename = `real_${tpl.id}.webp`;
    const outPath = path.join(templatesDir, filename);
    toWebp(tmpPath, outPath);
    tpl.cover = `templates/${filename}`;
  }

  fs.writeFileSync(configPath, JSON.stringify(styles, null, 2));
  console.log("Done. Updated real templates and styles.json.");
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
