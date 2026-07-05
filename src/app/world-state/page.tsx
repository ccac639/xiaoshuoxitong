'use client';

import { WorldStatePanel } from '@/components/world-state/WorldStatePanel';

/**
 * World State 页面
 * 
 * URL: /world-state
 */
export default function WorldStatePage() {
  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* 页面标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 
                        flex items-center justify-center text-white font-bold text-lg">
            W
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">World State</h1>
            <p className="text-xs text-gray-500">系统最终真相 - 世界状态可视化</p>
          </div>
        </div>
      </div>

      {/* World State Panel */}
      <div className="flex-1 overflow-hidden">
        <WorldStatePanel />
      </div>
    </div>
  );
}
