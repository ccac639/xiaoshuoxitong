'use client';

import {
  BookOpen,
  FlaskConical,
  Brain,
  Network,
  GitBranch,
  Globe,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Dashboard - 控制台主页（premium 玻璃拟态版）
 */
export default function DashboardPage() {
  const router = useRouter();

  const modules = [
    { id: 'novel', title: '小说管理', description: '创建和管理小说项目', icon: BookOpen, color: 'from-blue-600 to-cyan-600' },
    { id: 'import', title: '导入 OCR', description: '导入 OCR 清洗的小说章节', icon: FileText, color: 'from-emerald-600 to-teal-600' },
    { id: 'skill-lab', title: 'Skill 实验室', description: '创建和测试 AI 写作技能', icon: FlaskConical, color: 'from-purple-600 to-pink-600' },
    { id: 'memory', title: '经验查看器', description: '查看系统学习经验', icon: Brain, color: 'from-green-600 to-teal-600' },
    { id: 'agent-trace', title: '决策追踪', description: '查看 AI 决策过程', icon: Network, color: 'from-orange-600 to-red-600' },
    { id: 'event-flow', title: '事件流', description: '系统心跳可视化', icon: GitBranch, color: 'from-cyan-600 to-blue-600' },
    { id: 'world-state', title: '世界状态', description: '系统最终真相', icon: Globe, color: 'from-emerald-600 to-green-600' },
    { id: 'knowledge', title: '知识库', description: '结构化知识沉淀', icon: BookOpen, color: 'from-amber-600 to-orange-600' },
  ];

  return (
    <div className="relative p-8 min-h-full overflow-hidden">
      {/* 环境光晕 */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl animate-float-glow" />
      <div className="pointer-events-none absolute top-40 -right-24 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl animate-float-glow" style={{ animationDelay: '2s' }} />

      <div className="relative">
        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient-cyan mb-2">
            Narrative Learning System
          </h1>
          <p className="text-muted">V3 叙事学习系统 · AI 小说操作系统</p>
        </div>

        {/* 快速操作 */}
        <div className="mb-8 p-6 glass-panel rounded-2xl hover-lift">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-strong mb-2">开始创作</h2>
              <p className="text-muted max-w-xl">
                点击按钮，系统将自动完成：事件生成 → 技能调用 → 世界更新 → 章节生成
              </p>
            </div>
            <button
              onClick={() => router.push('/chapter')}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600
                       text-white rounded-xl hover:from-cyan-500 hover:to-blue-500
                       transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cyan-900/50
                       font-medium text-lg"
            >
              <FileText size={24} />
              开始创作
            </button>
          </div>
        </div>

        {/* 模块网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => router.push(`/${module.id === 'novel' ? '' : module.id}`)}
              className="group text-left glass-panel rounded-2xl p-5 hover-lift border border-transparent hover:border-cyan-500/30"
            >
              <div className={cn(
                'w-12 h-12 rounded-xl bg-gradient-to-br mb-4 flex items-center justify-center',
                'group-hover:scale-110 transition-transform duration-300',
                module.color
              )}>
                <module.icon size={22} className="text-white" />
              </div>
              <h3 className="text-base font-semibold text-strong mb-1">{module.title}</h3>
              <p className="text-xs text-muted leading-relaxed">{module.description}</p>
              <div className="mt-3 flex justify-end">
                <span className="text-muted group-hover:text-cyan-400 transition-colors duration-300">→</span>
              </div>
            </button>
          ))}
        </div>

        {/* 系统状态 */}
        <div className="mt-10 p-6 glass-panel rounded-2xl">
          <h2 className="text-lg font-semibold text-strong mb-4">系统状态</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '系统版本', value: 'V3.0', color: 'text-cyan-400' },
              { label: '运行状态', value: '正常', color: 'text-green-400' },
              { label: 'Skills', value: '5', color: 'text-purple-400' },
              { label: '世界快照', value: '3', color: 'text-orange-400' },
            ].map((s) => (
              <div key={s.label} className="p-4 surface-2 rounded-xl border border-base">
                <div className="text-xs text-muted mb-1">{s.label}</div>
                <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
