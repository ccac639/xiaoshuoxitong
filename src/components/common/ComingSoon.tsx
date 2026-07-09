'use client';

import { type LucideIcon, Construction } from 'lucide-react';

interface ComingSoonProps {
  /** 页面图标（lucide） */
  icon: LucideIcon;
  /** 主标题，如 "小说管理" */
  title: string;
  /** 副标题/英文标识，如 "Novel Management" */
  subtitle: string;
  /** 功能描述 */
  description: string;
  /** 规划中的子能力列表 */
  features?: string[];
  /** logo 方块渐变色（tailwind from/to） */
  gradient?: string;
}

/**
 * 通用「功能开发中」占位页。
 * 用于导航已暴露、但 UI 页面尚未实现的路由，避免 404 死链。
 */
export function ComingSoon({
  icon: Icon,
  title,
  subtitle,
  description,
  features = [],
  gradient = 'from-purple-600 to-cyan-600',
}: ComingSoonProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* 页面标题栏（与现有页面风格一致） */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient}
                        flex items-center justify-center text-white font-bold text-lg`}
          >
            {title.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">{title}</h1>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* 占位内容 */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
        <div className="glass-panel w-full max-w-xl rounded-2xl border border-gray-800 p-8 text-center">
          <div
            className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${gradient}
                        flex items-center justify-center text-white mb-5 shadow-lg`}
          >
            <Icon size={30} />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                          bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mb-4">
            <Construction size={14} />
            功能开发中
          </div>

          <h2 className="text-2xl font-bold text-gray-100 mb-2">{title}</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">{description}</p>

          {features.length > 0 && (
            <div className="text-left bg-gray-900/60 rounded-xl border border-gray-800 p-4 mb-5">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">
                规划中的能力
              </p>
              <ul className="space-y-1.5">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-600">
            该模块的后端逻辑已在 <code className="text-gray-400">server/</code> 层实现，
            UI 页面待补全。可从侧边栏返回其他已完成的模块。
          </p>
        </div>
      </div>
    </div>
  );
}
