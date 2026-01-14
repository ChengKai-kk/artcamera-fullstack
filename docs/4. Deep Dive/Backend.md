# 后端详解

## 入口

- `artcamera_backend/index.js` 启动 Express 服务，包含 JSON 解析与 CORS 处理

## API 接口

- `POST /generate`
  - 输入：`{ imageBase64, styleId }`
  - 输出：`{ taskId }`
- `GET /tasks/:id`
  - 输出：`{ status, resultUrl?, error? }`

## 鉴权

若设置 `SERVER_API_TOKEN`，请求需带 `X-API-Token`。

## Provider 选择

- 通过 `PROVIDER` 环境变量选择：`alibaba`、`doubao`、`banana`
- 默认 `doubao`

## Provider 接口规范

每个 Provider 实现：

- `generate({ imageBase64, styleId }) -> taskId`
- `query(taskId) -> { status, resultUrl?, error? }`

## Provider 细节

- Alibaba DashScope
  - 异步任务接口
  - 需要 `ALI_DASHSCOPE_KEY`
- Doubao Seedream
  - 同步生成接口
  - 需要 `DOUBAO_ARK_KEY`
  - 结果写入内存缓存并生成伪 taskId
- Banana API
  - 图片编辑接口
  - 需要 `BANANA_API_KEY`
  - 结果写入内存缓存并生成伪 taskId

## Prompt 映射

- 风格 id 前缀：`west`、`anime`、`retro`
- 未匹配时使用默认提示词

## 任务存储

- `memoryTasks` 用于同步 Provider 的结果缓存
- 无持久化，进程重启后失效
