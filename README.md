# AI智能小说创作工具

基于 AI 的小说创作操作系统，提供小说管理、章节编辑、OCR 导入、AI 续写 / 润色、故事记忆与世界状态管理等完整创作链路。

## 技术栈

- **框架**：[Next.js 14](https://nextjs.org/)（App Router）+ React 18
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **状态管理**：zustand
- **图标**：lucide-react
- **数据存储**：本地文件系统（`data/`，小说与项目落盘刷新不丢）；后续支持 MongoDB

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:3000）
npm run dev

# 生产构建
npm run build
npm run start
```

> 打开浏览器访问 http://localhost:3000 即可使用。

## 功能特性

| 模块 | 路由 | 说明 |
| --- | --- | --- |
| 主页 | `/` | 功能介绍与快速入口，一键「开始创作」 |
| 小说管理 | `/novel` | 项目列表卡片、新建 / 编辑 / 删除、元信息（类型 / 站点 / 设定 / 保存位置 / 置顶） |
| 章节编辑 | `/chapter` | 章节编辑器与阅读器，支持 `?novel=<id>` 进入导入小说阅读模式 |
| OCR 导入 | `/import` | 扫描 OCR 输出文件夹，解析合并 JSON / 子文件夹 / 扁平结构并导入为小说 |
| 故事记忆 | `/story-memory` | 故事记忆库，支持 `?storyId=<id>` 按小说隔离记忆 |
| 世界状态 | `/world-state` | 创作项目的世界状态（设定 / 势力 / 时间线等） |
| 知识库 | `/knowledge` | 知识条目的管理与检索 |
| 技能实验室 | `/skill-lab` | 规划中（占位页） |
| 记忆 | `/memory` | 规划中（占位页） |
| 智能体追踪 | `/agent-trace` | 规划中（占位页） |
| 事件流 | `/event-flow` | 规划中（占位页） |

## 后端 API

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/novels` | GET / POST / PUT / DELETE | 小说列表、新建、编辑、删除 |
| `/api/import` | POST | 从文件夹导入 OCR 小说 |
| `/api/generate-chapter`（及 `-v2`） | POST | AI 章节生成（含多模型路由） |
| `/api/story-memory` | GET / POST | 故事记忆读写 |
| `/api/knowledge`（及 `/upload`） | GET / POST | 知识库读取与上传 |
| `/api/project/[id]/state` | GET / POST | 项目世界状态 |
| `/api/project/[id]/memory` | GET | 项目记忆 |
| `/api/project/[id]/cost` | GET | 项目 token 消耗统计 |

## 数据存储

- 导入的小说与项目以 JSON 落盘在 `data/` 目录（如 `data/novels/index.json` + `<id>.json`），刷新不丢失。
- `data/` 已在 `.gitignore` 中排除，不纳入版本控制。
- 计划接入 MongoDB 作为后端数据库，接口层将平滑切换。

## 主题切换

点击右上角 🌙 / ☀️ 按钮切换深色 / 浅色主题（基于 `data-theme` 的防闪脚本 + `suppressHydrationWarning`）。

## 项目结构

```
src/
├── app/                 # Next.js App Router 页面 + API 路由
│   ├── api/             # 后端接口
│   ├── novel/           # 小说管理页
│   ├── chapter/         # 章节编辑器
│   ├── story-memory/    # 故事记忆页
│   └── ...
├── components/          # React 组件（layout / chapter / common / theme）
├── server/              # 服务端逻辑（novel / memory / world / knowledge / generation）
├── types/               # TypeScript 类型定义
└── lib/                 # 工具函数
```

## 许可证

仅供个人学习与研究使用。
