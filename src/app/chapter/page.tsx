'use client';

import { useState, useEffect } from 'react';
import { ChapterView } from '@/components/chapter/ChapterView';
import { ImportedReader } from '@/components/chapter/ImportedReader';
import { MOCK_SNAPSHOT } from '@/lib/mockWorldState';
import { AuditResult } from '@/server/audit/fanqieSkill';

type FlowStep = 'idle' | 'generating' | 'audit' | 'confirmed' | 'rejected';

/**
 * Chapter Page - 章节主页面
 *  - 带 ?novel=<id> 时进入「OCR 导入阅读」模式（只读真实章节）
 *  - 否则进入「AI 章节生成」模式（审计流程）
 */
export default function ChapterPage() {
  const [novelId, setNovelId] = useState<string | null>(null);

  // 从 URL 读取 ?novel= 参数（避免 useSearchParams 的 Suspense 要求）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('novel');
    if (id) setNovelId(id);
  }, []);

  if (novelId) {
    return <ImportedReader novelId={novelId} />;
  }

  return <GenerateMode />;
}

function GenerateMode() {
  const [chapterData, setChapterData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [flowStep, setFlowStep] = useState<FlowStep>('idle');
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  /**
   * 生成章节
   */
  const handleGenerate = async () => {
    setIsGenerating(true);
    setFlowStep('generating');

    try {
      const response = await fetch('/api/generate-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterNumber,
          worldState: MOCK_SNAPSHOT,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setChapterData(result.data);
        
        // 🔥 检查审计结果
        if (result.data.audit) {
          setAuditResult(result.data.audit);
          setFlowStep('audit'); // 进入审计步骤
        } else {
          // 无审计结果（兼容旧版本）
          setFlowStep('confirmed');
          setChapterNumber(prev => prev + 1);
        }
      } else {
        alert('生成失败：' + result.error);
        setFlowStep('idle');
      }
    } catch (error: any) {
      alert('生成失败：' + error.message);
      setFlowStep('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * 处理审计确认
   */
  const handleAuditConfirm = () => {
    setFlowStep('confirmed');
    setChapterNumber(prev => prev + 1);
    alert('✅ 审计通过！世界状态已更新');
  };

  /**
   * 处理请求修改
   */
  const handleRequestFix = (suggestions: string[]) => {
    setFlowStep('generating');
    alert(`🔄 根据 ${suggestions.length} 条建议重新生成...`);
    // 重新生成
    handleGenerate();
  };

  /**
   * 处理拒绝
   */
  const handleReject = () => {
    setFlowStep('rejected');
    setAuditResult(null);
    setChapterData(null);
    alert('❌ 已拒绝，可以重新生成');
  };

  return (
    <ChapterView
      chapterData={chapterData}
      isGenerating={isGenerating}
      onGenerate={handleGenerate}
      flowStep={flowStep}
      auditResult={auditResult}
      onAuditConfirm={handleAuditConfirm}
      onRequestFix={handleRequestFix}
      onReject={handleReject}
    />
  );
}
