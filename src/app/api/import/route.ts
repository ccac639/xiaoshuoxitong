import { NextRequest, NextResponse } from 'next/server';
import { importFromFolder } from '@/server/novel/novelStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const folderPath: string = (body.folderPath || '').trim();
    if (!folderPath) {
      return NextResponse.json({ success: false, error: '请提供 OCR 输出文件夹路径' }, { status: 400 });
    }
    const result = await importFromFolder(folderPath);
    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}
