'use client';

import { useState } from 'react';
import { WorldSnapshot } from '@/types';
import { Download, GitCompare, ChevronRight, ChevronDown } from 'lucide-react';

interface WorldInspectorProps {
  snapshot: WorldSnapshot;
}

/**
 * 世界状态检查器 - 可折叠的 JSON 树形视图
 * 
 * 功能：
 * 1. 查看完整快照 JSON
 * 2. 对比两个快照的差异
 * 3. 下载快照 JSON
 */
export function WorldInspector({ snapshot }: WorldInspectorProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [compareMode, setCompareMode] = useState(false);
  const [compareSnapshot, setCompareSnapshot] = useState<WorldSnapshot | null>(null);

  // 切换节点展开/收起
  const toggleNode = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  // 下载快照 JSON
  const handleDownload = () => {
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `world-snapshot-${snapshot.chapterNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-800 
                   hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Download size={14} />
          下载 JSON
        </button>

        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`
            flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors
            ${compareMode 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }
          `}
        >
          <GitCompare size={14} />
          对比模式
        </button>
      </div>

      {/* 对比模式：选择要对比的快照 */}
      {compareMode && (
        <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">
            选择对比快照
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            当前：第 {snapshot.chapterNumber} 章快照
          </p>
          {/* 这里可以添加一个下拉选择器，暂时省略 */}
          <p className="text-xs text-gray-400">
            对比功能开发中...
          </p>
        </div>
      )}

      {/* JSON 树形视图 */}
      <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4 
                    font-mono text-sm overflow-auto max-h-[600px]">
        <JsonTreeNode
          keyName="root"
          value={snapshot}
          path="root"
          expandedNodes={expandedNodes}
          onToggle={toggleNode}
          depth={0}
        />
      </div>

      {/* 快照元信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-500">
        <div className="p-3 bg-gray-900/50 rounded-lg">
          <div className="text-gray-600 mb-1">快照 ID</div>
          <div className="text-gray-300 font-mono">{snapshot.id}</div>
        </div>
        <div className="p-3 bg-gray-900/50 rounded-lg">
          <div className="text-gray-600 mb-1">章节</div>
          <div className="text-gray-300">第 {snapshot.chapterNumber} 章</div>
        </div>
        <div className="p-3 bg-gray-900/50 rounded-lg">
          <div className="text-gray-600 mb-1">角色数</div>
          <div className="text-gray-300">{Object.keys(snapshot.characters).length}</div>
        </div>
        <div className="p-3 bg-gray-900/50 rounded-lg">
          <div className="text-gray-600 mb-1">关系数</div>
          <div className="text-gray-300">{snapshot.relations.length}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * JSON 树形节点 - 可折叠
 */
function JsonTreeNode({ 
  keyName, 
  value, 
  path, 
  expandedNodes, 
  onToggle, 
  depth 
}: {
  keyName: string;
  value: any;
  path: string;
  expandedNodes: Set<string>;
  onToggle: (path: string) => void;
  depth: number;
}) {
  const isExpanded = expandedNodes.has(path);
  const isObject = typeof value === 'object' && value !== null;
  const isArray = Array.isArray(value);

  // 缩进
  const indent = depth * 20;

  // 渲染值预览（收起状态）
  const renderPreview = () => {
    if (isArray) return `Array(${value.length})`;
    if (isObject) return `{...}`;
    if (typeof value === 'string') return `"${value}"`;
    return String(value);
  };

  return (
    <div>
      <div 
        className="flex items-start gap-1 py-0.5 hover:bg-gray-800/50 rounded 
                   cursor-pointer transition-colors"
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => isObject && onToggle(path)}
      >
        {/* 展开/收起箭头 */}
        {isObject && (
          <span className="text-gray-600 mt-0.5">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}

        {/* 键名 */}
        <span className="text-purple-400">{keyName}</span>
        <span className="text-gray-600">: </span>

        {/* 值或预览 */}
        {isObject && !isExpanded ? (
          <span className="text-gray-500">{renderPreview()}</span>
        ) : !isObject ? (
          <span className={typeof value === 'string' ? 'text-green-400' : 'text-blue-400'}>
            {renderPreview()}
          </span>
        ) : null}
      </div>

      {/* 展开的子节点 */}
      {isObject && isExpanded && (
        <div>
          {isArray
            ? value.map((item: any, idx: number) => (
                <JsonTreeNode
                  key={path + '.' + idx}
                  keyName={String(idx)}
                  value={item}
                  path={path + '.' + idx}
                  expandedNodes={expandedNodes}
                  onToggle={onToggle}
                  depth={depth + 1}
                />
              ))
            : Object.entries(value).map(([k, v]) => (
                <JsonTreeNode
                  key={path + '.' + k}
                  keyName={k}
                  value={v}
                  path={path + '.' + k}
                  expandedNodes={expandedNodes}
                  onToggle={onToggle}
                  depth={depth + 1}
                />
              ))
          }
        </div>
      )}
    </div>
  );
}
