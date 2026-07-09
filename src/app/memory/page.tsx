'use client';

import { Brain } from 'lucide-react';
import { ComingSoon } from '@/components/common/ComingSoon';

export default function MemoryPage() {
  return (
    <ComingSoon
      icon={Brain}
      title="经验查看器"
      subtitle="Experience Viewer"
      description="浏览系统在写作过程中沉淀的「经验」，理解它从已生成章节里学到了什么，并据此改进后续创作。"
      features={[
        '经验列表与时间线视图',
        '按类型 / 小说筛选经验',
        '查看单条经验的来源章节与依据',
        '手动标记有效 / 失效经验',
      ]}
      gradient="from-green-600 to-teal-600"
    />
  );
}
