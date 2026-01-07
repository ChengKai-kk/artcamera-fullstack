<template>
  <div class="app-page camera-page">
    <header class="top">
      <button class="back" @click="goBack">← 返回</button>
      <div class="title">拍照</div>
      <div class="spacer"></div>
    </header>

    <div class="hint panel">
      当前风格：<b>{{ styleId || "未选择" }}</b>
    </div>

    <section class="stage">
      <!-- 摄像头画面：当有照片时隐藏 -->
      <video
        ref="videoEl"
        class="video"
        autoplay
        playsinline
        muted
        v-show="!photoDataUrl"
      ></video>

      <!-- 拍到的照片预览：覆盖在 video 上 -->
      <img
        v-if="photoDataUrl"
        class="photo overlay"
        :src="photoDataUrl"
        alt="photo"
      />

      <!-- 倒计时遮罩（在最上层） -->
      <div v-if="countdown > 0" class="countdown">
        {{ countdown }}
      </div>

      <!-- 错误提示遮罩（在最上层） -->
      <div v-if="errorMsg" class="error">
        <div class="errTitle">摄像头不可用</div>
        <div class="errDesc">{{ errorMsg }}</div>
        <button class="btn" @click="initCamera">重试</button>
      </div>
    </section>

    <section class="controls panel">
      <div class="row">
        <div class="label">延时</div>
        <div class="chips">
          <button
            v-for="s in delayOptions"
            :key="s"
            class="chip"
            :class="{ active: delaySec === s }"
            @click="delaySec = s"
            :disabled="busy"
          >
            {{ s === 0 ? "无" : s + "s" }}
          </button>
        </div>
      </div>

      <div class="btnRow">
        <button class="primary btn" @click="shoot" :disabled="busy || !stream">
          {{ photoDataUrl ? "重拍" : "拍照" }}
        </button>

        <button
          class="secondary btn"
          @click="confirm"
          :disabled="busy || !photoDataUrl"
        >
          确认使用
        </button>
      </div>
    </section>

    <!-- 隐藏 canvas：用于从 video 截图 -->
    <canvas ref="canvasEl" class="hidden"></canvas>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const router = useRouter();
const route = useRoute();

// 从 /camera?styleId=xxx 里取 styleId
const styleId = computed(() => route.query.styleId?.toString() || "");

const videoEl = ref(null);
const canvasEl = ref(null);

const stream = ref(null);
const errorMsg = ref("");

const delayOptions = [0, 3, 5, 10];
const delaySec = ref(3);

const countdown = ref(0);
const busy = ref(false);

const photoDataUrl = ref(""); // 拍照后的 base64 图片

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 确保 video 已经能读到 videoWidth / videoHeight
 * 防止截到 0x0 的空图
 */
async function ensureVideoReady(video) {
  if (!video) return;

  // readyState >= 2: HAVE_CURRENT_DATA
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    return;
  }

  await new Promise((resolve) => {
    const onReady = () => {
      if (
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        video.removeEventListener("loadedmetadata", onReady);
        video.removeEventListener("canplay", onReady);
        resolve();
      }
    };
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplay", onReady);
  });
}

async function initCamera() {
  errorMsg.value = "";
  photoDataUrl.value = "";

  stopCamera();

  try {
    const s = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    stream.value = s;

    if (videoEl.value) {
      videoEl.value.srcObject = s;
      // play() 有时会被浏览器策略影响，但在 localhost + muted 通常没问题
      await videoEl.value.play();
      await ensureVideoReady(videoEl.value);
    }
  } catch (e) {
    errorMsg.value =
      "请允许浏览器使用摄像头权限。若不在 localhost/https 下运行，浏览器可能阻止摄像头。错误信息：" +
      (e?.message || String(e));
  }
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach((t) => t.stop());
    stream.value = null;
  }
}

async function shoot() {
  // 如果已有照片：点击“重拍”
  if (photoDataUrl.value) {
    photoDataUrl.value = "";
    // ✅ 确保 video 继续播放（更稳）
    videoEl.value?.play?.();
    return;
  }

  if (!videoEl.value || !canvasEl.value || !stream.value) return;

  busy.value = true;
  try {
    // 延时倒计时
    if (delaySec.value > 0) {
      countdown.value = delaySec.value;
      while (countdown.value > 0) {
        await sleep(1000);
        countdown.value -= 1;
      }
    }

    const video = videoEl.value;
    const canvas = canvasEl.value;

    // 关键：确保 video 准备好，避免 0x0
    await ensureVideoReady(video);

    const w = video.videoWidth;
    const h = video.videoHeight;

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);

    photoDataUrl.value = canvas.toDataURL("image/jpeg", 0.92);

    // Debug：确认是否真的截到了图（length 很大说明成功）
    console.log("captured length:", photoDataUrl.value.length, "size:", w, h);
  } finally {
    busy.value = false;
    countdown.value = 0;
  }
}

