/**
 * Art Camera Backend (Alibaba FC)
 * Providers:
 *  - alibaba : DashScope WanXiang (async task)
 *  - doubao  : Volcengine Doubao Seedream (sync image generation)
 *
 * Unified API:
 *  POST /generate  -> { taskId }
 *  GET  /tasks/:id -> { status, resultUrl?, error? }
 */

const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "15mb" }));

/* ===================== CORS ===================== */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Date,X-API-Token");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

/* ===================== API Token 鉴权 ===================== */
app.use((req, res, next) => {
  const serverToken = process.env.SERVER_API_TOKEN;
  if (!serverToken) return next();
  const got = req.headers["x-api-token"];
  if (got !== serverToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

/* ===================== Provider 选择 ===================== */
const PROVIDER = (process.env.PROVIDER || "doubao").toLowerCase();

/* ===================== 同步任务缓存（豆包用） ===================== */
const memoryTasks = new Map();
// taskId -> { status, resultUrl, error }

/* ===================== Prompt 映射 ===================== */
function buildPrompt(styleId) {
  const base = "high quality portrait, cinematic lighting, rich detail";
  const identity = [
    "Use the uploaded photo as the reference image.",
    "Keep the person’s identity, facial features, proportions, and expression unchanged.",
    "Face size can be adjusted to fit the new composition, but keep facial identity consistent.",
    "Keep realistic head-to-body ratio; avoid oversized head. Prefer natural full-body proportions; if the source is half-body, keep half-body framing with correct proportions.",
    "Human face is the top priority: do NOT turn the face into monkey/pig/blue skin/creature; keep a realistic human face.",
    "Realistic skin texture; no face distortion, no exaggerated eyes, no plastic skin.",
    "Stylize only clothing, hair accessories, background, lighting, and colors.",
    "Child-friendly, natural look"
  ].join(" ");
  const id = String(styleId || "");
  const parts = id.split("_");
  const themeId = parts.shift();
  const templateId = parts.join("_");

  const themeMap = {
    west:
      "Journey to the West inspired Chinese mythology fantasy, ancient Chinese aesthetics, warm and gentle tone, cinematic light and atmosphere, traditional patterns and ornament details.",
    real:
      "Modern realistic photography, true-to-life colors, clean and natural, soft daylight or studio light, minimal retouch, faithful skin tone.",
    dimension:
      "Imaginative stylized world with creative atmosphere, expressive color and lighting, rich textures in environment, keep the face realistic and natural."
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
        "Ancient travel road, gentle sunset, wind-swept clouds; cinematic composition with myth-inspired outfit. Wear the 1986 TV series Sun Wukong costume (golden headband, tiger-skin skirt, staff); keep human face only (no monkey face)."
    },
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
        "A child wearing a white astronaut suit with a clear-visor helmet. Standing on the gray lunar surface with deep space and Earth in the background, sunlit and clear. The face is clear and unchanged."
    },
    dimension: {
      storybook:
        "Dreamy storybook world background, pastel palette, gentle glow, illustration-like environment.",
      toy_world:
        "Miniature toy diorama world around the subject, playful scale, soft plastic textures in background.",
      soft_anime:
        "Subtle anime-inspired color and lighting in background; clean line details; bright friendly mood.",
      future_city:
        "Near-future optimistic cityscape, glowing lines, soft holographic signage.",
      sketch:
        "Hand-drawn sketch texture in background, pencil strokes, light paper grain.",
      neon_dream:
        "Neon dreamscape with soft glow, colorful bokeh, gentle gradients; avoid oversaturation."
    }
  };


  const themePrompt = themeMap[themeId] || "";
  const templatePrompt = templateMap?.[themeId]?.[templateId] || "";
  const promptParts = [identity, themePrompt, templatePrompt, base].filter(Boolean);
  return promptParts.join(", ");
}

function normalizeBase64(imageBase64) {
  const s = String(imageBase64 || "");
  const m = s.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  return m ? m[2] : s;
}

function ensureImageUrl(imageBase64) {
  const s = String(imageBase64 || "");
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("data:image/")) return s;
  const m = s.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  if (m) return s;
  return `data:image/jpeg;base64,${s}`;
}

/* ===================== Provider 注册 ===================== */
const providers = {
  alibaba: createAlibabaProvider(),
  doubao: createDoubaoProvider(),
  banana: createBananaProvider(),
};

function getProvider() {
  const p = providers[PROVIDER];
  if (!p) throw new Error(`Unsupported PROVIDER: ${PROVIDER}`);
  return p;
}

