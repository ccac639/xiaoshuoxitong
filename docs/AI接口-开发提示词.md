# AI 接口层 · 设计规格与开发提示词

> **用途**：把 `xiaoshuoxitong` 现有的「统一 AI 接口层」提炼成**语言无关的设计规格** + 一份**可直接喂给新项目 AI 助手的开发提示词**。
> 你重开项目时，无需把 TypeScript 逐行翻译成 Python——直接把文末第 9 节的「开发提示词」贴给新项目的 AI 助手，指明目标栈（**Python 后端 + React 18 前端**），即可重生一套等价实现。
>
> **新项目栈已确定**：后端 Python（FastAPI + asyncio + httpx）承载 AI 接口层；前端 React 18（Vite 等）通过普通 HTTP 调用后端 API。参见 §2 提示——此栈下「Next.js 中文乱码」坑**完全不存在**，无需任何 fetch 绕过。
>
> 本文件覆盖：`src/server/ai/aiClient.ts` + `src/server/http/nativeFetch.ts` + `src/server/http/nativeFetchWorker.cjs` + `src/server/generation/modelRouter.ts` + 写作流 6 阶段调用约定。

---

## 0. 一句话定位

**AI 接口层 = 小说创作系统对 LLM 的唯一出入口。** 它只负责：

1. 多 Provider 路由（SiliconFlow / 智谱 / OpenRouter / 移动云 MoMA，全部 OpenAI 兼容）
2. 按「模型角色」选模型（cheap / longctx / creative / auditor）
3. 推理模型「思考链」开关控制（关错 → 正文为空）
4. 超时 / 冷启动 404 重试 / 响应损坏重试
5. Token 成本统计
6. JSON 围栏（```json）剥离

**它永不直接写业务 Prompt，不碰 World State / Event / Memory。** 这些是上层（写作流、Skill、Agent）的事。这一边界在新项目里必须保持。

---

## 1. 分层架构（语言无关）

```
业务方（写作流 6 阶段 / Skill / Agent）
        │  chat(role, messages, opts)
        ▼
┌─────────────────────────────┐
│  Client 门面（AIClient）      │  统一入口：chat(role) / chatWithModel(id)
│  - getAIClient() 单例         │
└──────────────┬──────────────┘
               │  内部 selectModel(role) → ModelConfig
               ▼
┌─────────────────────────────┐
│  Router（ModelRouter）        │  4 角色默认选模 + 注册表 + 别名解析 + 成本计算
└──────────────┬──────────────┘
               │  ModelConfig{provider, model, ...}
               ▼
┌─────────────────────────────┐
│  Provider 适配（PROVIDERS）   │  4 家供应商 baseUrl / apiKey / 思考链参数注入
└──────────────┬──────────────┘
               │  POST {baseUrl}/chat/completions  Bearer
               ▼
