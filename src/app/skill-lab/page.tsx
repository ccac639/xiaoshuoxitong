'use client';

import { FlaskConical } from 'lucide-react';
import { ComingSoon } from '@/components/common/ComingSoon';

export default function SkillLabPage() {
  return (
    <ComingSoon
      icon={FlaskConical}
      title="Skill 实验室"
      subtitle="Skill Lab"
      description="创建、调试并测试用于 AI 写作的自定义技能与提示词，沉淀可复用的写作能力。"
      features={[
        '可视化编写与调试 Skill 提示词',
        '本地草稿 / 已发布技能切换',
        '一键在样例章节上试运行',
        '与章节续写、润色流程打通',
      ]}
      gradient="from-purple-600 to-pink-600"
    />
  );
}
