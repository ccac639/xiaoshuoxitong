'use client';

import { 
  BookOpen, 
  FlaskConical, 
  Brain, 
  Network, 
  GitBranch,
  Globe,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Dashboard - 控制台主页
 */
export default function DashboardPage() {
  const router = useRouter();

  const modules = [
    {
      id: 'novel',
      title: '小说管理',
      description: '创建和管理小说项目',
      icon: BookOpen,
      color: 'from-blue-600 to-cyan-600',
    },
    {
      id: 'skill-lab',
      title: 'Skill 实验室',
      description: '创建和测试 AI 写作技能',
      icon: FlaskConical,
      color: 'from-purple-600 to-pink-600',
    },
    {
      id: 'memory',
      title: '经验查看器',
      description: '查看系统学习经验',
      icon: Brain,
      color: 'from-green-600 to-teal-600',
    },
    {
      id: 'agent-trace',
      title: '决策追踪',
      description: '查看 AI 决策过程',
      icon: Network,
      color: 'from-orange-600 to-red-600',
    },
    {
      id: 'event-flow',
      title: '事件流',
      description: '系统心跳可视化',
      icon: GitBranch,
      color: 'from-cyan-600 to-blue-600',
    },
    {
      id: 'world-state',
      title: '世界状态',
      description: '系统最终真相',
      icon: Globe,
      color: 'from-emerald-600 to-green-600',
    },
  ];

  return (
    <div className="p-8">
      {/* 标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gradient-cyan mb-2">
          Narrative Learning System
        </h1>
        <p className="text-gray-500">
          V3 叙事学习系统 - AI 小说操作系统
        </p>
      </div>

      {/* 模块网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <div
            key={module.id}
            onClick={() => router.push(`/${module.id === 'novel' ? '' : module.id}`)}
            className="group cursor-pointer"
          >
            <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 
                          rounded-xl p-6 hover:border-gray-700 hover:shadow-xl 
                          transition-all duration-300 hover:-translate-y-1">
              {/* 图标 */}
              <div className={`
                w-12 h-12 rounded-lg bg-gradient-to-br ${module.color}
                flex items-center justify-center mb-4
                group-hover:scale-110 transition-transform duration-300
              `}>
                <module.icon size={24} className="text-white" />
              </div>

              {/* 标题和描述 */}
              <h3 className="text-lg font-semibold text-gray-200 mb-2">
                {module.title}
              </h3>
              <p className="text-sm text-gray-500">
                {module.description}
              </p>

              {/* 进入箭头 */}
              <div className="mt-4 flex justify-end">
                <span className="text-gray-600 group-hover:text-cyan-400 
                               transition-colors duration-300">
                  →
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 系统状态 */}
      <div className="mt-12 p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
        <h2 className="text-lg font-semibold text-gray-300 mb-4">系统状态</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">系统版本</div>
            <div className="text-2xl font-bold text-cyan-400">V3.0</div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">运行状态</div>
            <div className="text-2xl font-bold text-green-400">正常</div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">Skills</div>
            <div className="text-2xl font-bold text-purple-400">5</div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">世界快照</div>
            <div className="text-2xl font-bold text-orange-400">3</div>
          </div>
        </div>
      </div>
    </div>
  );
}
