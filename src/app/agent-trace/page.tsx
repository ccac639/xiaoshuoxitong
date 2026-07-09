'use client';

import { Network } from 'lucide-react';
import { ComingSoon } from '@/components/common/ComingSoon';

export default function AgentTracePage() {
  return (
    <ComingSoon
      icon={Network}
      title="决策追踪"
      subtitle="Agent Trace"
      description="回放 AI 在生成章节时的决策链路：从世界状态读取、质量闸门判断到最终落笔，每一步都可追溯。"
      features={[
        '决策时间线与步骤回放',
        '世界状态读取与写入记录',
        '质量闸门（fanqie 审计）命中详情',
        '按章节检索历史决策',
      ]}
      gradient="from-orange-600 to-red-600"
    />
  );
}
