// V3 Narrative Learning System - 类型定义

// ==================== 基础类型 ====================

export interface GenerateId {
  id: string;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== World State 类型 ====================

/** 世界快照 - 系统最终真相 */
export interface WorldSnapshot {
  id: string;
  chapterId: string;
  chapterNumber: number;
  timestamp: number;
  characters: Record<string, WorldCharacter>;
  relations: WorldRelation[];
  flags: Record<string, WorldFlag>;
  metadata: {
    eventCount: number;
    skillInvocations: string[];
  };
}

/** 世界中的角色状态 */
export interface WorldCharacter {
  id: string;
  name: string;
  hp: number;  // 0-100
  mp?: number; // 0-100 (可选)
  emotion: '平静' | '愤怒' | '恐惧' | '喜悦' | '悲伤' | '困惑';
  status: string[]; // 状态标签数组，如 ['中毒', '护盾']
  location?: string;
  attributes: Record<string, number>; // 扩展属性，如 { 攻击力: 85, 防御力: 60 }
}

/** 角色关系 */
export interface WorldRelation {
  from: string; // 角色 ID
  to: string;   // 角色 ID
  type: '敌对' | '盟友' | '爱慕' | '师徒' | '家族' | '中立';
  value: number; // -100 到 100
  description?: string;
}

/** 世界变量（Flag） */
export interface WorldFlag {
  key: string;
  value: boolean | string | number;
  label: string;
  category?: string; // 分类，如 '剧情标记', '世界状态'
}

/** 世界事件 - 触发状态变更的事件 */
export interface WorldEvent {
  id: string;
  type: '战斗' | '对话' | '探索' | '剧情' | '系统';
  description: string;
  timestamp: number;
  affectedCharacters: string[]; // 受影响的角色 ID
  changes: WorldStateChange[];
  skillUsed?: string; // 触发的 Skill ID
}

/** 状态变更记录 */
export interface WorldStateChange {
  targetType: 'character' | 'relation' | 'flag';
  targetId: string;
  field?: string; // 如 'hp', 'emotion'
  oldValue: any;
  newValue: any;
}

// ==================== Skill 类型 ====================

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'plot' | 'character' | 'pacing' | 'emotion';
  version: string;
  code: string; // Skill 执行代码（字符串形式）
  metadata: {
    author: string;
    createdAt: number;
    updatedAt: number;
    invocationCount: number;
    successRate: number;
  };
}

export interface SkillExecution {
  skillId: string;
  input: Record<string, any>;
  output: Record<string, any>;
  executionTime?: number; // 执行时间（毫秒）
  timestamp: number;
  success: boolean;
  error?: string;
}

// ==================== Memory 类型 ====================

export interface MemoryRecord {
  id: string;
  type: 'behavior' | 'experience' | 'state';
  timestamp: number;
  data: any;
  tags: string[];
}

// ==================== Agent 类型 ====================

export interface AgentDecision {
  id: string;
  context: {
    chapterNumber: number;
    previousEvents: string[];
    currentState: string;
  };
  selectedSkill: string;
  reasoning: string;
  timestamp: number;
}

// ==================== Event Flow 类型 ====================

export interface EventFlowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime?: number;
  endTime?: number;
  data?: any;
  error?: string;
}

export interface EventFlow {
  id: string;
  chapterId: string;
  chapterNumber: number;
  startTime: number;
  endTime?: number;
  steps: EventFlowStep[];
  status: 'running' | 'completed' | 'error';
}

// ==================== Chapter Generation 类型 ====================

/** 章节生成输入 */
export interface ChapterGenerationInput {
  chapterNumber: number;
  worldState: WorldSnapshot;
  previousChapter?: string;
  userPrompt?: string;
}

/** 章节生成输出 */
export interface ChapterGenerationOutput {
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  generationTime: number;
  eventFlow: any;
  skillExecutions: SkillExecution[];
  worldStateBefore: WorldSnapshot;
  worldStateAfter: WorldSnapshot;
  audit?: any; // 🔥 审计结果（fanqie-novel-skill）
  metadata: {
    model: string;
    tokenUsage: number;
    cost: number;
    auditTime?: number; // 审计耗时
    auditScore?: number; // 审计评分
  };
}

// ==================== Page View 类型 ====================

export type PageView = 
  | 'dashboard'
  | 'novel'
  | 'skill-lab'
  | 'memory'
  | 'agent-trace'
  | 'event-flow'
  | 'world-state';  // 新增：世界状态页面
