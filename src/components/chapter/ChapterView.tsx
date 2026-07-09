'use client';

import { useState } from 'react';
import { ChapterGenerationOutput } from '@/types';
import { Loader2, BookOpen, GitBranch, Globe, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import AuditPanel from './AuditPanel';
import type { AuditResult } from '@/server/audit/fanqieSkill';

type FlowStep = 'idle' | 'generating' | 'audit' | 'confirmed' | 'rejected';

interface ChapterViewProps {
  chapterData: ChapterGenerationOutput | null;
  isGenerating: boolean;
  onGenerate: () => void;
  flowStep: FlowStep;
  auditResult: AuditResult | null;
  onAuditConfirm: () => void;
  onRequestFix: (suggestions: string[]) => void;
  onReject: () => void;
}

/**
 * Chapter View - 章节展示组件（集成审计流程）
 * 
 * 新流程：
 * 1. 生成章节
 * 2. 🔥 审计章节（fanqie-novel-skill）
 * 3. 用户确认/修改/拒绝
 * 4. 更新世界状态和记忆
 */
export function ChapterView({ 
  chapterData, 
  isGenerating, 
  onGenerate,
  flowStep,
  auditResult,
  onAuditConfirm,
  onRequestFix,
  onReject,
}: ChapterViewProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'events' | 'world' | 'audit'>('content');

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-cyan-400">
            {chapterData ? `第 ${chapterData.chapterNumber} 章` : '章节生成器'}
          </h2>
          {chapterData && (
            <p className="text-sm text-gray-500 mt-1">
              {chapterData.wordCount} 字 · 生成耗时 {chapterData.generationTime / 1000}s
            </p>
          )}
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all",
            isGenerating
              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-900/50"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <BookOpen size={18} />
              开始创作
            </>
          )}
        </button>
      </div>

      {/* 生成进度 */}
      {isGenerating && (
        <div className="p-4 bg-gray-900/50 border-b border-gray-800">
          <GenerationProgress />
        </div>
      )}

      {/* 内容区域 */}
      {chapterData ? (
        <div className="flex-1 overflow-y-auto">
          {/* 🔥 审计面板（如果正在审计） */}
          {flowStep === 'audit' && auditResult && (
            <div className="p-6 border-b border-gray-800">
              <AuditPanel
                auditResult={auditResult}
                onConfirm={onAuditConfirm}
                onRequestFix={onRequestFix}
                onReject={onReject}
                isLoading={isGenerating}
              />
            </div>
          )}
          
          {/* 审计通过提示 */}
          {flowStep === 'confirmed' && (
            <div className="p-4 bg-green-500/10 border-b border-green-500/30">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle size={20} />
                <span className="font-medium">✅ 审计通过！世界状态已更新</span>
              </div>
            </div>
          )}
          
          {/* Tab 切换 */}
          <div className="flex gap-1 p-4 border-b border-gray-800">
            {[
              { id: 'content' as const, label: '正文', icon: BookOpen },
              { id: 'events' as const, label: '事件流', icon: GitBranch },
              { id: 'world' as const, label: '世界状态', icon: Globe },
              ...(auditResult ? [{ id: 'audit' as const, label: '审计报告', icon: AlertTriangle }] : []),
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
          
          {/* 内容展示 */}
          <div className="p-6">
            {activeTab === 'content' && (
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-gray-200 leading-relaxed">
                  {chapterData.content}
                </pre>
              </div>
            )}
            
            {activeTab === 'events' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">剧情事件</h3>
                {chapterData.eventFlow?.steps?.map((step: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        step.status === 'completed' ? 'bg-green-400' :
                        step.status === 'running' ? 'bg-cyan-400 animate-pulse' :
                        step.status === 'error' ? 'bg-red-400' : 'bg-gray-600'
                      )} />
                      <span className="text-sm text-gray-200">{step.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {activeTab === 'world' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">世界状态变化</h3>
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                  <pre className="text-xs text-gray-400 overflow-auto">
                    {JSON.stringify(chapterData.worldStateAfter, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            {activeTab === 'audit' && auditResult && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">审计详情</h3>
                <AuditPanel
                  auditResult={auditResult}
                  onConfirm={onAuditConfirm}
                  onRequestFix={onRequestFix}
                  onReject={onReject}
                  isLoading={isGenerating}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 空状态 */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BookOpen size={64} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              暂无章节
            </h3>
            <p className="text-gray-500 mb-6">
              点击「开始创作」生成你的下一章
            </p>
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
            >
              开始生成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 生成进度组件
 */
function GenerationProgress() {
  const steps = [
    { id: 'events', label: '生成剧情事件' },
    { id: 'skills', label: '调用技能系统' },
    { id: 'world', label: '更新世界状态' },
    { id: 'text', label: '生成小说正文' },
    { id: 'memory', label: '保存记忆' },
  ];

  // 模拟当前进度（实际应该从 API 获取）
  const currentStep = 1;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Loader2 size={16} className="animate-spin text-cyan-400" />
        <span className="text-sm text-gray-300">正在生成章节...</span>
      </div>
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex-1">
            <div className={cn(
              "h-1 rounded-full transition-all duration-500",
              idx < currentStep ? 'bg-cyan-400' : 'bg-gray-700'
            )} />
            <div className="text-xs text-gray-500 mt-1 text-center">
              {step.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