┌─────────────────────────────┐
│  Transport（HTTP 传输层）      │  见第 2 节——这是唯一有坑的地方
└─────────────────────────────┘
```

**职责边界（新项目务必遵守）**：Transport 层只做「发 HTTP + 收 UTF-8 文本」，不承载任何 Prompt / Skill / Memory / Event 逻辑。

---

## 2. 💥 最重要的踩坑：Next.js 会破坏中文响应体（仅 Next.js 项目需要规避）

### 现象
前端（Next.js 14 dev server）调用移动云 MoMA 时，中文响应里出现大量 `U+FFFD`（�）替换符，正文全毁。但用**独立的 `node` 脚本**直接请求同一接口，中文完全正常。

### 根因（已定位，非编码 / JSON.parse / LLM 返回问题）
Next.js dev 运行时会 **patch 全局 `fetch` 与 `node:https` 的响应体处理**。即便你在代码里改用原生 `node:https` 直接请求，只要**仍处在 Next 运行时内**，响应字节就会被这个 patch 破坏——尤其当网关返回 `Content-Encoding: gzip` 且 Next 在解压/解码环节出错时，中文 UTF-8 多字节序列被拆坏成 `U+FFFD`。

> 这是**传输层问题**：移动云 gzip 字节 → Next fetch patch → decode 错误 → U+FFFD。与你的 Prompt、JSON、模型无关。

### 已验证有效的修复（仅 Next.js 需要）
把真实 HTTP 请求放进一个**独立的 node 子进程**（`nativeFetchWorker.cjs`），该进程**不加载 Next 运行时**，因此 `node:https` 表现与独立脚本一致。父子进程用 `spawn` 通信，响应体以 **base64** 传输，彻底隔离编码歧义。

`nativeFetchWorker.cjs` 关键要点：
- `node:https` / `node:http` POST 到 `{baseUrl}/chat/completions`
- **强制 `Accept-Encoding: identity`**（避免服务端返回 gzip，Next 会在解压时损坏）
- 若响应仍带 `gzip/deflate/br`，用 `zlib` 解压
- 响应文本 `Buffer.toString('utf-8')` → base64 → stdout 输出 `{status, bodyB64}`
- 进程**不输出任何额外日志**（保持 stdout 纯净，便于父进程 JSON.parse）
- 父进程 `nativePostJson()` 收到后 `Buffer.from(bodyB64,'base64').toString('utf-8')` 还原

额外韧性：若解码后文本仍含 `U+FFFD`（某些网络环境下响应体被间歇性字节损坏），`nativePostJson` 自动重试（默认 1 次）。

### ⚠️ 对「新项目（Python 后端 + React 18 前端）」的关键提示
**这个坑在新栈下完全不存在**，理由有二：
1. **AI 调用在 Python 后端**：用 `httpx`（`AsyncClient`）发请求，标准库层面正确处理 UTF-8 与 gzip，中文天然正常，无需任何子进程 / base64 / 强制 identity 的绕过。
2. **React 18 前端只调用你自己的后端 API**：浏览器原生 `fetch` / `axios` 正确处理 `Content-Encoding: gzip`，不存在 Next.js 服务端运行时 patch 全局 `fetch` 的问题，所以前端也无需绕过。

结论：第 9 节的开发提示词已按「Python 项目无需 worker 绕过」来写。**只有当你在新项目里仍用 Next.js 作为服务端框架时才需要保留「独立子进程 + base64 + 强制 identity」那套方案**——而你的栈是 Python + React 18，故直接忽略本节实现即可。

---

## 3. Provider 配置（4 家，全部 OpenAI 兼容）

统一约定：
- 端点：`POST {baseUrl}/chat/completions`
- 鉴权：`Authorization: Bearer {API_KEY}`
- 请求体：`{ model, messages, temperature, max_tokens, stream: false }`
- 返回：`choices[0].message.content`、`usage.prompt_tokens / completion_tokens`

| Provider | baseUrl | 环境变量（Key） | 代表模型 | 备注 |
|---|---|---|---|---|
| **SiliconFlow** | `https://api.siliconflow.cn/v1` | `SILICONFLOW_API_KEY` | `deepseek-ai/DeepSeek-V4-Flash`（cheap，近乎免费）<br>`deepseek-ai/DeepSeek-V4-Pro`（creative，付费） | 国内稳定，主力备选 |
| **智谱 BigModel** | `https://open.bigmodel.cn/api/paas/v4` | `ZHIPU_API_KEY` | `glm-4.7-flash`（免费，200K 上下文） | **推理模型，必须关思考**（`thinking.type=disabled`），否则 content 为空 |
| **OpenRouter** | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` | `tencent/hy3:free`（262K）<br>`qwen/qwen3-coder:free`（1M）<br>`qwen/qwen3-next-80b-a3b-instruct:free` | 聚合多厂商免费国内模型；推理模型需 `chat_template_kwargs.enable_thinking=false` |
| **移动云 MoMA** | `https://zhenze-huhehaote.cmecloud.cn/v1` | `MOMA_API_KEY` | `deepseek-v4-flash`（免费，赠送 2500 万 tokens） | 网关**按需加载模型，冷启动首次请求可能 404**，需重试（见第 6 节） |

