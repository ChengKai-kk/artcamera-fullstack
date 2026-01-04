<template>
  <div class="page">
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
      <section class="filters">
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
.page {
  min-height: 100vh;
  background: #0b0c10;
  color: #fff;
  padding: 18px;
  box-sizing: border-box;
}

.top {
  display: grid;
  grid-template-columns: 90px 1fr 90px;
  align-items: center;
  margin-bottom: 12px;
}

.back {
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.title {
  text-align: center;
  font-size: 18px;
  font-weight: 900;
}

.spacer {
  height: 1px;
}

/* 筛选区 */
.filters {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 10px;
}

.filterRow {
  display: grid;
  grid-template-columns: 46px 1fr;
  gap: 10px;
  align-items: start;
}

.label {
  opacity: 0.85;
  font-size: 13px;
  padding-top: 6px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.chip.active {
  background: #fff;
  color: #0b0c10;
  border-color: rgba(255, 255, 255, 0.4);
  font-weight: 800;
}

/* 结果提示 */
.hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 2px 12px;
  font-size: 13px;
  opacity: 0.9;
}
.clear {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: underline;
  cursor: pointer;
  font-size: 13px;
}

/* 网格卡片 */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.card {
  position: relative;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  aspect-ratio: 3 / 4;
  border: 1px solid rgba(255, 255, 255, 0.10);
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
    rgba(0, 0, 0, 0.05),
    rgba(0, 0, 0, 0.60)
  );
}

.meta {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 14px;
}

.name {
  font-size: 16px;
  font-weight: 900;
}

.desc {
  margin-top: 6px;
  font-size: 13px;
  opacity: 0.85;
}

.badges {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

/* Skeleton */
.skeleton {
  background: rgba(255, 255, 255, 0.06);
  position: relative;
}
.skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05),
    rgba(255, 255, 255, 0.12),
    rgba(255, 255, 255, 0.05)
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
  font-size: 13px;
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
  font-size: 18px;
  font-weight: 900;
}
.errDesc {
  opacity: 0.8;
  font-size: 13px;
  max-width: 520px;
}
.btn {
  height: 44px;
  padding: 0 18px;
  border-radius: 12px;
  border: none;
  background: #fff;
  color: #0b0c10;
  font-weight: 800;
  cursor: pointer;
}
</style>
