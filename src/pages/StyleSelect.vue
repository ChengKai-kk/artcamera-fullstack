<template>
  <div class="app-page style-page">
    <header class="top">
      <button class="back" @click="goHome">← 返回</button>
      <div class="title">{{ pageTitle }}</div>
      <div class="spacer"></div>
    </header>

    <!-- 加载中 -->
    <div v-if="status === 'loading'" class="grid">
      <div v-for="i in 6" :key="i" class="card skeleton"></div>
    </div>

    <!-- 失败 -->
    <div v-else-if="status === 'error'" class="center">
      <div class="errTitle">配置加载失败</div>
      <div class="errDesc">{{ errorMsg }}</div>
      <button class="btn" @click="load">重试</button>
    </div>

    <!-- 成功 -->
    <div v-else>
      <!-- 筛选区 -->
      <section class="filters panel">
        <div class="filterRow">
          <div class="label">人群</div>
          <div class="chips">
            <button
              v-for="a in filterAudience"
              :key="a"
              class="chip"
              :class="{ active: selectedAudience === a }"
              @click="selectedAudience = a"
            >
              {{ a }}
            </button>
          </div>
        </div>

        <div class="filterRow">
          <div class="label">类型</div>
          <div class="chips">
            <button
              v-for="t in filterTags"
              :key="t"
              class="chip"
              :class="{ active: selectedTag === t }"
              @click="selectedTag = t"
            >
              {{ t }}
            </button>
          </div>
        </div>
      </section>

      <!-- 结果计数 -->
      <div class="hint">
        共 <b>{{ filteredStyles.length }}</b> 个风格
        <button class="clear" @click="resetFilters">清除筛选</button>
      </div>

      <!-- 卡片列表 -->
      <div class="grid">
        <button
          v-for="s in filteredStyles"
          :key="s.id"
          class="card"
          @click="selectStyle(s)"
        >
          <img class="cover" :src="s.cover" :alt="s.name" />
          <div class="mask"></div>
          <div class="meta">
            <div class="name">{{ s.name }}</div>
            <div class="desc">{{ s.desc }}</div>
            <div class="badges">
              <span v-for="b in showBadges(s)" :key="b" class="badge">{{
                b
              }}</span>
            </div>
          </div>
        </button>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredStyles.length === 0" class="empty">
        没有符合条件的风格，请换个筛选试试
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const pageTitle = ref("请选择风格");
const styles = ref([]);

const filterAudience = ref(["全部"]);
const filterTags = ref(["全部"]);

const selectedAudience = ref("全部");
const selectedTag = ref("全部");

const status = ref("loading");
const errorMsg = ref("");

async function load() {
  status.value = "loading";
  errorMsg.value = "";

  try {
    // ✅ 关键：用 BASE_URL 适配 GitHub Pages 子路径部署（/artcamera-web/）
    const url = `${import.meta.env.BASE_URL}config/styles.json`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    pageTitle.value = data.title || "请选择风格";
    styles.value = Array.isArray(data.styles) ? data.styles : [];

    // 筛选项可配置
    filterAudience.value =
      data?.filters?.audience?.length > 0 ? data.filters.audience : ["全部"];
    filterTags.value =
      data?.filters?.tags?.length > 0 ? data.filters.tags : ["全部"];

    // 默认选“全部”
    selectedAudience.value = filterAudience.value[0] || "全部";
    selectedTag.value = filterTags.value[0] || "全部";

    if (styles.value.length === 0) {
      throw new Error("styles 列表为空，请检查 public/config/styles.json");
    }

    status.value = "ready";
  } catch (e) {
    status.value = "error";
    errorMsg.value = e?.message || String(e);
  }
}

const filteredStyles = computed(() => {
  return styles.value.filter((s) => {
    const okAudience =
      selectedAudience.value === "全部" ||
      (Array.isArray(s.audience) && s.audience.includes(selectedAudience.value)) ||
      // 允许 style 写了“全部”表示对所有人群都可用
      (Array.isArray(s.audience) && s.audience.includes("全部"));

    const okTag =
      selectedTag.value === "全部" ||
      (Array.isArray(s.tags) && s.tags.includes(selectedTag.value)) ||
      (Array.isArray(s.tags) && s.tags.includes("全部"));

    return okAudience && okTag;
  });
});

