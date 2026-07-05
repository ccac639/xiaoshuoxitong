'use client';

import { useRouter } from 'next/navigation';
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
  BrainCircuit, // 新增：Story Memory 图标
} from 'lucide-react';

/**
 * 侧边栏导航组件
 */
export function Sidebar() {
  const router = useRouter();

  const menuItems = [
    { id: 'dashboard', label: '控制台', icon: Home, path: '/' },
    { id: 'novel', label: '小说管理', icon: BookOpen, path: '/novel' },
    { id: 'chapter', label: '章节生成', icon: FileText, path: '/chapter' },
    { id: 'skill-lab', label: 'Skill 实验室', icon: FlaskConical, path: '/skill-lab' },
    { id: 'memory', label: '经验查看器', icon: Brain, path: '/memory' },
    { id: 'story-memory', label: '故事记忆', icon: BrainCircuit, path: '/story-memory' }, // 新增
    { id: 'agent-trace', label: '决策追踪', icon: Network, path: '/agent-trace' },
    { id: 'event-flow', label: '事件流', icon: GitBranch, path: '/event-flow' },
    { id: 'world-state', label: '世界状态', icon: Globe, path: '/world-state' },
    { id: 'knowledge', label: '知识库', icon: Library, path: '/knowledge' },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <div className="w-64 h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-600 
                        flex items-center justify-center text-white font-bold text-lg">
            N
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-100">Narrative OS</h1>
            <p className="text-xs text-gray-500">V3 Learning System</p>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm 
                     text-gray-400 hover:text-gray-200 hover:bg-gray-800 
                     rounded-lg transition-all duration-200 group"
          >
            <item.icon 
              size={18} 
              className="group-hover:text-cyan-400 transition-colors" 
            />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* 底部信息 */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-600 text-center">
          Narrative Learning System v3.0
        </div>
      </div>
    </div>
  );
}
