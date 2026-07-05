'use client';

import { WorldSnapshot, WorldFlag } from '@/types';
import { Flag, ToggleLeft, ToggleRight, Hash, Type } from 'lucide-react';

interface WorldFlagsProps {
  snapshot: WorldSnapshot;
}

/**
 * 世界变量面板 - 展示所有 Flag（世界状态变量）
 * 
 * 自动识别 boolean/string/number 类型并使用不同样式
 */
export function WorldFlags({ snapshot }: WorldFlagsProps) {
  const flags = Object.values(snapshot.flags);

  // 按分类分组
  const groupedFlags = flags.reduce((acc, flag) => {
    const category = flag.category || '未分类';
    if (!acc[category]) acc[category] = [];
    acc[category].push(flag);
    return acc;
  }, {} as Record<string, WorldFlag[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedFlags).map(([category, categoryFlags]) => (
        <div key={category}>
          {/* 分类标题 */}
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Flag size={14} />
            {category}
            <span className="text-xs text-gray-600">({categoryFlags.length})</span>
          </h3>

          {/* Flag 网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryFlags.map((flag) => (
              <FlagCard key={flag.key} flag={flag} />
            ))}
          </div>
        </div>
      ))}

      {/* 空状态 */}
      {flags.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Flag size={48} className="mx-auto mb-3 text-gray-700" />
          <p>暂无世界变量</p>
        </div>
      )}
    </div>
  );
}

/**
 * 单个 Flag 卡片 - 根据类型显示不同样式
 */
function FlagCard({ flag }: { flag: WorldFlag }) {
  const value = flag.value;
  const type = typeof value;

  // 根据类型渲染值
  const renderValue = () => {
    if (type === 'boolean') {
      return (
        <div className="flex items-center gap-2">
          {value ? (
            <ToggleRight size={24} className="text-green-400" />
          ) : (
            <ToggleLeft size={24} className="text-gray-600" />
          )}
          <span className={value ? 'text-green-400' : 'text-gray-600'}>
            {value ? '开启' : '关闭'}
          </span>
        </div>
      );
    }

    if (type === 'number') {
      return (
        <div className="flex items-center gap-2">
          <Hash size={16} className="text-blue-400" />
          <span className="text-2xl font-bold text-blue-400">{value}</span>
        </div>
      );
    }

    // string
    return (
      <div className="flex items-center gap-2">
        <Type size={16} className="text-purple-400" />
        <span className="text-gray-200">{value}</span>
      </div>
    );
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 
                  rounded-lg p-4 hover:border-gray-600 transition-colors">
      {/* Flag 标签 */}
      <div className="text-sm font-medium text-gray-300 mb-3">
        {flag.label}
      </div>

      {/* Flag 值 */}
      {renderValue()}

      {/* Flag Key（调试用） */}
      <div className="mt-2 text-xs text-gray-600 font-mono">
        {flag.key}
      </div>
    </div>
  );
}
