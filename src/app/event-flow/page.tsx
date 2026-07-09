'use client';

import { GitBranch } from 'lucide-react';
import { ComingSoon } from '@/components/common/ComingSoon';

export default function EventFlowPage() {
  return (
    <ComingSoon
      icon={GitBranch}
      title="事件流"
      subtitle="Event Flow"
      description="以「系统心跳」的形式可视化创作过程中的事件流：每次生成触发的步骤、状态变更与副作用一目了然。"
      features={[
        '实时事件流 / 心跳时间线',
        '单章事件步骤下钻（eventFlow.steps）',
        '事件类型过滤与高亮',
        '异常 / 失败事件告警视图',
      ]}
      gradient="from-cyan-600 to-blue-600"
    />
  );
}