> 真实 API Key 一律走环境变量，**绝不**硬编码进任何会被提交的文件。`.env.local` / `.env` 必须被 gitignore。

---

## 4. 模型路由与成本

### 4.1 四种角色（ModelRole）
| 角色 | 用途 | 默认模型 |
|---|---|---|
| `cheap` | 清洗、摘要、标签、风格卡提取 | `glm-4.7-flash`（智谱免费） |
| `longctx` | 读大纲、检查长线一致性 | `tencent-hy3-free`（OpenRouter 腾讯混元免费，262K） |
| `creative` | 正文初稿、关键高潮章 | `glm-4.7-flash`（智谱免费，推理模型长文易空故用 GLM） |
| `auditor` | 独立审查，不参与写作 | `glm-4.7-flash`（智谱免费） |

### 4.2 模型注册表结构（每条 ModelConfig）
```jsonc
{
  "provider": "siliconflow | zhipu | openrouter | moma",
  "model": "API 真实模型名",
  "role": "cheap | longctx | creative | auditor",
  "maxTokens": 8192,
  "contextWindow": 128000,
  "costPer1kInput": 0.0001,   // USD
  "costPer1kOutput": 0.0001,  // USD
  "id": "注册表 key（代码注入，成本计算优先用它精确命中）"
}
```

### 4.3 成本公式
```
cost = (prompt_tokens / 1000) * costPer1kInput
     + (completion_tokens / 1000) * costPer1kOutput
```
- 同时支持按「注册表 key」与「模型全名」查找单价（避免 `moma` 的 `deepseek-v4-flash` 与 `siliconflow` 的 key 重名歧义）。
- 成本单价目前多为占位（免费模型为 0）。**上线前务必到各平台控制台核对真实报价**替换占位值。

### 4.4 别名解析（可选，提升易用性）
用户可用短别名调用（如 `moma`、`glm`、`sf`、`hy3`、`qwen`）。解析时：小写 + 去除空格/连字符/下划线/点/斜杠后匹配，故 `SFV4-Flash` / `sfv4flash` / `deepseekv4flash` 等价。新项目若不需要可省略，但建议保留「4 角色默认选模」逻辑。

---

## 5. 推理模型「思考链」关闭（否则正文为空）

`glm-4.7-flash`、`tencent/hy3` 等推理模型**默认开启思考链**，会把 `max_tokens` 预算全花在 reasoning 上，导致 `content` 为空。客户端默认**关闭思考**：

| Provider | 关闭思考的参数注入（仅在 `thinking` 未显式开启时） |
|---|---|
| 智谱（zhipu） | `body.thinking = { type: 'disabled' }` |
| OpenRouter | `body.chat_template_kwargs = { enable_thinking: false }` |
| SiliconFlow / MoMA | 无需特殊处理（DeepSeek-V4 默认直出） |

`ChatOptions.thinking` 设为 `true` 可临时打开（适合审计 / 长线一致性等分析型任务，但要更长超时、更多 token）。

---

## 6. MoMA 冷启动 404 重试

移动云 MoMA 网关**按需加载模型**：长时间无请求后首次调用可能返回 `404`（触发后端加载，加载完即正常）。客户端对 `moma` 的 `404` 做**有限重试**：最多 3 次，每次间隔 4 秒，等模型就绪后正常返回。非 404 的 4xx/5xx 直接报错。

---

## 7. JSON 围栏剥离

写作流多个阶段要求模型返回纯 JSON，但模型常包 ```` ```json ... ``` ````。提供 `stripJsonFences(text)`：
- 正则匹配 `^```(?:json)?\s*([\s\S]*?)\s*```$`，命中则取内部并 trim；
- 未包裹围栏则原样返回（对纯正文无副作用）。
- `asJson: true` 时，取回 `content` 后立即剥离。

> 注意：仅「非正文」阶段（planning / beat_sheet / auditing / revising 的 JSON 产出）剥离；**正文阶段（drafting）不剥离**（本身就是散文）。

---

