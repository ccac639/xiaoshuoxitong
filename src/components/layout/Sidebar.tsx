'use client';

import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  BookOpen,
  FlaskConical,
  Brain,
  Network,
  GitBranch,
  Globe,
  FileText,
  Library,
  BrainCircuit,
  Download,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';

/**
 * 侧边栏导航组件
 */
export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { id: 'dashboard', label: '控制台', icon: Home, path: '/' },
    { id: 'novel', label: '小说管理', icon: BookOpen, path: '/novel' },
    { id: 'chapter', label: '章节生成', icon: FileText, path: '/chapter' },
    { id: 'import', label: '导入 OCR', icon: Download, path: '/import' },
    { id: 'skill-lab', label: 'Skill 实验室', icon: FlaskConical, path: '/skill-lab' },
    { id: 'memory', label: '经验查看器', icon: Brain, path: '/memory' },
    { id: 'story-memory', label: '故事记忆', icon: BrainCircuit, path: '/story-memory' },
    { id: 'agent-trace', label: '决策追踪', icon: Network, path: '/agent-trace' },
    { id: 'event-flow', label: '事件流', icon: GitBranch, path: '/event-flow' },
    { id: 'world-state', label: '世界状态', icon: Globe, path: '/world-state' },
    { id: 'knowledge', label: '知识库', icon: Library, path: '/knowledge' },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  return (
    <div className="w-64 h-screen glass-panel border-r border-base flex flex-col shrink-0">
      {/* Logo + 主题切换 */}
      <div className="p-4 border-b border-base">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600
                          flex items-center justify-center text-white font-bold text-lg
                          shadow-lg shadow-purple-900/30">
              N
            </div>
            <div>
              <h1 className="text-lg font-bold text-strong leading-tight">Narrative OS</h1>
              <p className="text-[11px] text-muted">V3 Learning System</p>
            </div>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200 group',
                active
                  ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-strong border border-cyan-500/30'
                  : 'text-muted hover:text-primary hover:bg-white/5 border border-transparent'
              )}
            >
              <item.icon
                size={18}
                className={cn(
                  'transition-colors duration-200',
                  active ? 'text-cyan-400' : 'group-hover:text-cyan-400'
                )}
              />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 底部信息 */}
      <div className="p-4 border-t border-base">
        <div className="text-[11px] text-muted text-center">
          Narrative Learning System v3.0
        </div>
      </div>
    </div>
  );
}
