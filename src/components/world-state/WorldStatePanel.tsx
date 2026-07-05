'use client';

import { useState } from 'react';
import { WorldSnapshot } from '@/types';
import { MOCK_SNAPSHOT, MOCK_HISTORY } from '@/lib/mockWorldState';
import { CharacterCards } from './CharacterCards';
import { RelationGraph } from './RelationGraph';
import { WorldFlags } from './WorldFlags';
import { WorldInspector } from './WorldInspector';
import { 
  Users, 
  Network, 
  Flag, 
  Search,
  Clock,
  RotateCcw
} from 'lucide-react';

/**
 * World State Panel - 世界状态主面板
 * 
 * 功能：
 * 1. 查看当前世界状态（人物卡/关系图/世界变量）
 * 2. 查看历史快照
 * 3. 回滚到历史快照
 */
export function WorldStatePanel() {
  const [currentSnapshot, setCurrentSnapshot] = useState<WorldSnapshot>(MOCK_SNAPSHOT);
  const [history, setHistory] = useState<WorldSnapshot[]>(MOCK_HISTORY);
  const [activeTab, setActiveTab] = useState<'characters' | 'relations' | 'flags' | 'inspector'>('characters');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // 切换历史快照
  const handleSelectHistory = (snapshot: WorldSnapshot) => {
    setCurrentSnapshot(snapshot);
    setShowHistory(false);
  };

  // 回滚到历史快照
  const handleRollback = (snapshotId: string) => {
    const snapshot = history.find(s => s.id === snapshotId);
    if (snapshot) {
      setCurrentSnapshot(snapshot);
      alert(`已回滚到第 ${snapshot.chapterNumber} 章的快照`);
    }
  };

  const tabs = [
    { id: 'characters' as const, label: '人物卡', icon: Users },
    { id: 'relations' as const, label: '关系图', icon: Network },
    { id: 'flags' as const, label: '世界变量', icon: Flag },
    { id: 'inspector' as const, label: '检查器', icon: Search },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-cyan-400">
            World State
          </h2>
          <span className="text-sm text-gray-500">
            第 {currentSnapshot.chapterNumber} 章
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 历史快照选择器 */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-800 
                     hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Clock size={14} />
            历史快照 ({history.length})
          </button>

          {/* 刷新按钮 */}
          <button
            onClick={() => setCurrentSnapshot(MOCK_SNAPSHOT)}
            className="p-1.5 text-gray-400 hover:text-cyan-400 transition-colors"
            title="刷新"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* 历史快照下拉 */}
      {showHistory && (
        <div className="absolute top-20 right-4 w-80 bg-gray-900 border border-gray-700 
                      rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300">历史快照</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {history.map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex items-center justify-between p-3 hover:bg-gray-800 
                         cursor-pointer transition-colors"
                onClick={() => handleSelectHistory(snapshot)}
              >
                <div>
                  <div className="text-sm text-gray-200">
                    第 {snapshot.chapterNumber} 章
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(snapshot.timestamp).toLocaleString('zh-CN')}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRollback(snapshot.id);
                  }}
                  className="text-xs px-2 py-1 bg-cyan-600 hover:bg-cyan-500 
                           rounded text-white transition-colors"
                >
                  回滚
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 切换 */}
      <div className="flex gap-1 p-4 border-b border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all
              ${activeTab === tab.id
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }
            `}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'characters' && (
          <CharacterCards 
            snapshot={currentSnapshot}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={setSelectedCharacterId}
          />
        )}

        {activeTab === 'relations' && (
          <RelationGraph 
            snapshot={currentSnapshot}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={setSelectedCharacterId}
          />
        )}

        {activeTab === 'flags' && (
          <WorldFlags snapshot={currentSnapshot} />
        )}

        {activeTab === 'inspector' && (
          <WorldInspector snapshot={currentSnapshot} />
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between p-3 border-t border-gray-800 text-xs text-gray-500">
        <span>
          {Object.keys(currentSnapshot.characters).length} 个角色 · {currentSnapshot.relations.length} 条关系
        </span>
        <span>
          快照 ID: {currentSnapshot.id}
        </span>
      </div>
    </div>
  );
}