## 8. 写作流如何使用该接口（6 阶段，便于对齐）

`ChapterWriterV2` 通过 `AIClient.chat(role, messages, opts)` 串起 6 个阶段，每个阶段把上一阶段的产物作为下一阶段的上下文。新项目重写写作流时，保持这 6 个阶段与角色映射即可无缝复用接口层：

| 阶段 | state | 调用角色 | asJson | 说明 |
|---|---|---|---|---|
| 1. planChapter | `planning` | `creative` | ✅ | 规划本章目标、冲突、人物弧 |
| 2. writeBeatSheet | `beat_sheet` | `creative` | ✅ | 写出节拍表（场景序列） |
| 3. draftChapter | `drafting` | `creative` | ❌ | 生成正文散文（**不剥离 JSON**） |
| 4. auditChapter | `auditing` | `auditor` | ✅ | 独立审查（连贯性/人设/事实）打分 |
| 5. reviseChapter | `revising` | `creative` | ✅ | 按审计意见修订（条件触发：分数低于阈值才修订） |
| 6. commitChapter | `committed` | — | — | 落库（事件溯源 + World State 投影） |

任一阶段抛错 → `state.stage = 'failed'`。审计低于阈值才进入 revise，否则直跳 commit。

---

## 9. 🚀 可直接粘贴的「开发提示词」（喂给新项目 AI 助手）

> 把下面整段复制给新项目的 AI 编程助手，并确认目标语言。以下默认按 **Python + FastAPI + asyncio + httpx** 写；若你用其他栈，把首行「用 Python」改成你的栈即可。

