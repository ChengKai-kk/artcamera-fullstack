# 配置详解

## 前端配置

- `artcamera_front/public/config/styles.json`
  - 页面标题、筛选项与风格列表
  - `cover` 路径相对 `public/`

- `artcamera_front/src/config/ai.js`
  - `BASE_URL`：后端 API 地址
  - `API_TOKEN`：请求头 Token
  - `POLL_INTERVAL`：轮询间隔

## 后端环境变量

- `PORT`：服务端口（默认 9000）
- `SERVER_API_TOKEN`：可选鉴权 Token
- `PROVIDER`：`alibaba`、`doubao`、`banana`
- `ALI_DASHSCOPE_KEY`：阿里 DashScope
- `DOUBAO_ARK_KEY`：豆包 Seedream
- `BANANA_API_KEY`：Banana API

## 部署说明

- 前端路由基路径配置为 `/artcamera-web/`
- 后端面向阿里云函数计算部署
