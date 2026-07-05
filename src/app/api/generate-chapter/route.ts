import { NextRequest, NextResponse } from 'next/server';
import { WorldSnapshot, WorldEvent } from '@/types';
import { MOCK_SNAPSHOT } from '@/lib/mockWorldState';

/**
 * POST /api/generate-chapter
 * 
 * 生成新章节 - 系统核心闭环入口
 * 
 * 完整流程：
 * 1. 读取 World State
 * 2. 生成剧情事件
 * 3. 调用 Skill System
 * 4. 更新 World State
 * 5. 生成小说正文
 * 6. 返回结果
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterNumber, worldState } = body;
    
    // 使用默认世界状态（如果未提供）
    const baseWorldState = worldState && Object.keys(worldState).length > 0 ? worldState : MOCK_SNAPSHOT;

    // 模拟生成延迟
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 1. 生成剧情事件
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

    // 2. 更新世界状态（模拟）
    const updatedWorldState: WorldSnapshot = {
      ...baseWorldState,
      id: `snapshot-chapter-${chapterNumber}`,
      chapterNumber,
      timestamp: Date.now(),
      characters: {
        ...baseWorldState.characters,
        'char-1': {
          ...baseWorldState.characters['char-1'],
          hp: 65,
          emotion: '愤怒',
        },
      },
    };

    // 3. 生成小说正文
    const content = generateChapterContent(chapterNumber, events, updatedWorldState);

    // 4. 构建响应
    const response = {
      success: true,
      data: {
        chapterNumber,
        title: `第 ${chapterNumber} 章`,
        content,
        wordCount: content.length,
        events,
        worldStateBefore: baseWorldState,
        worldStateAfter: updatedWorldState,
        metadata: {
          generationTime: 2000,
          model: 'gpt-4',
          tokenUsage: 2500,
          cost: 0.075,
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