```markdown
# 任务：实现一个统一 AI 接口层（小说创作系统的 LLM 唯一出入口）

用 Python（FastAPI + asyncio + httpx）实现**后端 AI 接口层**；前端为 **React 18**（Vite 等），通过普通 HTTP 调用本层暴露的 API，不做任何 fetch 绕过。
这个接口层服务于一个 AI 长篇小说创作系统，目标是支撑百万字写作，第 1000 章仍能回忆第 1 章剧情。
（注：本项目栈为 Python 后端 + React 18 前端，**不存在 Next.js 中文乱码问题**，传输层直接用 httpx 即可，不要实现任何子进程 / base64 / 强制 identity 的绕过逻辑。）

## 一、边界约束（必须遵守）
1. 本层只做：多 Provider 路由、按角色选模、思考链开关、超时/重试、成本统计、JSON 围栏剥离。
2. 本层**绝不**写业务 Prompt，绝不碰 World State / Event / Memory / Skill / Agent。
3. 真实 API Key 一律从环境变量读取，绝不硬编码。

## 二、Provider（4 家，全部 OpenAI 兼容）
端点统一 POST `{baseUrl}/chat/completions`，鉴权 `Authorization: Bearer {KEY}`，
请求体 `{model, messages, temperature, max_tokens, stream:false}`，
返回读 `choices[0].message.content` 与 `usage.prompt_tokens/completion_tokens`。

- SiliconFlow: baseUrl=https://api.siliconflow.cn/v1, env=SILICONFLOW_API_KEY
  模型: deepseek-ai/DeepSeek-V4-Flash(cheap), deepseek-ai/DeepSeek-V4-Pro(creative,付费)
- 智谱 BigModel: baseUrl=https://open.bigmodel.cn/api/paas/v4, env=ZHIPU_API_KEY
  模型: glm-4.7-flash(免费,200K)
- OpenRouter: baseUrl=https://openrouter.ai/api/v1, env=OPENROUTER_API_KEY
  模型: tencent/hy3:free(262K), qwen/qwen3-coder:free(1M), qwen/qwen3-next-80b-a3b-instruct:free
- 移动云 MoMA: baseUrl=https://zhenze-huhehaote.cmecloud.cn/v1, env=MOMA_API_KEY
  模型: deepseek-v4-flash(免费,赠送2500万tokens)

## 三、思考链关闭（关键，错了正文为空）
推理模型默认开思考链会把 max_tokens 花在 reasoning 上导致 content 为空，默认关闭：
- 智谱: body 加 thinking={type:'disabled'}
- OpenRouter: body 加 chat_template_kwargs={enable_thinking:false}
- SiliconFlow/MoMA: 无需特殊处理
提供一个 thinking: bool 开关，true 时打开（用于审计/分析任务，需更长超时）。

## 四、模型角色路由（4 角色）
- cheap: 清洗/摘要/标签 -> 默认 glm-4.7-flash
- longctx: 读大纲/长线一致性 -> 默认 tencent-hy3-free
- creative: 正文初稿/高潮 -> 默认 glm-4.7-flash
- auditor: 独立审查 -> 默认 glm-4.7-flash
维护一个 MODEL_REGISTRY（每条含 provider/model/role/maxTokens/contextWindow/
costPer1kInput/costPer1kOutput/id）。select_model(role) 返回对应配置。
成本公式: cost = (prompt_tokens/1000)*costIn + (completion_tokens/1000)*costOut。
（可选）别名解析：小写+去空格/_/-/./后匹配，如 moma/glm/sf/hy3/qwen 映射到注册表 key。

## 五、重试与超时
- 默认超时 300s，用 httpx.Timeout + asyncio 超时控制。
- MoMA 冷启动：404 时重试最多 3 次、每次间隔 4s（其他 4xx/5xx 直接抛错）。
- （可选韧性）若响应文本含 U+FFFD 替换符，重试 1 次。

## 六、JSON 围栏剥离
提供 strip_json_fences(text)：去掉 ```json ... ``` 或 ``` ... ``` 围栏，未包裹则原样返回。
as_json=True 时取回 content 后立即剥离。注意：正文散文阶段不剥离。

## 七、统一门面
AIClient.chat(role: ModelRole, messages, opts) -> ChatResult{content,model,provider,
prompt_tokens,completion_tokens,total_tokens,cost,duration_ms}
AIClient.chat_with_model(model_id, messages, opts) 按注册表 id 精准调用。
提供 get_ai_client() 单例。

## 八、交付要求
1. 给出目录结构（如 app/ai/{client,router,providers,transport}.py）与关键代码。
2. 给出 pyproject/requirements（含 httpx、pydantic）。
3. 给一个 FastAPI 路由示例：POST /api/chat，body={role, messages, as_json, thinking}，
   以及 GET /api/models 列出可用模型/别名。
4. 不要实现任何业务 Prompt、不要接数据库、不要写 World State/Event——这些留给上层。
5. 用异步（async/await）实现，httpx.AsyncClient 复用连接。
6. 前端（React 18）通过 fetch/axios 调用上述 FastAPI 路由即可，**不要**在前端做任何 fetch 绕过或 base64 处理（浏览器原生处理 gzip，且 AI Key 只在后端，前端永不见 Key）。
7. 在 requirements / pyproject 中固定 httpx>=0.27，pydantic>=2。
```

---

## 10. 附：本接口层在 `xiaoshuoxitong` 中的真实文件清单（供对照 / 抽取）

| 文件 | 对应本文件章节 |
|---|---|
| `src/server/ai/aiClient.ts` | Client 门面 + Provider + 思考链 + 重试 + 成本 + JSON 剥离（第 3/5/6/7 节） |
| `src/server/generation/modelRouter.ts` | Router + 注册表 + 别名 + 成本（第 4 节） |
| `src/server/http/nativeFetch.ts` | Transport 父进程（第 2 节，Next.js 专用） |
| `src/server/http/nativeFetchWorker.cjs` | Transport 子进程（第 2 节，Next.js 专用） |
| `src/server/generation/chapterWriterV2.ts` | 写作流 6 阶段如何调接口（第 8 节） |

> 重开项目时，**第 2 节（nativeFetch）完全不需要**——那是 Next.js 特定的坑。新项目栈为 **Python 后端 + React 18 前端**：AI 调用在 Python 后端用 `httpx` 直接完成，React 18 前端只调你自己的后端 API，两端都不会触发该坑。
