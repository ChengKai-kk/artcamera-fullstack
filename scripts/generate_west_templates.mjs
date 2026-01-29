import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

const configPath = path.join(repoRoot, "artcamera_front/public/config/styles.json");
const styles = JSON.parse(fs.readFileSync(configPath, "utf8"));

const boyPath = path.join(repoRoot, "artcamera_front/public/小男孩.png");
if (!fs.existsSync(boyPath)) {
  console.error("Missing reference image:", boyPath);
  process.exit(1);
}
const boyBuffer = fs.readFileSync(boyPath);
const imageDataUrl = `data:image/png;base64,${boyBuffer.toString("base64")}`;

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
  west:
    "Journey to the West inspired Chinese mythology fantasy, ancient Chinese aesthetics, warm and gentle tone, cinematic light and atmosphere, traditional patterns and ornament details.",
};

const templateMap = {
  west: {
    flower_girl:
      "Ancient Chinese spring garden with peach blossoms and petals; elegant hanfu with subtle mythical motifs and floral accessories; soft daylight, gentle breeze, dreamy bokeh. Wear the 1986 TV series Journey to the West Tang Monk costume (kasaya robe, monk staff); human face must stay unchanged.",
    celestial_general:
      "Celestial aura with golden clouds and temple silhouettes; ceremonial robe or light armor; subtle magical glow. Wear the 1986 TV series Sun Wukong costume (golden headband, tiger-skin skirt, light armor, staff); keep human face only (no monkey face).",
    temple_monk:
      "Peaceful ancient temple courtyard, incense smoke, warm lantern light; simple robe and calm mood. Wear the 1986 TV series Tang Monk costume (kasaya robe); human face must stay unchanged.",
    mountain_myth:
      "Mythic mountains and rivers, misty cliffs and waterfalls; morning haze with gentle magical particles. Wear the 1986 TV series Sha Wujing costume (dark robe, monk scarf, crescent spade); keep human face only (no blue skin).",
    lantern_festival:
      "Lantern festival night, warm lantern glow, red-and-gold accents; soft fireworks bokeh. Wear the 1986 TV series Zhu Bajie costume (robe, belly sash, nine-tooth rake); keep human face only (no pig face).",
    west_journey:
      "Ancient travel road, gentle sunset, wind-swept clouds; cinematic composition with myth-inspired outfit. Wear the 1986 TV series Sun Wukong costume (golden headband, tiger-skin skirt, staff); keep human face only (no monkey face).",
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

async function run() {
  const templatesDir = path.join(repoRoot, "artcamera_front/public/templates");
  const stylesDir = path.join(repoRoot, "artcamera_front/public/styles");
  if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });
  if (!fs.existsSync(stylesDir)) fs.mkdirSync(stylesDir, { recursive: true });

  const theme = (styles.themes || []).find((t) => t.id === "west");
  if (!theme) {
    throw new Error("Theme 'west' not found in styles.json");
  }

  if (process.argv.includes("--cover")) {
    console.log("Generating theme cover for west...");
    const themePrompt = buildPrompt("west");
    const themeUrl = await generateImage(themePrompt);
    const themePath = path.join(stylesDir, "west.jpg");
    await downloadTo(themeUrl, themePath);
    theme.cover = "styles/west.jpg";
  }

  for (const tpl of theme.templates || []) {
    const styleId = `west_${tpl.id}`;
    console.log(`Generating template ${styleId}...`);
    const prompt = buildPrompt(styleId);
    const imgUrl = await generateImage(prompt);
    const filename = tpl.cover?.startsWith("templates/")
      ? tpl.cover.replace("templates/", "")
      : `west_${tpl.id}.jpg`;
    const outPath = path.join(templatesDir, filename);
    await downloadTo(imgUrl, outPath);
    tpl.cover = `templates/${filename}`;
  }

  fs.writeFileSync(configPath, JSON.stringify(styles, null, 2));
  console.log("Done. Updated west templates and styles.json.");
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
