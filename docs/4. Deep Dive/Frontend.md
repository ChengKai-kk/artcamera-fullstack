# 前端详解

## 入口文件

- `artcamera_front/src/main.js` 创建应用并挂载路由
- `artcamera_front/src/App.vue` 仅包含 `router-view`

## 路由

- `artcamera_front/src/router/index.js` 定义页面路径：
  - `/` -> Home
  - `/styles` -> StyleSelect
  - `/camera` -> Camera
  - `/generate` -> Generate
  - `/save` -> Save
- 路由基路径为 GitHub Pages 的 `/artcamera-web/`

## 页面职责

- `Home.vue`：首页与轮播入口
- `StyleSelect.vue`：读取 `public/config/styles.json`，按人群/标签筛选风格
- `Camera.vue`：打开摄像头、倒计时拍照、写入 sessionStorage
- `Generate.vue`：调用后端生成、轮询状态、成功后跳转保存页
- `Save.vue`：读取结果、生成二维码、无操作超时返回首页

## AI 配置

- `artcamera_front/src/config/ai.js`：
  - `BASE_URL`：后端 API 地址
  - `API_TOKEN`：可选 Token
  - `POLL_INTERVAL`：轮询频率

## 样式与布局

- `artcamera_front/src/styles/global.css` 提供全局变量与基础样式
- 页面使用 scoped 样式覆盖局部布局

## 静态资源

- `public/config/styles.json` 引用 `public/styles/` 下的封面
- 页面素材位于 `src/assets/`
