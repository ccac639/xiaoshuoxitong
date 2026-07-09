import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, chapterNumber, customPrompt } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: '缺少 projectId' }, { status: 400 });
    }

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
