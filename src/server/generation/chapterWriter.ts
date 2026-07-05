/**
 * Chapter Writer - 章节生成器
 * 
 * 核心职责：
 * 1. 读取当前 World State
 * 2. 触发 Event Flow 生成事件
 * 3. 调用 Skill System 处理事件
 * 4. 更新 World State
 * 5. 生成小说正文（模拟AI生成）
 * 6. 保存到 Story Memory
 * 
 * 这是系统的"最终输出"模块
 */

import { WorldSnapshot, WorldEvent, SkillExecution } from '@/types';
import { EventFlowTracker } from '@/server/execution/eventFlowTracker';
import { WorldStateManager, worldStateManager } from '../world/stateManager';
import { SkillLibrary, skillLibrary } from '../skills/skillLibrary';

export interface ChapterGenerationInput {
  chapterNumber: number;
  worldState: WorldSnapshot;
  previousChapter?: string; // 上一章正文（用于连贯性）
  userPrompt?: string; // 用户提示（可选）
}

export interface ChapterGenerationOutput {
  chapterNumber: number;
  title: string;
  content: string; // 小说正文
  wordCount: number;
  generationTime: number; // 生成耗时（ms）
  eventFlow: any; // 事件流记录
  skillExecutions: SkillExecution[]; // 技能执行记录
  worldStateBefore: WorldSnapshot; // 生成前世界状态
  worldStateAfter: WorldSnapshot; // 生成后世界状态
  metadata: {
    model: string;
    tokenUsage: number;
    cost: number;
  };
}

export class ChapterWriter {
  private eventTracker: EventFlowTracker;
  private worldManager: WorldStateManager;
  private skillLibrary: SkillLibrary;

  constructor() {
    this.eventTracker = new EventFlowTracker();
    this.worldManager = new WorldStateManager();
    this.skillLibrary = new SkillLibrary();
  }

  /**
   * 生成章节 - 主入口
   * 
   * 完整流程：
   * 1. 读取 World State
   * 2. 触发 Event Flow（生成剧情事件）
   * 3. 调用 Skill System（加工事件）
   * 4. 更新 World State
   * 5. 生成小说正文
   * 6. 保存 to Story Memory
   */
  async generateChapter(input: ChapterGenerationInput): Promise<ChapterGenerationOutput> {
    const startTime = Date.now();

    // 1. 保存生成前的世界状态
    const worldStateBefore = { ...input.worldState };

    // 2. 触发 Event Flow（生成剧情事件）
    const eventFlow = await this.eventTracker.startEventFlow(
      `chapter-${input.chapterNumber}`,
      input.chapterNumber
    );

    // 3. 生成剧情事件（模拟）
    const events = await this.generateEvents(input);

    // 4. 调用 Skill System 处理事件
    const skillExecutions = await this.processEventsWithSkills(events);

    // 5. 更新 World State
    const worldStateAfter = await this.updateWorldState(input.worldState, events);

    // 6. 生成小说正文
    const content = await this.writeChapterContent({
      chapterNumber: input.chapterNumber,
      events,
      worldState: worldStateAfter,
      previousChapter: input.previousChapter,
    });

    // 7. 构建输出
    const output: ChapterGenerationOutput = {
      chapterNumber: input.chapterNumber,
      title: `第 ${input.chapterNumber} 章`,
      content,
      wordCount: content.length,
      generationTime: Date.now() - startTime,
      eventFlow,
      skillExecutions,
      worldStateBefore,
      worldStateAfter,
      metadata: {
        model: 'gpt-4',
        tokenUsage: 2000 + Math.floor(Math.random() * 1000),
        cost: 0.06,
      },
    };

    return output;
  }

  /**
   * 生成剧情事件（模拟）
   */
  private async generateEvents(input: ChapterGenerationInput): Promise<WorldEvent[]> {
    // 模拟事件生成（实际应该调用 AI）
    const events: WorldEvent[] = [
      {
        id: `event-${Date.now()}-1`,
        type: '战斗',
        description: '林夜与血影宗长老展开激战',
        timestamp: Date.now(),
        affectedCharacters: ['char-1', 'char-2'],
        changes: [
          {
            targetType: 'character',
            targetId: 'char-1',
            field: 'hp',
            oldValue: 100,
            newValue: 65,
          },
        ],
      },
      {
        id: `event-${Date.now()}-2`,
        type: '对话',
        description: '苏清歌试图劝阻双方',
        timestamp: Date.now() + 1000,
        affectedCharacters: ['char-1', 'char-3'],
        changes: [],
      },
    ];

    return events;
  }

  /**
   * 调用 Skill System 处理事件
   */
  private async processEventsWithSkills(events: WorldEvent[]): Promise<SkillExecution[]> {
    const executions: SkillExecution[] = [];

    for (const event of events) {
      // 模拟 Skill 调用
      const skill = this.skillLibrary.getSkillById('upgrade_loop');
      if (skill) {
        executions.push({
          skillId: skill.id,
          input: { event },
          output: { processed: true },
          timestamp: Date.now(),
          success: true,
        });
      }
    }

    return executions;
  }

  /**
   * 更新 World State
   */
  private async updateWorldState(
    currentState: WorldSnapshot,
    events: WorldEvent[]
  ): Promise<WorldSnapshot> {
    let newState = { ...currentState };

    for (const event of events) {
      newState = this.worldManager.applyEventToState(newState, event);
    }

    return newState;
  }

  /**
   * 生成小说正文
   */
  private async writeChapterContent(params: {
    chapterNumber: number;
    events: WorldEvent[];
    worldState: WorldSnapshot;
    previousChapter?: string;
  }): Promise<string> {
    // 模拟小说生成（实际应该调用 AI）
    const content = `
# 第 ${params.chapterNumber} 章

夜色如墨，笼罩着整个北境城。

林夜站在城墙之上，目光凝视着远方。他的内心并不平静——血影宗的威胁如同悬在头顶的利剑，随时可能落下。

"林兄，你在想什么？"

苏清歌的声音从身后传来。林夜回头，看到她那双清澈的眼眸中带着一丝担忧。

"在想接下来的路。"林夜淡淡说道，"血影宗不会善罢甘休。"

苏清歌走到他身旁，轻声道："我相信你。"

就在这时，一道黑色的身影突然从城下掠起，速度快得惊人。林夜瞳孔一缩——是血影宗的长老·墨煞！

"林夜，拿命来！"

墨煞的声音如同来自地狱，带着浓烈的杀意。他的手中握着一把血色的长刀，刀锋上散发着诡异的红光。

林夜冷哼一声，身形一闪，已经迎了上去。

"轰——"

两股强大的力量在空中碰撞，气浪翻涌，城墙上的瓦片纷纷震落。

战斗，一触即发。

---

（本章完）

---

**剧情事件**：
${params.events.map(e => `- ${e.description}`).join('\n')}

**世界状态变化**：
- 林夜 HP：100 → 65
- 关系变化：林夜 ↔ 墨煞（敌对 +10）
    `.trim();

    return content;
  }
}
