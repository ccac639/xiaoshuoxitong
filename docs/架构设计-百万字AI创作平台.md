# AI 长篇小说创作操作系统 — 架构升级设计

> 目标：将 `xiaoshuoxitong`（当前 Next.js 单体 + 文件存储 + Mock AI）升级为**支持百万字稳定创作的 AI Agent 平台**。
> 本文档为**架构设计（Phase 0）**，**不含实现代码**。

---

## 一、当前项目结构分析（现状盘点）

### 1.1 技术现状

| 维度 | 现状 | 评价 |
| --- | --- | --- |
| 前端 | Next.js 14 App Router + React 18 + Tailwind + zustand | ✅ 保留，符合目标 |
| 后端 | Next.js API Routes（`src/app/api/*`） | ❌ 必须拆分为独立 FastAPI |
| 数据存储 | 文件系统 JSON（`data/projects/<id>/*.json`） | ❌ 无法支撑百万字并发与检索 |
| AI 调用 | `callModel()` 全部为 **Mock 硬编码** | ❌ 核心未接通真实 LLM |
| 记忆系统 | `StoryMemory` 结构化摘要（JSON） | ⚠️ 思路正确，但无向量检索/RAG |
| 世界状态 | `stateManagerV2` 角色/阵营/地点/规则/时间线 | ✅ 数据模型可用，需迁入 PG |
| Skill 系统 | `skillLibraryV2` 预定义 Skill Prompt 注入 | ✅ 概念正确，需平台化/可编排 |
| 章节生成 | `ChapterWriterV2` 六阶段流水线 | ✅ 流水线骨架优秀，是升级核心资产 |
| 模型路由 | `ModelRouter` 4 角色 + 成本统计 | ✅ 概念正确，需接真实 Provider |
| 事件流 | `eventFlowTracker`（存在但弱） | ⚠️ 需升级为 Event Bus |

### 1.2 模块映射（现有 → 目标）

```
现有 src/server/                        目标后端模块（FastAPI）
─────────────────────────              ──────────────────────────────
generation/chapterWriterV2.ts  →  agent/executor（Chapter Writer Agent）
generation/modelRouter.ts      →  agent/router（模型路由 + 成本）
memory/storyMemoryV2.ts        →  memory/story_memory + memory/vector_search
world/stateManagerV2.ts        →  world/state_manager + world/character_manager
skills/skillLibraryV2.ts       →  skill/（writer/polish/audit/rewrite/consistency）
project/projectStore.ts        →  database/models + database/session（ORM 替代）
event/eventFlowTracker         →  event/event_bus + event/event_tracker
platform/profiles.ts           →  core/config（平台画像配置）
api/routesV2.ts + app/api/*    →  app/api/*（FastAPI 路由，与前端解耦）
```

### 1.3 核心资产（应保留并迁移，不要重写）

1. **`ChapterWriterV2` 的六阶段流水线**：`plan → beatSheet → draft → audit → revise → commit` 是高质量设计，直接映射为 LangGraph 的 6 个 Node。
2. **`StoryMemory` 的结构化摘要模型**：`ChapterSummary / StateChange / ForeshadowEntry / CharacterState` 是分层记忆的雏形，应作为 PG 关系表 + Milvus 向量集合的双写对象。
3. **`ModelRouter` 的四角色成本模型**：`cheap / longctx / creative / auditor`，直接映射为 Agent 分工。
4. **Skill 定义结构**（`SkillDef`）：`inputFields / outputFields / checkpoints / taboos / prompt`，是 Skill Runtime 的数据契约。

### 1.4 关键缺口（必须补齐才能实现百万字）

| 缺口 | 影响 | 解决方向 |
| --- | --- | --- |
| 真实 LLM 未接通 | 整个创作链路是演示 | FastAPI 接 Provider SDK（OpenAI/Claude/DeepSeek/本地） |
| 无向量检索 | 百万字无法语义召回前文 | Milvus + 分层 Embedding |
| 无关系数据库 | 人物/章节/事件无法高效关联查询 | PostgreSQL + SQLAlchemy 2.0 |
| 无异步任务 | 生成阻塞 HTTP，长篇小说会超时 | Redis + Worker（Celery/ARQ） |
| 无 Context 压缩 | 长上下文会爆窗口、烧钱 | 摘要层级 + 增量快照 |
| 无事件总线 | 模块耦合、不可观测 | Event Bus（Redis Stream） |
| 单 Agent 顺序执行 | 无并行/无反思/无人类介入 | LangGraph 多 Agent 协作 |

