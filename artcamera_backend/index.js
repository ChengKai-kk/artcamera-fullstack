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
  const map = {
    west: "Chinese myth fantasy portrait, Journey to the West style, cinematic lighting, ultra detailed",
    anime: "anime style portrait, clean lines, vibrant colors, studio lighting",
    retro: "retro film portrait, warm tone, grain, vintage atmosphere",
  };
  const key = (styleId || "").split("_")[0];
  return map[key] || "artistic portrait, cinematic lighting, high quality";
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
                  content: [{ text: prompt }, { image: imageBase64 }],
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

      const resp = await fetch(`${BASE}/api/v3/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${KEY}`,
        },
        body: JSON.stringify({
          model: "doubao-seedream-4-5-251128",
          prompt,
          image: imageBase64, // ✅ 官方确认字段
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
