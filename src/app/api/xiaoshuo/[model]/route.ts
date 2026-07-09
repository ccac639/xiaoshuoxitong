import { handleXiaoshuo } from '../../../../server/generation/xiaoshuoProxy';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/xiaoshuo/SFV4-Flash  （模型别名写在路径里）
export async function POST(
  req: NextRequest,
  { params }: { params: { model: string } }
) {
  return handleXiaoshuo(req as unknown as Request, params.model);
}
