'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, FolderOpen, BookOpen, Loader2, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NovelSummary } from '@/types/novel';

const SITE_LABEL: Record<string, string> = {
  qidian: '起点', fanqie: '番茄', unknown: '未知',
};
const SITE_COLOR: Record<string, string> = {
  qidian: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  fanqie: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  unknown: 'text-gray-400 border-gray-500/30 bg-gray-500/10',
};

export default function ImportPage() {
  const router = useRouter();
  const [folderPath, setFolderPath] = useState('D:/sinp/output');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [novels, setNovels] = useState<NovelSummary[]>([]);

  const loadNovels = useCallback(async () => {
    try {
      const res = await fetch('/api/novels');
      if (res.ok) setNovels(await res.json());
    } catch {}
  }, []);

  useEffect(() => { loadNovels(); }, [loadNovels]);

  const handleImport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) loadNovels();
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除这本导入的小说？')) return;
    await fetch('/api/novels?id=' + id, { method: 'DELETE' }).catch(() => {});
    loadNovels();
  };

  return (
    <div className="relative p-8 min-h-full">
      <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl animate-float-glow" />

      <div className="relative max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient-cyan mb-2 flex items-center gap-3">
            <Download size={28} /> 导入 OCR 小说
          </h1>
          <p className="text-muted">
            指向 novel-ocr-tool 的输出文件夹（含 <code>第00X章_xxx.json</code> 或 <code>全书合并.json</code>），一键导入为可阅读的小说项目。
          </p>
        </div>

        {/* 导入面板 */}
        <div className="glass-panel rounded-2xl p-6 hover-lift">
          <label className="block text-sm text-muted mb-2">OCR 输出文件夹路径</label>
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 surface-2 rounded-xl border border-base">
              <FolderOpen size={18} className="text-cyan-400 shrink-0" />
              <input
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="例如 D:/sinp/output"
                className="flex-1 bg-transparent outline-none text-primary placeholder:text-muted"
              />
            </div>
            <button
              onClick={handleImport}
              disabled={loading}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all duration-300',
                'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
                'hover:scale-105 hover:shadow-xl hover:shadow-emerald-900/40 disabled:opacity-60 disabled:scale-100'
              )}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {loading ? '导入中…' : '导入'}
            </button>
          </div>

          {result && (
            <div className={cn(
              'mt-4 p-4 rounded-xl border text-sm',
              result.success
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            )}>
              {result.success ? (
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  <div>
                    扫描 {result.scannedFiles} 个文件，成功导入 {result.novels.length} 本小说：
                    <ul className="mt-1 space-y-0.5">
                      {result.novels.map((n: any) => (
                        <li key={n.id}>· 《{n.title}》— {n.chapterCount} 章（{SITE_LABEL[n.site]}）</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="shrink-0" />
                  {result.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 已导入列表 */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-strong mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-cyan-400" /> 已导入的小说（{novels.length}）
          </h2>

          {novels.length === 0 ? (
            <div className="p-8 text-center text-muted glass-panel rounded-2xl">
              还没有导入任何小说。运行 OCR 后，在上面填入输出文件夹即可一键导入。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {novels.map((n) => (
                <div key={n.id} className="glass-panel rounded-2xl p-5 hover-lift border border-transparent hover:border-cyan-500/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-strong truncate">《{n.title}》</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border', SITE_COLOR[n.site])}>
                          {SITE_LABEL[n.site]}
                        </span>
                        <span className="text-xs text-muted">{n.chapterCount} 章</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="text-muted hover:text-red-400 transition-colors"
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <button
                    onClick={() => router.push(`/chapter?novel=${n.id}`)}
                    className="mt-4 w-full py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium
                             hover:from-cyan-500 hover:to-blue-500 transition-all hover:scale-[1.02]"
                  >
                    阅读 / 查看章节
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
