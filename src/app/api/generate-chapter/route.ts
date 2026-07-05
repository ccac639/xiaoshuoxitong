import { NextRequest, NextResponse } from 'next/server';
import { WorldSnapshot, WorldEvent, ChapterGenerationOutput } from '@/types';
import { MOCK_SNAPSHOT } from '@/lib/mockWorldState';
import { auditChapter, AuditResult } from '@/server/audit/fanqieSkill';
import { storyMemoryManager } from '@/server/memory/storyMemory';

/**
 * POST /api/generate-chapter
 * 
 * 生成新章节 - 系统核心闭环入口
 * 
 * 【重要】正确流程（确认驱动）：
 * 1. 生成剧情事件
 * 2. 生成小说正文
 * 3. 🔥 审计章节（fanqie-novel-skill）
 * 4. 【只有审计通过后才更新 World State】
 * 5. 返回结果
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterNumber, worldState, storyId = 'default' } = body;
    
    // 使用默认世界状态（如果未提供）
    const baseWorldState = worldState && Object.keys(worldState).length > 0 ? worldState : MOCK_SNAPSHOT;
    
    // 【Story Memory 集成】步骤 0：获取上一章总结（用于保持连贯性）
    const previousSummary = storyMemoryManager.getPreviousChapterSummary(storyId);
    if (previousSummary) {
      console.log(`[Story Memory] 上一章总结：\n${previousSummary}`);
    }
    
    // 模拟生成延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 1. 生成剧情事件（结构化指令，不参与创作）
    const events: WorldEvent[] = [
      {
        id: `event-${Date.now()}-1`,
        type: '战斗',
        description: '林夜与血影宗长老展开激战',
        timestamp: Date.now(),
        affectedCharacters: ['char-1', 'char-2'],
        changes: [],
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
    
    // 2. 生成小说正文（只负责"怎么写"，不决定"发生什么"）
    const content = generateChapterContent(chapterNumber, events, baseWorldState);
    
    // 3. 🔥 审计章节（fanqie-novel-skill）
    const auditContext = {
      chapterNumber,
      worldState: baseWorldState,
      eventFlow: events,
      storyMemory: body.storyMemory || null,
      previousChapters: body.previousChapters || [],
    };
    
    const auditResult: AuditResult = auditChapter(content, auditContext);
    
    // 4. 【只有审计通过后才更新世界状态】
    let shouldUpdateWorldState = false;
    let updatedWorldState = null;
    
    if (auditResult.status === 'pass') {
      // 审计通过：才更新世界状态
      updatedWorldState = applyEventsToWorldState(baseWorldState, events, chapterNumber);
      shouldUpdateWorldState = true;
    } else {
      // 审计不通过：不更新世界状态
      shouldUpdateWorldState = false;
      // 返回原始世界状态（未修改）
      updatedWorldState = baseWorldState;
    }
    
    // 5. 【Story Memory 集成】保存章节到记忆（即使审计未通过也保存，用于分析）
    try {
      const chapterData: ChapterGenerationOutput = {
        chapterNumber,
        title: `第 ${chapterNumber} 章`,
        content,
        wordCount: content.length,
        generationTime: 2000,
        eventFlow: { steps: events },
        skillExecutions: [],
        worldStateBefore: baseWorldState,
        worldStateAfter: shouldUpdateWorldState ? updatedWorldState! : baseWorldState,
        metadata: {
          model: 'gpt-4',
          tokenUsage: 2500,
          cost: 0.075,
          auditTime: 500,
          auditScore: auditResult.score,
        },
      };
      
      const savedRecord = storyMemoryManager.saveChapter(storyId, chapterData);
      console.log(`[Story Memory] 章节已保存：第${chapterNumber}章（${savedRecord.wordCount}字）`);
    } catch (memoryError: any) {
      console.error('[Story Memory] 保存失败：', memoryError.message);
    }
    
    // 6. 构建响应
    const response = {
      success: true,
      data: {
        chapterNumber,
        title: `第 ${chapterNumber} 章`,
        content,
        wordCount: content.length,
        events,
        worldStateBefore: baseWorldState,
        worldStateAfter: shouldUpdateWorldState ? updatedWorldState : null,
        audit: auditResult, // 🔥 审计结果
        shouldUpdateWorldState, // 是否应该更新世界状态
        storyMemory: {
          previousSummary,
          overallSummary: storyMemoryManager.getStoryContext(storyId).overallSummary,
        },
        metadata: {
          generationTime: 2000,
          model: 'gpt-4',
          tokenUsage: 2500,
          cost: 0.075,
          auditTime: 500,
          auditScore: auditResult.score,
        },
      },
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * 生成章节内容（模拟）
 */
function generateChapterContent(
  chapterNumber: number,
  events: WorldEvent[],
  worldState: WorldSnapshot
): string {
  const character = worldState.characters?.['char-1'] || { name: '林夜' };
  const characterName = character?.name || '林夜';

  return `
# 第 ${chapterNumber} 章

夜色如墨，笼罩着整个北境城。

${characterName}站在城墙之上，目光凝视着远方。他的内心并不平静——血影宗的威胁如同悬在头顶的利剑，随时可能落下。

"${characterName}兄，你在想什么？"

苏清歌的声音从身后传来。${characterName}回头，看到她那双清澈的眼眸中带着一丝担忧。

"在想接下来的路。"${characterName}淡淡说道，"血影宗不会善罢甘休。"

苏清歌走到他身旁，轻声道："我相信你。"

就在这时，一道黑色的身影突然从城下掠起，速度快得惊人。${characterName}瞳孔一缩——是血影宗的长老·墨煞！

"${characterName}，拿命来！"

墨煞的声音如同来自地狱，带着浓烈的杀意。他的手中握着一把血色的长刀，刀锋上散发着诡异的红光。

${characterName}冷哼一声，身形一闪，已经迎了上去。

"轰——"

两股强大的力量在空中碰撞，气浪翻涌，城墙上的瓦片纷纷震落。

战斗，一触即发。

---

**剧情事件记录**：

${events.map((e, idx) => `${idx + 1}. ${e.description} (类型：${e.type})`).join('\n')}

**世界状态变化**：

- ${characterName} HP：100 → 65
- 情绪状态：${character.emotion}

---

（本章完）

*生成时间：${new Date().toLocaleString('zh-CN')}*
`.trim();
}

/**
 * GET /api/generate-chapter
 * 
 * 获取生成状态（用于轮询）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chapterNumber = searchParams.get('chapterNumber');

  return NextResponse.json({
    success: true,
    data: {
      chapterNumber,
      status: 'ready',
      message: '章节生成完成',
    },
  });
}

/**
 * 根据事件更新世界状态
 */
function applyEventsToWorldState(
  baseWorldState: WorldSnapshot,
  events: any[],
  chapterNumber: number
): WorldSnapshot {
  // 简化版：只更新章节号和时间戳
  return {
    ...baseWorldState,
    id: `snapshot-chapter-${chapterNumber}`,
    chapterNumber,
    timestamp: Date.now(),
    characters: {
      ...baseWorldState.characters,
      'char-1': {
        ...baseWorldState.characters['char-1'],
        hp: 65, // 模拟：林夜 HP 下降
        emotion: '愤怒',
      },
    },
  };
}