function showBadges(s) {
  const a = Array.isArray(s.audience) ? s.audience : [];
  const t = Array.isArray(s.tags) ? s.tags : [];
  // 展示少量标签，避免卡片太乱
  return [...a.filter((x) => x !== "全部"), ...t.filter((x) => x !== "全部")].slice(0, 3);
}

function resetFilters() {
  selectedAudience.value = filterAudience.value[0] || "全部";
  selectedTag.value = filterTags.value[0] || "全部";
}

function selectStyle(s) {
  router.push({ path: "/camera", query: { styleId: s.id } });
}

function goHome() {
  router.push("/");
}

onMounted(load);
</script>

<style scoped>
.style-page {
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

/* 筛选区 */
.filters {
  display: grid;
  gap: 12px;
  padding: clamp(12px, 1.6vh, 20px);
  margin-bottom: clamp(8px, 1.2vh, 16px);
}

.filterRow {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 10px;
  align-items: start;
}

.label {
  opacity: 0.85;
  font-size: clamp(13px, 1.4vh, 16px);
  padding-top: 6px;
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
  background: linear-gradient(120deg, rgba(47, 255, 215, 0.9), rgba(79, 140, 255, 0.9));
  color: #041018;
  border-color: rgba(47, 255, 215, 0.6);
  font-weight: 700;
}

/* 结果提示 */
.hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: clamp(8px, 1.2vh, 14px) 2px clamp(10px, 1.6vh, 18px);
  font-size: clamp(13px, 1.4vh, 16px);
  opacity: 0.9;
}
.clear {
  border: none;
  background: transparent;
  color: var(--muted);
  text-decoration: underline;
  cursor: pointer;
  font-size: clamp(12px, 1.4vh, 16px);
}

/* 网格卡片 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: clamp(12px, 1.8vh, 18px);
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (max-width: 720px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
  .filterRow {
    grid-template-columns: 1fr;
  }
  .label {
    padding-top: 0;
  }
}

@media (orientation: portrait) and (min-height: 2400px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: clamp(16px, 2.2vh, 26px);
  }
  .card {
    border-radius: 22px;
  }
  .name {
    font-size: clamp(18px, 2.2vh, 24px);
  }
  .desc {
    font-size: clamp(14px, 1.6vh, 18px);
  }
  .badge {
    font-size: clamp(12px, 1.4vh, 16px);
  }
}

.card {
  position: relative;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(12, 22, 36, 0.6);
  aspect-ratio: 3 / 4;
  border: 1px solid rgba(120, 200, 255, 0.18);
  box-shadow: 0 12px 30px rgba(5, 10, 18, 0.45);
}

.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(6, 10, 18, 0.05),
    rgba(4, 8, 16, 0.68)
  );
}

.meta {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 14px;
}

.name {
  font-size: clamp(15px, 1.8vh, 20px);
  font-weight: 700;
}

.desc {
  margin-top: 6px;
  font-size: clamp(12px, 1.4vh, 16px);
  opacity: 0.85;
}

.badges {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.badge {
  font-size: clamp(11px, 1.2vh, 14px);
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(47, 255, 215, 0.16);
  border: 1px solid rgba(47, 255, 215, 0.2);
}

/* Skeleton */
.skeleton {
  background: rgba(12, 22, 36, 0.6);
  position: relative;
}
.skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    rgba(120, 200, 255, 0.05),
    rgba(120, 200, 255, 0.16),
    rgba(120, 200, 255, 0.05)
  );
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

.empty {
  margin-top: 16px;
  text-align: center;
  opacity: 0.8;
  font-size: clamp(13px, 1.4vh, 16px);
}

/* 错误态 */
.center {
  margin-top: 80px;
  display: grid;
  justify-items: center;
  gap: 12px;
  text-align: center;
}
.errTitle {
  font-size: clamp(18px, 2.2vh, 28px);
  font-weight: 700;
}
.errDesc {
  opacity: 0.8;
  font-size: clamp(13px, 1.4vh, 16px);
  max-width: 520px;
}
.btn {
  height: clamp(44px, 5vh, 54px);
  padding: 0 clamp(16px, 2vh, 22px);
  border-radius: 14px;
  border: none;
  background: linear-gradient(120deg, rgba(47, 255, 215, 0.95), rgba(79, 140, 255, 0.95));
  color: #041018;
  font-weight: 700;
  cursor: pointer;
}
</style>
