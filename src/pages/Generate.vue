<template>
  <div class="app-page generate-page">
    <header class="page-head">
      <div class="eyebrow">Art Camera</div>
      <h1 class="page-title">{{ titleText }}</h1>
      <div class="page-subtitle">{{ subtitleText }}</div>
    </header>

    <section class="panel status-panel glow">
      <div class="status-line">
        <span class="status-dot" :class="status"></span>
        <span class="status-text">{{ statusText }}</span>
      </div>
      <div class="meta">
        <div>当前风格：<b>{{ styleId || "未选择" }}</b></div>
        <div v-if="status === 'generating'">系统自动生成中，请保持站位</div>
      </div>
      <div v-if="status === 'generating'" class="pulse-track">
        <div class="pulse-bar"></div>
      </div>
    </section>

    <section class="panel preview-panel">
      <div v-if="status === 'success'" class="result-wrap">
        <img :src="resultUrl" class="result-image" />
      </div>
      <div v-else class="result-placeholder">
        <div class="orb"></div>
        <div class="hint">
          {{ status === "error" ? "生成失败，请重试" : "AI 影像处理中" }}
        </div>
      </div>
    </section>

    <div class="actions">
      <button v-if="status === 'success'" class="btn primary" @click="goSave">
        去扫码保存
      </button>
      <button v-if="status === 'error'" class="btn secondary" @click="reset">
        重新生成
      </button>
    </div>

    <div v-if="status === 'error'" class="error">{{ errorMsg }}</div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { AI_CONFIG } from "@/config/ai";

const router = useRouter();

const status = ref("idle"); // idle | generating | success | error
const errorMsg = ref("");
const resultUrl = ref("");
const taskId = ref("");
const autoStarted = ref(false);
let timer = null;

// 👉 这里先假设：
// imageBase64、styleId 是从上一页带过来的
// 你可以后面再精细化
const imageBase64 = sessionStorage.getItem("imageBase64");
const styleId = sessionStorage.getItem("styleId") || "anime";

const titleText = computed(() => {
  if (status.value === "success") return "生成完成";
  if (status.value === "error") return "生成异常";
  return "正在生成艺术照片";
});

const subtitleText = computed(() => {
  if (status.value === "success") return "请扫码保存作品";
  if (status.value === "error") return "可重新生成或返回拍照";
  return "无需点击，系统已自动开始";
});

const statusText = computed(() => {
  if (status.value === "generating") return "生成中 · AI 引擎计算中";
  if (status.value === "success") return "任务完成 · 输出已就绪";
  if (status.value === "error") return "任务失败 · 请重新生成";
  return "准备中 · 自动启动";
});

async function startGenerate() {
  if (!imageBase64) {
    status.value = "error";
    errorMsg.value = "未获取到照片数据";
    return;
  }

  status.value = "generating";

  try {
    // 1️⃣ 创建任务
    const resp = await fetch(`${AI_CONFIG.BASE_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Token": AI_CONFIG.API_TOKEN,
      },
      body: JSON.stringify({
        styleId,
        imageBase64,
      }),
    });

    const data = await resp.json();
    if (!resp.ok || !data.taskId) {
      throw new Error(data.error || "生成任务创建失败");
    }

    taskId.value = data.taskId;

    // 2️⃣ 开始轮询
    pollTask();
  } catch (err) {
    status.value = "error";
    errorMsg.value = err.message || "生成失败";
  }
}

function pollTask() {
  clearInterval(timer);

  timer = setInterval(async () => {
    try {
      const resp = await fetch(
        `${AI_CONFIG.BASE_URL}/tasks/${taskId.value}`,
        {
          headers: {
            "X-API-Token": AI_CONFIG.API_TOKEN,
          },
        }
      );

      const data = await resp.json();

      if (data.status === "SUCCEEDED") {
        resultUrl.value = data.resultUrl;
        status.value = "success";
        clearInterval(timer);
      } else if (data.status === "FAILED") {
        throw new Error(data.error || "生成失败");
      }
    } catch (err) {
      status.value = "error";
      errorMsg.value = err.message || "轮询失败";
      clearInterval(timer);
    }
  }, AI_CONFIG.POLL_INTERVAL);
}

function goSave() {
  // 把 resultUrl 带到下一页
  sessionStorage.setItem("resultUrl", resultUrl.value);
  router.push("/save");
}

function reset() {
  status.value = "idle";
  errorMsg.value = "";
  resultUrl.value = "";
  taskId.value = "";
  autoStarted.value = true;
  startGenerate();
}

onMounted(() => {
  if (!autoStarted.value) {
    autoStarted.value = true;
    startGenerate();
  }
});

onBeforeUnmount(() => {
  clearInterval(timer);
});
</script>

<style scoped>
.generate-page {
  align-items: center;
}

.page-head {
  text-align: center;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 4px;
  font-size: clamp(12px, 1.4vh, 16px);
  color: rgba(232, 241, 255, 0.65);
}

.status-panel,
.preview-panel {
  width: min(900px, 90vw);
}

.status-line {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: clamp(14px, 1.6vh, 20px);
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(232, 241, 255, 0.3);
  box-shadow: 0 0 12px rgba(79, 140, 255, 0.5);
}

.status-dot.generating {
  background: var(--accent);
  animation: blink 1s ease-in-out infinite;
}

.status-dot.success {
  background: #59f7a4;
}

.status-dot.error {
  background: #ff6b6b;
}

.meta {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  font-size: clamp(12px, 1.4vh, 16px);
  color: var(--muted);
}

.pulse-track {
  margin-top: 12px;
  height: 8px;
  border-radius: 999px;
  background: rgba(120, 200, 255, 0.12);
  overflow: hidden;
}

.pulse-bar {
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, transparent, rgba(47, 255, 215, 0.9), transparent);
  animation: scan 1.8s ease-in-out infinite;
}

.preview-panel {
  min-height: clamp(320px, 40vh, 620px);
  display: grid;
  place-items: center;
}

.result-wrap {
  width: 100%;
  display: grid;
  place-items: center;
}

.result-image {
  width: min(860px, 90vw);
  max-height: 62vh;
  object-fit: contain;
  border-radius: 18px;
  border: 1px solid rgba(120, 200, 255, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
}

.result-placeholder {
  display: grid;
  place-items: center;
  gap: 16px;
  text-align: center;
}

.orb {
  width: clamp(120px, 18vh, 200px);
  height: clamp(120px, 18vh, 200px);
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(47, 255, 215, 0.9), rgba(79, 140, 255, 0.3));
  box-shadow: 0 0 40px rgba(47, 255, 215, 0.35);
  animation: breathe 2.4s ease-in-out infinite;
}

.hint {
  color: var(--muted);
  font-size: clamp(14px, 1.6vh, 18px);
}

.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.error {
  margin-top: 8px;
  color: #ff8f8f;
  text-align: center;
}

@keyframes scan {
  0% { transform: translateX(-30%); }
  50% { transform: translateX(80%); }
  100% { transform: translateX(-30%); }
}

@keyframes blink {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@keyframes breathe {
  0%, 100% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
}
</style>