function confirm() {
  // ✅ Generate 页读取的 key（统一）
  sessionStorage.setItem("styleId", styleId.value);
  sessionStorage.setItem("imageBase64", photoDataUrl.value);

  // ✅ 兼容你原来的命名（保留）
  sessionStorage.setItem("artcam_styleId", styleId.value);
  sessionStorage.setItem("artcam_photo", photoDataUrl.value);

  // ✅ 离开页面前关闭摄像头，避免资源占用
  stopCamera();

  router.push("/generate");
}

function goBack() {
  stopCamera();
  router.push("/styles");
}

onMounted(() => {
  initCamera();
});

onBeforeUnmount(() => {
  stopCamera();
});
</script>

<style scoped>
.camera-page {
  color: var(--text);
}

.top {
  display: grid;
  grid-template-columns: 120px 1fr 120px;
  align-items: center;
  margin-bottom: clamp(10px, 1.4vh, 18px);
}

.back {
  height: clamp(40px, 4.6vh, 54px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(10, 18, 32, 0.65);
  color: var(--text);
  font-size: clamp(14px, 1.6vh, 18px);
  cursor: pointer;
}

.title {
  text-align: center;
  font-size: clamp(18px, 2.2vh, 28px);
  font-weight: 700;
  letter-spacing: 1px;
}

.spacer {
  height: 1px;
}

.hint {
  margin: 6px 2px 12px;
  font-size: clamp(13px, 1.4vh, 16px);
  opacity: 0.9;
}

/* 摄像头区域 */
.stage {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(12, 22, 36, 0.6);
  border: 1px solid rgba(120, 200, 255, 0.22);
  aspect-ratio: 3 / 4;
}

.stage::after {
  content: "";
  position: absolute;
  inset: 12px;
  border-radius: 16px;
  border: 1px dashed rgba(47, 255, 215, 0.25);
  pointer-events: none;
}

/* 关键：video 和 preview 都绝对定位，确保叠层一致 */
.video,
.photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video {
  z-index: 1;
}

.overlay {
  z-index: 2;
}

/* 倒计时遮罩（最上层） */
.countdown {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-items: center;
  font-size: clamp(64px, 10vh, 120px);
  font-weight: 800;
  background: rgba(4, 8, 16, 0.45);
  backdrop-filter: blur(6px);
}

/* 错误遮罩（最上层） */
.error {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: grid;
  place-items: center;
  padding: 18px;
  text-align: center;
  background: rgba(4, 8, 16, 0.65);
}
.errTitle {
  font-size: clamp(18px, 2.2vh, 28px);
  font-weight: 700;
}
.errDesc {
  margin-top: 8px;
  font-size: clamp(13px, 1.4vh, 16px);
  opacity: 0.85;
}
.btn {
  margin-top: 12px;
  height: clamp(44px, 5vh, 54px);
  padding: 0 clamp(16px, 2vh, 22px);
  border-radius: 14px;
  border: none;
  background: linear-gradient(120deg, rgba(47, 255, 215, 0.95), rgba(79, 140, 255, 0.95));
  color: #041018;
  font-weight: 700;
  cursor: pointer;
}

.controls {
  margin-top: clamp(12px, 1.6vh, 20px);
  display: grid;
  gap: 14px;
}

.row {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 10px;
  align-items: center;
}

.label {
  opacity: 0.85;
  font-size: clamp(13px, 1.4vh, 16px);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  height: clamp(34px, 4.2vh, 46px);
  padding: 0 clamp(12px, 1.8vh, 18px);
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(10, 18, 32, 0.6);
  color: var(--text);
  font-size: clamp(13px, 1.4vh, 16px);
  cursor: pointer;
}
.chip.active {
  background: linear-gradient(120deg, rgba(47, 255, 215, 0.95), rgba(79, 140, 255, 0.95));
  color: #041018;
  font-weight: 700;
}

.btnRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(12px, 1.6vh, 18px);
}

.primary,
.secondary {
  height: clamp(48px, 6vh, 62px);
  border-radius: 14px;
  border: none;
  font-weight: 700;
  cursor: pointer;
}

.primary {
  background: linear-gradient(120deg, rgba(47, 255, 215, 0.95), rgba(79, 140, 255, 0.95));
  color: #041018;
}

.secondary {
  background: rgba(12, 22, 36, 0.7);
  color: var(--text);
  border: 1px solid rgba(120, 200, 255, 0.22);
}

.primary:disabled,
.secondary:disabled,
.chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hidden {
  display: none;
}
</style>
