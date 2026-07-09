import { NextRequest, NextResponse } from 'next/server';
import { listNovels, getNovel, deleteNovel, createNovel, updateNovel } from '@/server/novel/novelStore';
import type { NovelSite } from '@/types/novel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const novel = await getNovel(id);
    if (!novel) return NextResponse.json({ error: '未找到该小说' }, { status: 404 });
    return NextResponse.json(novel);
  }
  const list = await listNovels();
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = (body.title || '').trim();
    if (!title) {
      return NextResponse.json({ error: '书名不能为空' }, { status: 400 });
    }
    const site: NovelSite = ['qidian', 'fanqie', 'unknown'].includes(body.site)
      ? body.site
      : 'unknown';
    const novel = await createNovel({
      title,
      site,
      type: body.type,
      settings: body.settings,
      folder: body.folder,
      pinned: body.pinned,
    });
    return NextResponse.json(novel, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
    const updated = await updateNovel(id, {
      title: body.title,
      site: ['qidian', 'fanqie', 'unknown'].includes(body.site) ? body.site : undefined,
      type: body.type,
      settings: body.settings,
      folder: body.folder,
      pinned: body.pinned,
    });
    if (!updated) return NextResponse.json({ error: '未找到该小说' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  await deleteNovel(id);
  return NextResponse.json({ success: true });
}
