/**
 * V2 API Routes - 升级后的章节生成 API
 *
 * 路由：
 *   POST /api/generate-chapter-v2  - 生成一章
 *   GET  /api/project/:id/memory   - 获取记忆上下文
 *   GET  /api/project/:id/state    - 获取世界状态快照
 *   GET  /api/project/:id/cost     - 获取成本统计
 */

// 此文件供 Next.js 14 App Router 使用，放在 app/api/ 下
// 实际导入路径需根据项目结构调整

import { NextRequest, NextResponse } from 'next/server';

// ==================== generate-chapter-v2 ====================

export async function POST_generate_chapter(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, chapterNumber, customPrompt } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: '缺少 projectId' }, { status: 400 });
    }

    // 动态导入 V2 模块
    const { ChapterWriterV2 } = await import('@/server/generation/chapterWriterV2');
    const { projectStore } = await import('@/server/project/projectStore');

    const project = await projectStore.getProject(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: '项目不存在' }, { status: 404 });
    }

    const targetChapter = chapterNumber || project.currentChapter;

    const writer = new ChapterWriterV2(projectId);
    const result = await writer.generateChapter(targetChapter, customPrompt);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.pipelineState.errors.join('; '),
        stage: result.pipelineState.stage,
        cost: result.cost,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      chapter: {
        number: result.chapter?.chapterNumber,
        title: result.chapter?.title,
        wordCount: result.chapter?.wordCount,
        contentPreview: result.chapter?.content.substring(0, 500),
      },
      audit: {
        passed: result.auditResult?.passed,
        score: result.auditResult?.score,
        feedback: result.auditResult?.overallFeedback,
      },
      cost: result.cost,
      pipelineStage: result.pipelineState.stage,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || '未知错误',
    }, { status: 500 });
  }
}

// ==================== project/:id/memory ====================

export async function GET_project_memory(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { getStoryMemory } = await import('@/server/memory/storyMemoryV2');
    const memory = getStoryMemory(params.id);

    const [recentSummaries, worldState, characters, pendingForeshadowing, unresolvedHooks, styleProfile] =
      await Promise.all([
        memory.getRecentSummaries(5),
        memory.getWorldState(),
        memory.getCharacters(),
        memory.getPendingForeshadowing(),
        memory.getUnresolvedHooks(),
        memory.getStyleProfile(),
      ]);

    return NextResponse.json({
      projectId: params.id,
      recentSummaries,
      worldState: {
        flagCount: Object.keys(worldState.flags).length,
        factionCount: Object.keys(worldState.factions).length,
        ruleCount: worldState.rules.length,
        timelineEventCount: worldState.timeline.length,
      },
      characterCount: Object.keys(characters).length,
      characterSummaries: Object.values(characters).map(c => ({
        id: c.id,
        name: c.name,
        location: c.currentLocation,
        hp: c.hp,
        level: c.level,
        statusEffects: c.statusEffects,
      })),
      pendingForeshadowing,
      unresolvedHooks,
      styleProfile,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ==================== project/:id/state ====================

export async function GET_project_state(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { getWorldStateManager } = await import('@/server/world/stateManagerV2');
    const wsm = getWorldStateManager(params.id);
    const snapshot = await wsm.getSnapshot();

    return NextResponse.json({
      projectId: params.id,
      chapterNumber: snapshot.chapterNumber,
      characterCount: Object.keys(snapshot.characters).length,
      flagCount: Object.keys(snapshot.flags).length,
      relationCount: snapshot.relations.length,
      snapshot,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ==================== project/:id/cost ====================

export async function GET_project_cost(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { projectStore } = await import('@/server/project/projectStore');
    const chapters = await projectStore.listChapters(params.id);

    const totalTokens = chapters.reduce((sum, c) => sum + c.metadata.tokenUsage, 0);
    const totalCost = chapters.reduce((sum, c) => sum + c.metadata.cost, 0);
    const totalTime = chapters.reduce((sum, c) => sum + c.metadata.generationTime, 0);

    const byModel: Record<string, { chapters: number; tokens: number; cost: number }> = {};
    for (const c of chapters) {
      const model = c.metadata.model;
      if (!byModel[model]) byModel[model] = { chapters: 0, tokens: 0, cost: 0 };
      byModel[model].chapters++;
      byModel[model].tokens += c.metadata.tokenUsage;
      byModel[model].cost += c.metadata.cost;
    }

    return NextResponse.json({
      projectId: params.id,
      chapterCount: chapters.length,
      totalTokens,
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalTimeMs: totalTime,
      avgCostPerChapter: chapters.length > 0
        ? Math.round((totalCost / chapters.length) * 10000) / 10000
        : 0,
      avgTokensPerChapter: chapters.length > 0
        ? Math.round(totalTokens / chapters.length)
        : 0,
      byModel,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
