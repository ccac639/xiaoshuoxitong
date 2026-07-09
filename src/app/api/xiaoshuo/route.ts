import { handleXiaoshuo } from '../../../server/generation/xiaoshuoProxy';
import { listAliases } from '../../../server/generation/modelRouter';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/xiaoshuo/  body: {"model":"orHy3","prompt":"..."} 或 {"model":"glm","messages":[...]}
export async function POST(req: NextRequest) {
  return handleXiaoshuo(req as unknown as Request);
}

// GET /api/xiaoshuo/  列出所有可用模型别名
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'POST /api/xiaoshuo/{alias}  或  POST /api/xiaoshuo/  body.model=别名',
    aliases: listAliases(),
  });
}
