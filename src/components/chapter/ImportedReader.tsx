'use client';

import { useState, useEffect } from 'react';
import { BookOpen, FileText, ArrowLeft, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NovelProject } from '@/types/novel';

const SITE_LABEL: Record<string, string> = { qidian: '起点', fanqie: '番茄', unknown: '未知' };

/**
 * 导入小说阅读器 —— 读取 OCR 清洗出的真实章节正文
 */
export function ImportedReader({ novelId }: { novelId: string }) {
  const router = useRouter();
  const [novel, setNovel] = useState<NovelProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChapter, setActiveChapter] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/novels?id=' + novelId);
        if (!res.ok) throw new Error('未找到该小说');
        const data = await res.json();
        if (alive) setNovel(data);
      } catch (e: any) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [novelId]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-muted">加载中…</div>;
  }
  if (error || !novel) {
    return (
      <div className="flex-1 flex items-center justify-center text-center">
        <div>
          <p className="text-red-400 mb-4">{error || '小说不存在'}</p>
          <button onClick={() => router.push('/import')} className="px-4 py-2 bg-cyan-600 rounded-lg text-white">返回导入页</button>
        </div>
      </div>
    );
  }

  const chapter = novel.chapters[activeChapter];

  return (
    <div className="flex flex-col h-full">
      {/* 顶部 */}
      <div className="flex items-center justify-between p-4 border-b border-base">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/import')}
            className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-primary transition-colors"
            title="返回"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-strong truncate">《{novel.title}》</h2>
            <p className="text-xs text-muted mt-0.5">
              {SITE_LABEL[novel.site]} · 共 {novel.chapterCount} 章 · OCR 导入
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 章节列表 */}
        <aside className="w-64 shrink-0 border-r border-base overflow-y-auto p-3 space-y-1">
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted mb-1">
            <Layers size={14} /> 章节目录
          </div>
          {novel.chapters.map((ch, idx) => (
            <button
              key={ch.id}
              onClick={() => setActiveChapter(idx)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm transition-all truncate',
                idx === activeChapter
                  ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-strong border border-cyan-500/30'
                  : 'text-muted hover:text-primary hover:bg-white/5 border border-transparent'
              )}
              title={ch.title}
            >
              <span className="text-cyan-400 mr-1">#{ch.number}</span>
              {ch.title || '(无标题)'}
            </button>
          ))}
        </aside>

        {/* 正文 */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-strong mb-1">
              第 {chapter.number} 章
            </h1>
            {chapter.title && <p className="text-lg text-cyan-400 mb-6">{chapter.title}</p>}

            <article className="space-y-4 leading-relaxed text-primary/90">
              {chapter.paragraphs.map((p, i) => (
                <p key={i} className="text-[15px] leading-8">{p}</p>
              ))}
            </article>

            {chapter.sourceImage && (
              <p className="mt-8 text-xs text-muted flex items-center gap-1">
                <FileText size={12} /> 来源截图：{chapter.sourceImage}
              </p>
            )}

            <p className="mt-6 text-xs text-muted">
              共 {chapter.wordCount} 字 · {chapter.paragraphs.length} 段（OCR 原始识别，含可能的识别噪点）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
