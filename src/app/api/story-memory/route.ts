/**
 * Story Memory API - 故事记忆系统 API
 * 
 * GET /api/story-memory - 获取故事记忆
 * POST /api/story-memory - 保存章节到记忆
 */

import { NextRequest, NextResponse } from 'next/server';
import { storyMemoryManager } from '@/server/memory/storyMemory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId') || 'default';
    const action = searchParams.get('action') || 'all';

    const memory = storyMemoryManager.getOrCreateMemory(storyId, '默认故事');

    let response: any = {};

    switch (action) {
      case 'history':
        // 获取章节历史
        response = {
          success: true,
          data: {
            chapterHistory: memory.chapterHistory,
            totalChapters: memory.chapterHistory.length,
          },
        };
        break;

      case 'arcs':
        // 获取角色成长轨迹
        response = {
          success: true,
          data: {
            characterArcs: memory.characterArcs,
          },
        };
        break;

      case 'context':
        // 获取故事上下文（用于生成下一章）
        const context = storyMemoryManager.getStoryContext(storyId);
        response = {
          success: true,
          data: context,
        };
        break;

      case 'all':
      default:
        // 获取所有记忆
        response = {
          success: true,
          data: {
            storyId: memory.storyId,
            storyName: memory.storyName,
            totalChapters: memory.chapterHistory.length,
            chapterHistory: memory.chapterHistory.slice(-5), // 最近5章
            characterArcs: memory.characterArcs,
            overallSummary: memory.overallSummary,
            pendingHooks: memory.pendingHooks,
            memoryBankSize: memory.memoryBank.length,
          },
        };
        break;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyId, chapterData } = body;

    if (!storyId || !chapterData) {
      return NextResponse.json(
        { success: false, error: '缺少 storyId 或 chapterData' },
        { status: 400 }
      );
    }

    // 保存章节到记忆
    const record = storyMemoryManager.saveChapter(storyId, chapterData);

    return NextResponse.json({
      success: true,
      data: {
        message: '章节已保存到记忆',
        record,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
