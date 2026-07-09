/**
 * Story Memory - 故事记忆系统
 * 
 * 功能：
 * 1. 章节历史记录（chapterHistory）
 * 2. 自动剧情总结（generateSummary）
 * 3. 角色成长轨迹（characterArcs）
 * 4. 长篇小说记忆（memoryBank）
 * 
 * 这是系统的"长期记忆"，让小说不会写着写着忘掉前面内容
 */

import { ChapterGenerationOutput } from '@/types';

export interface ChapterRecord {
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  summary: string; // 自动生成的章节总结
  keyEvents: string[]; // 关键事件
  characterChanges: Record<string, any>; // 角色变化
  timestamp: number;
}

export interface CharacterArc {
  characterId: string;
  characterName: string;
  chapters: {
    chapterNumber: number;
    status: string; // 状态变化
    emotion: string;
    keyEvent?: string;
  }[];
  growth: string; // 成长轨迹描述
}

export interface StoryMemory {
  storyId: string;
  storyName: string;
  chapterHistory: ChapterRecord[];
  characterArcs: CharacterArc[];
  memoryBank: {
    key: string;
    value: any;
    category: 'plot' | 'character' | 'world' | 'foreshadow';
    chapterNumber: number;
  }[];
  overallSummary: string; // 整体剧情总结
  pendingHooks: {
    chapterNumber: number;
    description: string;
    status: 'pending' | 'resolved';
    resolution?: string;
  }[];
}

// 使用全局变量（解决热重载问题）
const G = globalThis as any;

function getMemoriesMap(): Map<string, StoryMemory> {
  if (!G.__storyMemories) {
    G.__storyMemories = new Map();
  }
  return G.__storyMemories;
}

/**
 * 获取或创建故事记忆
 */
export function getOrCreateMemory(storyId: string, storyName: string): StoryMemory {
  const memories = getMemoriesMap();
  
  if (!memories.has(storyId)) {
    const memory: StoryMemory = {
      storyId,
      storyName,
      chapterHistory: [],
      characterArcs: [],
      memoryBank: [],
      overallSummary: '',
      pendingHooks: [],
    };
    memories.set(storyId, memory);
  }
  return memories.get(storyId)!;
}

/**
 * 保存章节到记忆
 */
export function saveChapter(storyId: string, chapterData: ChapterGenerationOutput): ChapterRecord {
  const memory = getOrCreateMemory(storyId, '默认故事');
  
  // 生成章节总结
  const summary = generateChapterSummary(chapterData.content);
    
  // 提取关键事件
  const keyEvents = extractKeyEvents(chapterData);
    
  // 记录角色变化
  const characterChanges = extractCharacterChanges(chapterData);
    
  const record: ChapterRecord = {
    chapterNumber: chapterData.chapterNumber,
    title: chapterData.title,
    content: chapterData.content,
    wordCount: chapterData.wordCount,
    summary,
    keyEvents,
    characterChanges,
    timestamp: Date.now(),
  };

  memory.chapterHistory.push(record);
    
  // 更新角色成长轨迹
  updateCharacterArcs(memory, record);
    
  // 更新记忆库
  updateMemoryBank(memory, record);
    
  // 更新整体总结
  updateOverallSummary(memory);
    
  return record;
}

/**
 * 生成章节总结（简化版）
 */
function generateChapterSummary(content: string): string {
  // 简化版：取前200字作为总结
  const summary = content
    .replace(/[#*]/g, '')
    .trim()
    .slice(0, 200);
  return summary + (content.length > 200 ? '...' : '');
}

/**
 * 提取关键事件
 */
function extractKeyEvents(chapterData: ChapterGenerationOutput): string[] {
  if (!chapterData.eventFlow?.steps) {
    return [];
  }
    
  return chapterData.eventFlow.steps
    .filter((step: any) => step.status === 'completed')
    .map((step: any) => step.name);
}

/**
 * 提取角色变化
 */
function extractCharacterChanges(chapterData: ChapterGenerationOutput): Record<string, any> {
  if (!chapterData.worldStateAfter?.characters) {
    return {};
  }
    
  const changes: Record<string, any> = {};
  const before = chapterData.worldStateBefore?.characters || {};
  const after = chapterData.worldStateAfter.characters;
    
  for (const [charId, charAfter] of Object.entries(after)) {
    const charBefore = before[charId];
    if (charBefore && charAfter) {
      changes[charId] = {
        hpChange: (charAfter as any).hp - (charBefore as any).hp,
        emotionChange: [(charBefore as any).emotion, (charAfter as any).emotion],
      };
    }
  }
    
  return changes;
}

/**
 * 更新角色成长轨迹
 */
function updateCharacterArcs(memory: StoryMemory, record: ChapterRecord): void {
  for (const [charId, changes] of Object.entries(record.characterChanges)) {
    let arc = memory.characterArcs.find(a => a.characterId === charId);
      
    if (!arc) {
      arc = {
        characterId: charId,
        characterName: record.title, // 简化：使用章节标题
        chapters: [],
        growth: '',
      };
      memory.characterArcs.push(arc);
    }
      
    arc.chapters.push({
      chapterNumber: record.chapterNumber,
      status: changes.emotionChange?.[1] || '未知',
      emotion: changes.emotionChange?.[1] || '未知',
      keyEvent: record.keyEvents[0],
    });
  }
}

/**
 * 更新记忆库
 */
function updateMemoryBank(memory: StoryMemory, record: ChapterRecord): void {
  // 添加关键事件到记忆库
  record.keyEvents.forEach((event, idx) => {
    memory.memoryBank.push({
      key: `event-ch${record.chapterNumber}-${idx}`,
      value: event,
      category: 'plot',
      chapterNumber: record.chapterNumber,
    });
  });
}

/**
 * 更新整体总结
 */
function updateOverallSummary(memory: StoryMemory): void {
  const recentChapters = memory.chapterHistory.slice(-3);
  memory.overallSummary = recentChapters
    .map(ch => `第${ch.chapterNumber}章：${ch.summary}`)
    .join('\n');
}

/**
 * 获取上一章总结（用于保持连贯性）
 */
export function getPreviousChapterSummary(storyId: string): string | null {
  const memories = getMemoriesMap();
  const memory = memories.get(storyId);
  if (!memory || memory.chapterHistory.length === 0) {
    return null;
  }
    
  const lastChapter = memory.chapterHistory[memory.chapterHistory.length - 1];
  return lastChapter.summary;
}

/**
 * 获取故事上下文（用于生成下一章）
 */
export function getStoryContext(storyId: string): {
  previousSummary: string | null;
  overallSummary: string;
  pendingHooks: string[];
  characterArcs: string[];
} {
  const memory = getOrCreateMemory(storyId, '默认故事');
    
  return {
    previousSummary: getPreviousChapterSummary(storyId),
    overallSummary: memory.overallSummary,
    pendingHooks: memory.pendingHooks
      .filter(h => h.status === 'pending')
      .map(h => h.description),
    characterArcs: memory.characterArcs.map(arc => 
      `${arc.characterName}：${arc.chapters.map(ch => ch.emotion).join(' → ')}`
    ),
  };
}

/**
 * 导出所有函数（兼容导入方式）
 */
export const storyMemoryManager = {
  getOrCreateMemory,
  saveChapter,
  getPreviousChapterSummary,
  getStoryContext,
};
