/**
 * xiaoshuoxitong V2 - 统一导出
 *
 * 升级摘要：
 * - 项目存储持久化到 data/projects/
 * - StoryMemory 结构化持久化
 * - WorldStateManager 真实事件应用
 * - SkillLibrary 11 个可配置 Skill
 * - ChapterWriter 六阶段流水线
 * - 平台 Profile 支持起点/番茄/RoyalRoad/WebNovel/KDP
 * - 模型路由 + 成本统计
 */

// 项目存储
export {
  projectStore,
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  saveChapter,
  getChapter,
  listChapters,
  getLatestChapter,
  getMemoryData,
  saveMemoryData,
  getPlatformProfile,
  savePlatformProfile,
} from '@/server/project/projectStore';

export type {
  ProjectMeta,
  VolumeInfo,
  OutlineNode,
  ChapterData,
  BeatItem,
  ChapterPlan,
  PlatformProfile,
} from '@/server/project/projectStore';

// 故事记忆
export {
  StoryMemory,
  getStoryMemory,
} from '@/server/memory/storyMemoryV2';

export type {
  ChapterSummary,
  StateChange,
  KnowledgeUpdate,
  ForeshadowEntry,
  CharacterState,
  WorldStateData,
} from '@/server/memory/storyMemoryV2';

// 世界状态
export {
  WorldStateManagerV2,
  getWorldStateManager,
} from '@/server/world/stateManagerV2';

export type { EventEffect } from '@/server/world/stateManagerV2';

// Skill 系统
export {
  SkillLibraryV2,
  skillLibraryV2,
  BUILTIN_SKILLS,
} from '@/server/skills/skillLibraryV2';

export type { SkillDef } from '@/server/skills/skillLibraryV2';

// 章节生成流水线
export {
  ChapterWriterV2,
} from '@/server/generation/chapterWriterV2';

export type {
  PipelineState,
  AuditResult,
  ChapterGenerationResult,
} from '@/server/generation/chapterWriterV2';

// 模型路由
export {
  ModelRouter,
  CostTracker,
} from '@/server/generation/modelRouter';

export type { ModelConfig, ModelRole, CostRecord } from '@/server/generation/modelRouter';

// 平台 Profile
export {
  PLATFORM_PROFILES,
  getProfile,
  PROFILE_QIDIAN,
  PROFILE_FANQIE,
  PROFILE_ROYALROAD,
  PROFILE_WEB_NOVEL,
  PROFILE_KDP,
  TEMPLATE_FALLEN_DRAGON_EMPEROR,
} from '@/server/platform/profiles';
