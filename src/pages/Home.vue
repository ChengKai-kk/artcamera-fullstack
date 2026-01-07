<template>
  <!-- 整屏可点：符合“点击屏幕开始体验” -->
  <div class="kiosk app-page" @click="start">
    <!-- 主视觉区：效果图轮播 -->
    <section class="hero" @click.stop="start">
      <div class="tag">效果图</div>

      <!-- 语言按钮（先做外观，后面再接功能） -->
      <button class="lang" type="button" @click.stop="toggleLang">
        A {{ langLabel }}
      </button>

      <div class="frame">
        <div class="track" :style="trackStyle">
          <div class="slide" v-for="(s, i) in slides" :key="i">
            <img :src="s.src" class="img" :alt="s.title" />
          </div>
        </div>

        <!-- 左下小预览（像你截图那样） -->
        <div class="preview">
          <img :src="slides[current].src" class="previewImg" alt="preview" />
        </div>
      </div>
    </section>

    <!-- 开始按钮（主要入口） -->
    <div class="startWrap">
      <button class="startBtn btn" type="button" @click.stop="start">
        点击屏幕开始体验
      </button>
    </div>

    <!-- 使用流程说明（底部 01/02/03） -->
    <section class="flow" @click.stop="start">
      <div class="card" v-for="(st, i) in steps" :key="i">
        <div class="no">{{ String(i + 1).padStart(2, "0") }}</div>
        <img :src="st.src" class="thumb" :alt="st.title" />
        <div class="title">{{ st.title }}</div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import effect1 from "../assets/effects/effect-1.jpg";
import effect2 from "../assets/effects/effect-2.jpg";
import effect3 from "../assets/effects/effect-3.jpg";

import step1 from "../assets/steps/step-1.jpg";
import step2 from "../assets/steps/step-2.jpg";
import step3 from "../assets/steps/step-3.jpg";

const router = useRouter();

const slides = [
  { src: effect1, title: "效果 1" },
  { src: effect2, title: "效果 2" },
  { src: effect3, title: "效果 3" },
];

const steps = [
  { src: step1, title: "选择风格" },
  { src: step2, title: "拍摄/上传" },
  { src: step3, title: "照片打印" }, // 你也可以改成“生成/保存”
];

const current = ref(0);
let timer = null;

// 轮播位移
const trackStyle = computed(() => ({
  transform: `translateX(-${current.value * 100}%)`,
}));

function next() {
  current.value = (current.value + 1) % slides.length;
}

function start() {
  router.push("/styles"); // 按流程进入“选择风格”
}

// 语言按钮先做 UI（后面再接 i18n）
const lang = ref("zh");
const langLabel = computed(() => (lang.value === "zh" ? "简体中文" : "English"));
function toggleLang() {
  lang.value = lang.value === "zh" ? "en" : "zh";
}

onMounted(() => {
  timer = setInterval(next, 3500);
});
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  timer = null;
});
</script>

<style scoped>
/* 大屏竖屏：尽量占满，字体/按钮远距离可读 */
.kiosk {
  min-height: 100vh;
  display: grid;
  grid-template-rows: 1fr auto auto;
  gap: clamp(14px, 2vh, 24px);
  user-select: none;
}


.hero {
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  background: rgba(12, 22, 36, 0.6);
  border: 1px solid rgba(120, 200, 255, 0.18);
  box-shadow: 0 20px 60px rgba(5, 10, 18, 0.5);
}

.hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 0%, rgba(47, 255, 215, 0.08) 50%, transparent 100%);
  animation: sweep 6s ease-in-out infinite;
  pointer-events: none;
}

/* 顶部“效果图”标签 */
.tag {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 3;
  padding: 8px 16px;
  border-radius: 999px;
  font-weight: 700;
  font-size: clamp(14px, 2vh, 20px);
  background: rgba(10, 18, 32, 0.7);
  border: 1px solid rgba(120, 200, 255, 0.3);
  backdrop-filter: blur(8px);
}

/* 右上语言按钮 */
.lang {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 3;
  border: 1px solid rgba(120, 200, 255, 0.3);
  background: rgba(10, 18, 32, 0.6);
  color: var(--text);
  padding: 10px 16px;
  border-radius: 12px;
  font-size: clamp(14px, 1.8vh, 18px);
  cursor: pointer;
}

.frame {
  width: 100%;
  height: 100%;
  position: relative;
}

.track {
  height: 100%;
  display: flex;
  transition: transform 600ms ease;
}

.slide {
  min-width: 100%;
  height: 100%;
}

.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 左下小预览 */
.preview {
  position: absolute;
  left: 16px;
  bottom: 16px;
  width: clamp(120px, 14vw, 180px);
  height: clamp(120px, 14vw, 180px);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(47, 255, 215, 0.7);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  z-index: 3;
}
.previewImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.startWrap {
  display: flex;
  justify-content: center;
}

.startBtn {
  width: min(860px, 92vw);
  height: clamp(64px, 8vh, 96px);
  border: none;
  border-radius: 22px;
  background: linear-gradient(120deg, rgba(47, 255, 215, 0.95), rgba(79, 140, 255, 0.95));
  color: #041018;
  font-size: clamp(20px, 3vh, 32px);
  font-weight: 800;
  letter-spacing: 0.6px;
  cursor: pointer;
  box-shadow: 0 18px 40px rgba(47, 255, 215, 0.28);
}

/* 底部流程卡片 */
.flow {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(10px, 1.6vh, 16px);
}



.card {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(12, 22, 36, 0.6);
  border: 1px solid rgba(120, 200, 255, 0.18);
  padding: 14px;
  box-sizing: border-box;
}

.no {
  font-weight: 800;
  font-size: clamp(16px, 2vh, 22px);
  opacity: 0.9;
  margin-bottom: 10px;
}

.thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 14px;
  object-fit: cover;
  display: block;
  border: 1px solid rgba(120, 200, 255, 0.18);
}

.title {
  margin-top: 8px;
  font-size: clamp(13px, 1.6vh, 18px);
  font-weight: 700;
}

/* 适配较小分辨率时缩放一点 */
@media (max-width: 900px) {
  .startBtn {
    height: 64px;
    font-size: 20px;
  }
  .tag {
    font-size: 14px;
  }
  .flow {
    gap: 10px;
  }
}

@keyframes sweep {
  0%, 100% { opacity: 0.1; transform: translateX(-10%); }
  50% { opacity: 0.4; transform: translateX(10%); }
}
</style>