/* ===================== API ===================== */
app.post("/generate", async (req, res) => {
  try {
    const { imageBase64, styleId } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }
    const p = getProvider();
    const taskId = await p.generate({ imageBase64, styleId });
    res.json({ taskId });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get("/tasks/:taskId", async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const p = getProvider();
    const out = await p.query(taskId);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

/* ======================================================
 * Provider: Alibaba DashScope WanXiang（异步）
 * ENV:
 *  - ALI_DASHSCOPE_KEY
 * ====================================================== */
function createAlibabaProvider() {
  const BASE = "https://dashscope.aliyuncs.com";

  return {
    async generate({ imageBase64, styleId }) {
      const key = process.env.ALI_DASHSCOPE_KEY;
      if (!key) throw new Error("Missing ALI_DASHSCOPE_KEY");

      const prompt = buildPrompt(styleId);
      const image = normalizeBase64(imageBase64);

      const resp = await fetch(
        `${BASE}/api/v1/services/aigc/image-generation/generation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
            "X-DashScope-Async": "enable",
          },
          body: JSON.stringify({
            model: "wan2.6-image",
            input: {
              messages: [
                {
                  role: "user",
                  content: [{ text: prompt }, { image }],
                },
              ],
            },
          }),
        }
      );

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(`DashScope generate failed: ${JSON.stringify(data)}`);
      }

      return data?.output?.task_id || data?.task_id;
    },

    async query(taskId) {
      const key = process.env.ALI_DASHSCOPE_KEY;
      if (!key) throw new Error("Missing ALI_DASHSCOPE_KEY");

      const resp = await fetch(
        `${BASE}/api/v1/tasks/${encodeURIComponent(taskId)}`,
        { headers: { Authorization: `Bearer ${key}` } }
      );

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(`DashScope query failed: ${JSON.stringify(data)}`);
      }

      const status = data?.output?.task_status || data?.task_status;

      if (status === "SUCCEEDED") {
        const content = data?.output?.choices?.[0]?.message?.content || [];
        const img = (content.find((x) => x && x.image) || {}).image;
        return { status, resultUrl: img };
      }

      if (status === "FAILED") {
        return { status, error: data?.output?.message || "FAILED" };
      }

      return { status };
    },
  };
}

/* ======================================================
 * Provider: Doubao Seedream（同步）
 * API: POST /api/v3/images/generations
 *
 * ENV:
 *  - DOUBAO_ARK_KEY
 * ====================================================== */
function createDoubaoProvider() {
  const BASE = "https://ark.cn-beijing.volces.com";
  const KEY = process.env.DOUBAO_ARK_KEY;

  if (!KEY) {
    return {
      async generate() {
        throw new Error("Missing DOUBAO_ARK_KEY");
      },
      async query() {
        return { status: "FAILED", error: "Doubao not configured" };
      },
    };
  }

  return {
    async generate({ imageBase64, styleId }) {
      const prompt = buildPrompt(styleId);
      const image = ensureImageUrl(imageBase64);

      const resp = await fetch(`${BASE}/api/v3/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${KEY}`,
        },
        body: JSON.stringify({
          model: "doubao-seedream-4-5-251128",
          prompt,
          image, // image URL or data URL
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

      // 官方返回结构：data[0].url
      const resultUrl = data?.data?.[0]?.url;
      if (!resultUrl) {
        throw new Error(`Doubao missing result url: ${JSON.stringify(data)}`);
      }

      // 同步接口 → 构造一个“伪 taskId”给前端轮询
      const taskId =
        "doubao_" +
        Date.now() +
        "_" +
        Math.random().toString(16).slice(2, 8);

      memoryTasks.set(taskId, {
        status: "SUCCEEDED",
        resultUrl,
      });

      return taskId;
    },

    async query(taskId) {
      const cached = memoryTasks.get(taskId);
      if (!cached) {
        return { status: "FAILED", error: "Task expired or not found" };
      }
      return cached;
    },
  };
}

/* ======================================================
 * Provider: Banana Seedream（同步）
 * API: POST /api/v3/images/generations
 *
 * ENV:
 *  - GEMINI_ARK_KEY
 * ====================================================== */
function base64ToBlob(imageBase64) {
  const s = String(imageBase64 || "");
  const m = s.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  const mime = m ? m[1] : "image/png";
  const b64 = m ? m[2] : s;
  const buf = Buffer.from(b64, "base64");
  return new Blob([buf], { type: mime });
}

function createBananaProvider() {
  const KEY = process.env.BANANA_API_KEY;
  const BASE = "https://api.whatai.cc"; 

  if (!KEY) {
    return {
      async generate() {
        throw new Error("Missing BANANA_API_KEY");
      },
      async query() {
        return { status: "FAILED", error: "Banana not configured" };
      },
    };
  }

  return {
    async generate({ imageBase64, styleId }) {
      const prompt = buildPrompt(styleId);
      const imageBlob = base64ToBlob(imageBase64);

      const form = new FormData();
      form.append("model", "nano-banana");
      form.append("prompt", prompt);

      // ✅ 单图改图（如需多图，把 append("image"... ) 写多次）
      form.append("image", imageBlob, "input.png");

      form.append("response_format", "url");
      form.append("image_size", "4K");
      // form.append("aspect_ratio", "1:1"); // 需要就打开

      const resp = await fetch(`${BASE}/v1/images/edits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          // ⚠️ 不要手动设置 Content-Type，让 fetch 自动生成 multipart boundary
        },
        body: form,
      });

      // 先拿文本，便于定位非 JSON 报错
      const raw = await resp.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        throw new Error(`Banana non-JSON response: HTTP ${resp.status}, body=${raw.slice(0, 500)}`);
      }

      if (!resp.ok) {
        throw new Error(`Banana failed: HTTP ${resp.status}, ${JSON.stringify(data)}`);
      }

      // ✅ 你示例提到的结构通常是 data[0].url 或 data.data[0].url，这里都兼容
      const resultUrl =
        data?.data?.[0]?.url ||
        data?.[0]?.url ||
        data?.result?.url ||
        data?.output?.url;

      if (!resultUrl) {
        throw new Error(`Banana missing result url: ${JSON.stringify(data)}`);
      }

      // ✅ 同步接口 → 造一个伪 taskId 给你前端轮询
      const taskId =
        "banana_" + Date.now() + "_" + Math.random().toString(16).slice(2, 8);

      memoryTasks.set(taskId, { status: "SUCCEEDED", resultUrl });
      return taskId;
    },

    async query(taskId) {
      const cached = memoryTasks.get(taskId);
      if (!cached) return { status: "FAILED", error: "Task expired or not found" };
      return cached;
    },
  };
}


/* ===================== Start ===================== */
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log("Server listening on port", PORT, "provider =", PROVIDER);
});
