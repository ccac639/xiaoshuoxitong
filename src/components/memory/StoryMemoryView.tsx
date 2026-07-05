/**
 * Story Memory View - 故事记忆查看器
 * 
 * 功能：
 * 1. 章节历史列表（可展开查看）
 * 2. 角色成长时间线
 * 3. 剧情总结查看
 * 4. 记忆库管理
 */

'use client';

import { useState, useEffect } from 'react';
import { BookOpen, GitBranch, Brain, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoryMemoryViewProps {
  storyId?: string;
}

interface ChapterRecord {
  chapterNumber: number;
  title: string;
  wordCount: number;
  summary: string;
  keyEvents: string[];
  timestamp: number;
}

interface CharacterArc {
  characterName: string;
  chapters: {
    chapterNumber: number;
    emotion: string;
  }[];
}

/**
 * Story Memory View - 故事记忆查看器组件
 */
export function StoryMemoryView({ storyId = 'default' }: StoryMemoryViewProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'arcs' | 'summary'>('history');
  const [chapterHistory, setChapterHistory] = useState<ChapterRecord[]>([]);
  const [characterArcs, setCharacterArcs] = useState<CharacterArc[]>([]);
  const [overallSummary, setOverallSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  // 加载故事记忆
  const loadMemory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/story-memory?storyId=${storyId}&action=all`);
      const result = await response.json();
      
      if (result.success) {
        setChapterHistory(result.data.chapterHistory || []);
        setOverallSummary(result.data.overallSummary || '');
        // 简化：从章节历史中提取角色成长
        const arcs: CharacterArc[] = [];
        result.data.characterArcs?.forEach((arc: any) => {
          arcs.push({
            characterName: arc.characterName,
            chapters: arc.chapters.map((ch: any) => ({
              chapterNumber: ch.chapterNumber,
              emotion: ch.emotion,
            })),
          });
        });
        setCharacterArcs(arcs);
      }
    } catch (error: any) {
      console.error('加载故事记忆失败：', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemory();
  }, [storyId]);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      {/* 标题栏 */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-gradient-cyan flex items-center gap-2">
          <Brain className="w-6 h-6" />
          故事记忆
        </h1>
        <p className="text-gray-400 mt-1">
          章节历史 · 角色成长 · 剧情总结
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 p-4 border-b border-gray-800">
        {[
          { id: 'history' as const, label: '章节历史', icon: BookOpen },
          { id: 'arcs' as const, label: '角色成长', icon: Clock },
          { id: 'summary' as const, label: '剧情总结', icon: GitBranch },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all",
              activeTab === tab.id
                ? "bg-cyan-600 text-white"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">加载中...</div>
          </div>
        ) : (
          <>
            {/* 章节历史 */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">
                  章节历史（{chapterHistory.length} 章）
                </h3>
                
                {chapterHistory.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    暂无章节历史，请先生成章节
                  </div>
                ) : (
                  chapterHistory.map((chapter) => (
                    <div
                      key={chapter.chapterNumber}
                      className="p-4 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-cyan-500/30 transition-all cursor-pointer"
                      onClick={() => setExpandedChapter(
                        expandedChapter === chapter.chapterNumber ? null : chapter.chapterNumber
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-md font-semibold text-cyan-400">
                          {chapter.title}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {chapter.wordCount} 字
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-400 mb-2">
                        {chapter.summary}
                      </p>
                      
                      {/* 展开的详情 */}
                      {expandedChapter === chapter.chapterNumber && (
                        <div className="mt-4 pt-4 border-t border-gray-800">
                          <h5 className="text-sm font-semibold text-gray-300 mb-2">关键事件：</h5>
                          <ul className="space-y-1">
                            {chapter.keyEvents.map((event, idx) => (
                              <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                                <span className="text-cyan-400">•</span>
                                {event}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 角色成长 */}
            {activeTab === 'arcs' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">
                  角色成长轨迹
                </h3>
                
                {characterArcs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    暂无角色成长数据
                  </div>
                ) : (
                  characterArcs.map((arc, idx) => (
                    <div key={idx} className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                      <h4 className="text-md font-semibold text-cyan-400 mb-3">
                        {arc.characterName}
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        {arc.chapters.map((ch, chIdx) => (
                          <span
                            key={ch.chapterNumber}
                            className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-300"
                          >
                            {ch.chapterNumber}章：{ch.emotion}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 剧情总结 */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">
                  整体剧情总结
                </h3>
                
                {!overallSummary ? (
                  <div className="text-gray-500 text-center py-8">
                    暂无剧情总结
                  </div>
                ) : (
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">
                      {overallSummary}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