---

## 二、后端重构方案

### 2.1 总体架构

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 14)  — 保留，仅消费后端 API                    │
│  /novel /chapter /story-memory /world-state /event-flow /skill-*  │
└───────────────────────────┬─────────────────────────────────────┘
                              │  HTTPS / JSON  (前后端解耦)
┌─────────────────────────────▼────────────────────────────────────┐
│  API Gateway  (FastAPI)  app/api/*                                │
│  - 鉴权/限流/日志/异常恢复                                         │
│  - 同步请求：查询/CRUD                                            │
│  - 异步任务：创作生成 → 提交到 Task Queue                          │
└───────┬───────────────┬────────────────┬─────────────────────────┘
        │               │                │
┌───────▼──────┐ ┌──────▼───────┐ ┌──────▼──────────────────────┐
│ Agent Layer  │ │ Skill Runtime│ │  Memory / World / Event      │
│ (LangGraph)  │ │              │ │  Engines                     │
│ Planner      │ │ writer       │ │  - StoryMemory (PG+Milvus)   │
│ Writer       │ │ polish       │ │  - VectorSearch (RAG)        │
│ Editor       │ │ audit        │ │  - WorldState (PG)           │
│ Audit        │ │ rewrite      │ │  - EventBus (Redis Stream)   │
│ Memory Agent │ │ consistency  │ │                               │
└───────┬──────┘ └──────┬───────┘ └──────────────┬────────────────┘
        │               │                         │
┌───────▼───────────────▼─────────────────────────▼────────────────┐
│  Worker (异步任务)  Celery/ARQ + Redis                            │
│  - 长耗时生成任务（章节/批量/润色）                                │
│  - 后台 Embedding、摘要重建、上下文压缩                           │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌────────────────────────────▼──────────────────────────────────────┐
│  Infrastructure                                                     │
│  PostgreSQL  │  Milvus  │  Redis  │  MinIO  │  (Docker Compose)    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 后端目录结构（FastAPI 单体仓库 `backend/`）

```
backend/
├── app/
│   ├── main.py                  # FastAPI 入口、CORS、中间件、路由挂载
│   ├── api/                     # 路由层（薄，仅参数校验+委托）
│   │   ├── novel.py             # 小说项目 CRUD
│   │   ├── chapter.py           # 章节 CRUD + 生成提交
│   │   ├── agent.py             # Agent 运行/状态/流式
│   │   ├── skill.py             # Skill 注册/执行/Before-After
│   │   ├── memory.py            # 记忆检索/写入
│   │   ├── world.py             # 世界状态/角色/关系
│   │   └── event.py             # Event Flow 查询
│   ├── core/
│   │   ├── config.py            # pydantic-settings，环境变量
│   │   ├── security.py          # API Key / JWT
│   │   ├── logger.py            # 结构化日志
│   │   └── exceptions.py        # 统一异常 + 恢复
│   ├── agent/                   # LangGraph 多 Agent
│   │   ├── graph.py             # 编译 StateGraph（核心编排）
│   │   ├── planner.py           # Agent Planner Node
│   │   ├── executor.py          # Chapter Writer（迁自 ChapterWriterV2）
│   │   ├── router.py            # 模型路由（迁自 ModelRouter）
│   │   └── context_manager.py   # 上下文压缩/Token 预算
│   ├── skill/                   # Skill Runtime
│   │   ├── runtime.py           # Skill 注册表 + 执行器
│   │   ├── writer.py            # 写作 Skill
│   │   ├── polish.py            # 润色
│   │   ├── audit.py             # 审查（七维评分）
│   │   ├── rewrite.py           # 重写
│   │   └── consistency.py       # 一致性检查
│   ├── memory/                  # 记忆引擎
│   │   ├── story_memory.py      # 结构化摘要（迁自 StoryMemory）
│   │   ├── vector_search.py     # Milvus 检索封装
│   │   └── retrieval.py         # RAG 召回策略（层级/增量）
│   ├── world/                   # 世界状态
│   │   ├── state_manager.py     # 世界状态（迁自 stateManagerV2）
│   │   ├── character_manager.py # 角色
│   │   └── relationship.py      # 关系网
│   ├── event/                   # 事件流
│   │   ├── event_bus.py         # Redis Stream 发布订阅
│   │   └── event_tracker.py     # 事件追踪/回放
│   ├── database/                # 数据层
│   │   ├── models.py            # SQLAlchemy 2.0 模型
│   │   ├── session.py           # engine + sessionmaker
│   │   └── migrations/          # Alembic
│   └── worker/                  # 异步
│       ├── task_queue.py        # Redis/Celery 接入
│       └── workers.py           # 任务实现
├── tests/                       # 单元/集成
├── alembic.ini
├── Dockerfile
├── docker-compose.yml           # PG + Milvus + Redis + MinIO + backend + worker
├── .env.example
└── pyproject.toml
```

### 2.3 Agent 编排（LangGraph StateGraph）

将 `ChapterWriterV2` 的六阶段直接映射为图节点，引入 **Planner / Memory / Human-in-loop**：

```
        ┌─────────────┐
        │  START       │
        └──────┬───────┘
               ▼
        ┌─────────────┐    ┌──────────────────────┐
        │ Planner      │◄───│ Memory Agent         │  (检索前文/世界状态)
        │ (规划本章)    │    │ (RAG: 伏笔/角色/设定) │
        └──────┬───────┘    └──────────────────────┘
               ▼
        ┌─────────────┐
        │ BeatSheet    │  (剧情节拍)
        └──────┬───────┘
               ▼
        ┌─────────────┐   skill: writer
        │ Draft        │
        └──────┬───────┘
               ▼
        ┌─────────────┐   skill: audit（七维）
        │ Audit        │
        └──────┬───────┘
          ┌────┴────┐
      通过 │          │ 未通过
          ▼          ▼
     ┌─────────┐  ┌─────────────┐  skill: rewrite
     │ Commit  │  │ Revise       │
     │(更新世界 │  └──────┬───────┘
     │ 状态/记忆)│        └───────► (回到 Audit 或 Commit)
     └────┬─────┘
          ▼
        ┌─────────────┐
        │  END         │
        └─────────────┘
```

- **每个 Node** 通过 `context_manager` 控制 Token 预算与上下文窗口。
- **Memory Agent** 在 Planner 前注入相关前文摘要 + 世界状态快照 + 待回收伏笔。
- **可观测**：每个 Node 通过 `event_bus` 发出 `agent.node.started/finished` 事件，前端 Event Flow Panel 实时渲染。

### 2.4 百万字稳定创作的关键工程机制

| 机制 | 做法 |
| --- | --- |
| **分层记忆** | L0 全文（Milvus chunk）→ L1 章节摘要（PG）→ L2 卷摘要 → L3 全局大纲。生成时只注入相关层。 |
| **Context 压缩** | 超窗口时，旧章节降级为摘要；用 `longctx` 角色模型做周期压缩。 |
| **Token 预算** | `context_manager` 为每次生成分配预算；超限触发压缩或拒生成并告警。 |
| **历史章节摘要** | 每章 commit 后异步生成摘要写入 PG + Embedding 入 Milvus。 |
| **增量更新** | 世界状态/角色只 diff 更新，避免整库重写；事件以 append-only 落库。 |
| **异常恢复** | 流水线每阶段持久化 `PipelineState` 到 PG；中断可从最近 stage 续跑。 |

---

## 三、数据库 ER 设计

### 3.1 PostgreSQL（关系型主库）

```
┌──────────────┐       ┌──────────────────┐       ┌─────────────────┐
│  novels       │ 1    N│  chapters         │  N   1│  volumes         │
│──────────────│───────│──────────────────│───────│─────────────────│
│ id (PK)       │       │ id (PK)           │       │ id (PK)         │
│ title         │       │ novel_id (FK)     │       │ novel_id (FK)   │
│ one_liner     │       │ volume_id (FK)    │       │ volume_number   │
│ genre         │       │ chapter_number    │       │ title           │
│ target_platform│      │ title             │       │ goal            │
│ target_words  │       │ status            │       │ start_chapter   │
│ status        │       │ content_md_ref    │──▶    │ end_chapter     │
│ current_chapter│      │ word_count        │  MinIO │ status          │
│ created_at    │       │ beat_sheet (JSON) │       └─────────────────┘
└──────────────┘       │ plan (JSON)       │
                       │ audit_result(JSON) │
                       │ metadata (JSON)    │
                       │ created_at         │
                       └────────┬───────────┘
                                │ 1    N
                                ▼
                       ┌──────────────────┐
                       │  chapter_summaries│  (结构化记忆)
                       │──────────────────│
                       │ id (PK)           │
                       │ novel_id (FK)     │
                       │ chapter_number    │
                       │ what_happened     │
                       │ state_changes(JSON)│
                       │ knowledge_gained  │
                       │ foreshadowing(JSON)│
                       │ must_carry_forward │
                       │ embedding_id (→Milvus)│
                       └──────────────────┘

┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  characters       │   │  factions         │   │  world_states     │
│──────────────────│   │──────────────────│   │──────────────────│
│ id (PK)           │   │ id (PK)           │   │ novel_id (FK)     │
│ novel_id (FK)     │   │ novel_id (FK)     │   │ flags (JSON)      │
│ name              │   │ name              │   │ rules (JSON)      │
│ hp / level        │   │ power             │   │ timeline (JSON)   │
│ abilities (JSON)  │   │ description        │   │ version (乐观锁)  │
│ location          │   └────────┬──────────┘   └──────────────────┘
│ faction_rep (JSON)│            │ 1    N
└────────┬──────────┘   ┌────────▼──────────┐
         │ 1    N       │  relationships     │
         ▼              │──────────────────│
┌──────────────────┐   │ id (PK)           │
│  character_events │   │ source_char_id    │
│──────────────────│   │ target_char_id    │
│ id (PK)           │   │ relation_type     │
│ character_id (FK) │   │ strength          │
│ type              │   │ description       │
│ field / old / new │   └──────────────────┘
│ reason            │
│ chapter_number    │
└──────────────────┘

┌──────────────────┐   ┌──────────────────┐
│  events           │   │  skill_executions │
│──────────────────│   │──────────────────│
│ id (PK)           │   │ id (PK)           │
│ novel_id (FK)     │   │ novel_id (FK)     │
│ type              │   │ skill_id (FK)     │
│ payload (JSON)    │   │ chapter_id (FK?)  │
│ stage             │   │ before_ref        │
│ created_at        │   │ after_ref         │
└──────────────────┘   │ score / cost      │
                       │ created_at         │
                       └──────────────────┘

┌──────────────────┐   ┌──────────────────┐
│  tokens_usage     │   │  tasks            │  (异步任务)
│──────────────────│   │──────────────────│
│ id (PK)           │   │ id (PK)           │
│ novel_id (FK)     │   │ type              │
│ model_role        │   │ status            │
│ prompt_tokens     │   │ payload (JSON)    │
│ completion_tokens │   │ result_ref        │
│ cost_usd          │   │ pipeline_state    │
│ chapter_number    │   │ created/updated   │
│ created_at        │   └──────────────────┘
└──────────────────┘
```

**要点**
- `chapters.content` 存 **Markdown 引用（MinIO object key）**，PG 只存元信息，避免大字段拖慢查询。
- `world_states` 用 `version` 字段做乐观锁，支持事件回放与分支。
- `chapter_summaries.embedding_id` 关联 Milvus，实现结构化字段 + 向量双检索。
- 全文、角色、世界状态、历史章节四类 Embedding 各自独立 Milvus Collection。

### 3.2 Milvus（向量库，RAG 检索）

| Collection | 维度 | 字段 | 用途 |
| --- | --- | --- | --- |
| `chapter_chunks` | 1536 | chapter_id, chunk_idx, text, novel_id | 前文语义召回 |
| `character_vectors` | 1536 | char_id, profile_vec, novel_id | 角色一致性 |
| `world_vectors` | 1536 | entity_id, desc_vec, novel_id | 设定/世界观召回 |
| `history_vectors` | 1536 | summary_id, vector, novel_id | 历史章节摘要召回 |

- 适配 10 万–千万字：按 `novel_id` 分区，chunk 粒度 512–800 字 + 重叠。
- 检索策略（`retrieval.py`）：**层级召回**——先命中卷摘要，再下沉到相关章节 chunk，控制注入 Token。

### 3.3 Redis

| 用途 | Key 模式 | 说明 |
| --- | --- | --- |
| 创作上下文缓存 | `ctx:{novel_id}:{chapter}` | 热上下文，TTL 30min |
| Token 预算 | `budget:{novel_id}` | 实时余额，超限拦截 |
| 异步任务队列 | `queue:generation` | Worker 消费 |
| 任务状态 | `task:{task_id}` | 前端轮询/流式 |
| Event Stream | `stream:events:{novel_id}` | Event Bus 发布订阅 |
| 锁 | `lock:{novel_id}` | 防并发写同一小说 |

### 3.4 MinIO

| Bucket | 内容 |
| --- | --- |
| `novel-content` | 章节 Markdown 正文 |
| `novel-backup` | 定时全量/增量备份 |
| `novel-import` | OCR 导入原始文件 |

---

## 四、API 设计

### 4.1 约定

- Base：`http://<backend>/api/v1`
- 同步接口返回 JSON；长任务返回 `task_id`，前端轮询 `GET /api/v1/tasks/{id}` 或 SSE 流式。
- 统一错误体：`{ "error": "...", "code": "...", "stage"?: "..." }`
- 鉴权：`Authorization: Bearer <API_KEY>`（dev 可关）。

### 4.2 小说 / 章节

```
GET    /api/v1/novels                 # 列表
POST   /api/v1/novels                 # 新建（含 folder/pinned/type/settings）
GET    /api/v1/novels/{id}            # 详情
PUT    /api/v1/novels/{id}            # 编辑
DELETE /api/v1/novels/{id}            # 删除

GET    /api/v1/novels/{id}/chapters           # 章节列表
GET    /api/v1/novels/{id}/chapters/{n}       # 单章（Markdown）
POST   /api/v1/chapters/{n}/generate           # 提交生成 → 返回 task_id
PUT    /api/v1/novels/{id}/chapters/{n}        # 手动保存/修订
POST   /api/v1/novels/{id}/chapters/batch      # 批量生成（异步）
```

**`POST /api/v1/chapters/{n}/generate` 响应（对应需求：返回内容/原因/记忆/Skill）：**

```json
{
  "task_id": "t_xxx",
  "status": "queued"
}
```
任务完成后（`GET /tasks/{id}` 或 SSE）：
```json
{
  "success": true,
  "chapter": {
    "number": 12,
    "title": "第12章",
    "content": "<markdown>",
    "word_count": 3200
  },
  "generation_reason": "承接第11章结尾钩子（主角觉醒），推进卷二目标：寻找失落神器",
  "used_memory": [
    {"type": "foreshadowing", "desc": "第3章埋下的青铜钥匙", "status": "resolved"},
    {"type": "character", "name": "林玄", "change": "level 7→8"}
  ],
  "used_skills": ["golden_three_chapters", "chapter_hook", "upgrade_loop"],
  "audit": {"passed": true, "score": 31, "feedback": "..."},
  "cost": {"model": "claude-opus", "tokens": 18420, "usd": 0.42}
}
```

### 4.3 Agent / Event Flow / World State / Skill（UI 面板接口）

```
# Event Flow Panel
GET /api/v1/event-flow?novel_id=xxx
     → [{ type, stage, payload, created_at }]   # 实时事件流（Agent 节点/世界状态变更）

# World State Panel
GET /api/v1/world-state?novel_id=xxx
     → { characters, factions, locations, rules, timeline }

# Skill Runtime Panel（Before / After）
GET  /api/v1/skill-runtime?novel_id=xxx
     → [{ skill_id, name, last_run: { before_ref, after_ref, score } }]
POST /api/v1/skill-runtime/{skill_id}/run
     body: { input_text, chapter_id? }
     → { before, after, diff, score }
```

### 4.4 记忆 / 检索

```
GET  /api/v1/memory/{novel_id}/summary         # 全局/卷摘要
POST /api/v1/memory/{novel_id}/search           # RAG 检索
     body: { query, top_k, layer }  → [{ chunk, score, source_chapter }]
```

### 4.5 系统

```
GET  /api/v1/health
GET  /api/v1/models                            # 当前模型路由配置
GET  /api/v1/metrics/tokens?novel_id=xxx       # Token 消耗统计
GET  /docs                                     # Swagger（FastAPI 自带）
```

---

## 五、开发阶段规划

> 每阶段产出可运行、可验证；前端逐步从 Next.js API Route 切到 FastAPI。

### Phase 0 — 架构与环境（本文档 + 基建）
- 输出架构设计（本文）
- Docker Compose：PostgreSQL / Milvus / Redis / MinIO
- `backend/` 脚手架：FastAPI + pydantic-settings + logger + 异常处理
- `.env.example` + Alembic 初始化
- **验收**：`docker compose up` 起全部依赖；`GET /health` 200。

### Phase 1 — 数据层迁移（文件 → PG）
- SQLAlchemy 2.0 模型（novels/chapters/volumes/characters/factions/world_states/events/skill_executions/tokens_usage）
- Alembic 迁移脚本
- 编写 **迁移脚本**：读取旧 `data/projects/*.json` 导入 PG（保住现有数据）
- MinIO 接入：章节正文存 Object，PG 存引用
- **验收**：旧项目数据完整迁入 PG；`GET /novels` 走 PG 返回。

### Phase 2 — 真实 LLM 接入（替换 Mock）
- `agent/router.py`：接 OpenAI / Claude / DeepSeek / 本地 vLLM（可配置 Provider）
- `executor.py`：把 `callModel()` Mock 换成真实 SDK 调用 + 重试 + 超时 + 成本回写 `tokens_usage`
- JSON 解析容错（plan/beats/audit 的 robust parse）
- **验收**：`generate` 产出真实正文；成本统计准确。

### Phase 3 — LangGraph Agent 编排
- 把 `ChapterWriterV2` 六阶段编译为 StateGraph（Planner/BeatSheet/Draft/Audit/Revise/Commit）
- 引入 Memory Agent 节点（生成前注入上下文）
- 每节点发 Event Bus 事件
- **验收**：Agent 图可观测运行；中断可从最近 stage 续跑（异常恢复）。

### Phase 4 — 记忆引擎与 RAG（百万字核心）
- `story_memory.py` 双写 PG + Milvus
- `vector_search.py` + `retrieval.py`：层级召回（卷摘要→章节 chunk）
- `context_manager.py`：上下文压缩 + Token 预算
- 后台 Worker：章节 commit 后异步生成摘要 + Embedding
- **验收**：输入某章，能语义召回正确前文；百万字级上下文不爆窗口。

### Phase 5 — Skill Runtime 平台化
- `runtime.py`：Skill 注册表 + 执行器（Before/After 对比）
- 实现 writer / polish / audit / rewrite / consistency 五类 Skill
- UI `Skill Runtime Panel` 接 `GET /api/v1/skill-runtime`
- **验收**：`POST /skill-runtime/{id}/run` 返回 before/after/diff/score。

### Phase 6 — 异步任务与工程化
- Worker（Celery/ARQ）+ Redis 队列：长生成/批量不阻塞 HTTP
- SSE 流式推送生成进度到前端
- 完整日志、Swagger、单元测试（agent/memory/skill 各层）
- **验收**：批量生成 10 章不超时；前端实时进度；测试覆盖率达标。

### Phase 7 — 前端对齐 + 部署
- 前端 API client 切到 FastAPI base URL（环境变量）
- Event Flow / World State / Skill Runtime Panel 接真实接口
- Docker Compose 全栈编排（frontend + backend + worker + 依赖）
- 文档：部署指南、API 文档、开发指南
- **验收**：全栈 `docker compose up` 一键起；端到端创作闭环跑通。

---

## 六、风险与决策建议

1. **Milvus 资源重**：开发期可用轻量向量库（如 `chromadb` / `pgvector`）替代，生产切 Milvus。建议 Phase 4 先 `pgvector`，降低部署门槛。
2. **LangGraph 学习成本**：Phase 3 前可先用普通函数编排跑通，再迁移到 LangGraph，降低风险。
3. **Mock 与真实差异**：真实 LLM 的 JSON 输出不稳定，Phase 2 必须做 robust parse + 校验 + 重试。
4. **百万字成本**：务必在 Phase 4 前把 Token 预算与上下文压缩做扎实，否则长篇小说成本失控。
5. **前后端解耦**：Phase 1–6 期间，前端暂保留 Next.js API Route 作为「适配层」转发到 FastAPI，避免一次性大改；Phase 7 再彻底切干净。
