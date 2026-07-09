import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { getStoryMemory } = await import('@/server/memory/storyMemoryV2');
    const memory = getStoryMemory(id);

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
      projectId: id,
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
