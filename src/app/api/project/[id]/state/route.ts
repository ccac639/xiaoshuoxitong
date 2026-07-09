import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { getWorldStateManager } = await import('@/server/world/stateManagerV2');
    const wsm = getWorldStateManager(id);
    const snapshot = await wsm.getSnapshot();

    return NextResponse.json({
      projectId: id,
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
