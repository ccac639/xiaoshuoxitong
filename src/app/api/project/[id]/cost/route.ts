import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { projectStore } = await import('@/server/project/projectStore');
    const chapters = await projectStore.listChapters(id);

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
      projectId: id,
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
