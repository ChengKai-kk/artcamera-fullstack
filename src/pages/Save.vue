<template>
  <div class="app-page save-page">
    <header class="page-head">
      <div class="eyebrow">Art Camera</div>
      <h1 class="page-title">扫码保存</h1>
      <div class="page-subtitle">请使用手机扫码保存作品</div>
    </header>

    <div v-if="!resultUrl" class="empty">
      <p>没有找到生成结果，请先生成图片。</p>
      <div class="actions">
        <button class="btn btn-primary" @click="goGenerate">去生成</button>
        <button class="btn btn-ghost" @click="goHome">返回首页</button>
      </div>
    </div>

    <div v-else class="content">
      <div class="tip">
        用手机扫码打开图片链接，然后长按图片保存（链接可能会过期，请尽快保存）<br />
        <span class="idleTip">无操作 {{ idleSeconds }} 秒将自动返回首页</span>
      </div>

      <div class="qr-box">
        <img v-if="qrDataUrl" :src="qrDataUrl" class="qr-img" alt="qr" />
        <div v-else class="loading">二维码生成中...</div>
      </div>

      <div class="img-box">
        <img :src="resultUrl" class="result-img" alt="result" />
      </div>

      <div class="actions">
        <button class="btn btn-ghost" @click="copyLink">复制链接</button>
        <button class="btn btn-ghost" @click="goGenerate">返回生成页</button>
        <button class="btn btn-primary" @click="goHome">返回首页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import QRCode from "qrcode";

const router = useRouter();

const resultUrl = ref("");
const qrDataUrl = ref("");

// ====== 无操作自动回首页 ======
const IDLE_MS = 60 * 1000; // 60 秒
const idleSeconds = Math.floor(IDLE_MS / 1000);

let idleTimer = null;

function resetIdle() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    router.replace("/"); // 超时直接回首页，不堆栈历史
  }, IDLE_MS);
}

function bindIdleEvents() {
  const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
  const opts = { passive: true };
  events.forEach((ev) => window.addEventListener(ev, resetIdle, opts));

  // 初始化一次
  resetIdle();

  return () => {
    events.forEach((ev) => window.removeEventListener(ev, resetIdle));
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
  };
}

let unbindIdle = null;

// ====== 业务逻辑 ======
async function makeQr(url) {
  qrDataUrl.value = await QRCode.toDataURL(url, {
    width: 360,
    margin: 1,
  });
}

function goGenerate() {
  router.push("/generate");
}

function goHome() {
  router.push("/");
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(resultUrl.value);
    alert("链接已复制");
  } catch (e) {
    alert("复制失败：浏览器可能未授权剪贴板权限");
  }
}

onMounted(async () => {
  // 读取生成结果
  resultUrl.value = sessionStorage.getItem("resultUrl") || "";

  // 生成二维码
  if (resultUrl.value) {
    await makeQr(resultUrl.value);
  }

  // 绑定无操作回首页
  unbindIdle = bindIdleEvents();
});

onBeforeUnmount(() => {
  if (unbindIdle) unbindIdle();
});
</script>

<style scoped>
.save-page {
  align-items: center;
  color: var(--text);
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

.empty {
  margin-top: clamp(24px, 4vh, 40px);
  text-align: center;
}

.content {
  width: min(900px, 95vw);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(14px, 2vh, 22px);
}

.tip {
  opacity: 0.92;
  font-size: clamp(13px, 1.6vh, 18px);
  text-align: center;
  line-height: 1.5;
}

.idleTip {
  display: inline-block;
  margin-top: 6px;
  opacity: 0.8;
  font-size: clamp(12px, 1.4vh, 16px);
}

.qr-box {
  background: rgba(10, 18, 32, 0.8);
  padding: clamp(12px, 1.6vh, 20px);
  border-radius: 18px;
  border: 1px solid rgba(47, 255, 215, 0.4);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4);
}

.qr-img {
  width: clamp(220px, 30vh, 360px);
  height: clamp(220px, 30vh, 360px);
  display: block;
}

.loading {
  color: var(--text);
  font-size: clamp(13px, 1.4vh, 16px);
}

.img-box {
  width: 100%;
  display: flex;
  justify-content: center;
}

.result-img {
  max-width: 100%;
  max-height: 55vh;
  border-radius: 18px;
  border: 1px solid rgba(120, 200, 255, 0.28);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.4);
}

.actions {
  display: flex;
  gap: clamp(10px, 1.6vh, 16px);
  margin-top: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

/* Use global .btn / .btn-ghost tokens from src/style.css */
</style>
