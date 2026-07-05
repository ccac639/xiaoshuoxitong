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

export class StoryMemoryManager {
  private memories: Map<string, StoryMemory> = new Map();

  /**
   * 获取或创建故事记忆
   */
  getOrCreateMemory(storyId: string, storyName: string): StoryMemory {
    if (!this.memories.has(storyId)) {
      const memory: StoryMemory = {
        storyId,
        storyName,
        chapterHistory: [],
        characterArcs: [],
        memoryBank: [],
        overallSummary: '',
        pendingHooks: [],
      };
      this.memories.set(storyId, memory);
    }
    return this.memories.get(storyId)!;
  }

  /**
   * 保存章节到记忆
   */
  saveChapter(storyId: string, chapterData: ChapterGenerationOutput): ChapterRecord {
    const memory = this.getOrCreateMemory(storyId, '默认故事');
    
    // 生成章节总结
    const summary = this.generateChapterSummary(chapterData.content);
    
    // 提取关键事件
    const keyEvents = this.extractKeyEvents(chapterData);
    
    // 记录角色变化
    const characterChanges = this.extractCharacterChanges(chapterData);
    
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
    this.updateCharacterArcs(memory, record);
    
    // 更新记忆库
    this.updateMemoryBank(memory, record);
    
    // 更新整体总结
    this.updateOverallSummary(memory);
    
    return record;
  }

  /**
   * 生成章节总结（简化版）
   */
  private generateChapterSummary(content: string): string {
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
  private extractKeyEvents(chapterData: ChapterGenerationOutput): string[] {
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
  private extractCharacterChanges(chapterData: ChapterGenerationOutput): Record<string, any> {
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
  private updateCharacterArcs(memory: StoryMemory, record: ChapterRecord): void {
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
  private updateMemoryBank(memory: StoryMemory, record: ChapterRecord): void {
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
  private updateOverallSummary(memory: StoryMemory): void {
    const recentChapters = memory.chapterHistory.slice(-3);
    memory.overallSummary = recentChapters
      .map(ch => `第${ch.chapterNumber}章：${ch.summary}`)
      .join('\n');
  }

  /**
   * 获取上一章总结（用于保持连贯性）
   */
  getPreviousChapterSummary(storyId: string): string | null {
    const memory = this.memories.get(storyId);
    if (!memory || memory.chapterHistory.length === 0) {
      return null;
    }
    
    const lastChapter = memory.chapterHistory[memory.chapterHistory.length - 1];
    return lastChapter.summary;
  }

  /**
   * 获取故事记忆（用于生成下一章）
   */
  getStoryContext(storyId: string): {
    previousSummary: string | null;
    overallSummary: string;
    pendingHooks: string[];
    characterArcs: string[];
  } {
    const memory = this.getOrCreateMemory(storyId, '默认故事');
    
    return {
      previousSummary: this.getPreviousChapterSummary(storyId),
      overallSummary: memory.overallSummary,
      pendingHooks: memory.pendingHooks
        .filter(h => h.status === 'pending')
        .map(h => h.description),
      characterArcs: memory.characterArcs.map(arc => 
        `${arc.characterName}：${arc.chapters.map(ch => ch.emotion).join(' → ')}`
      ),
    };
  }
}

// 导出单例
export const storyMemoryManager = new StoryMemoryManager();
