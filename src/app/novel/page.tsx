'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, BookOpen, Brain, Library, FolderOpen, Pin } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';
import type { NovelSummary, NovelSite } from '@/types/novel';

const SITE_LABEL: Record<NovelSite, string> = {
  qidian: '起点',
  fanqie: '番茄',
  unknown: '未知',
};
const SITE_COLOR: Record<NovelSite, string> = {
  qidian: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  fanqie: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  unknown: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
};

const COMMON_TYPES = ['玄幻', '都市', '科幻', '武侠', '历史', '悬疑', '言情', '奇幻', '其他'];

export default function NovelPage() {
  const [novels, setNovels] = useState<NovelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NovelSummary | null>(null);
  const [form, setForm] = useState({ title: '', site: 'unknown' as NovelSite, type: '', settings: '', folder: '根目录', pinned: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadNovels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/novels');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      // 置顶优先，其余按时间倒序
      list.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.importedAt - a.importedAt;
      });
      setNovels(list);
    } catch {
      setNovels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNovels();
  }, [loadNovels]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', site: 'unknown', type: '', settings: '', folder: '根目录', pinned: false });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (n: NovelSummary) => {
    setEditing(n);
    setForm({ title: n.title, site: n.site, type: n.type || '', settings: '', folder: n.folder || '根目录', pinned: !!n.pinned });
    setError('');
    setModalOpen(true);
    // 编辑时拉取完整项目以回填设定
    fetch(`/api/novels?id=${encodeURIComponent(n.id)}`)
      .then((r) => r.json())
      .then((full) => {
        if (full) {
          setForm((f) => ({
            ...f,
            settings: full.settings || f.settings,
            folder: full.folder || f.folder,
            pinned: full.pinned !== undefined ? !!full.pinned : f.pinned,
          }));
        }
      })
      .catch(() => {});
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleSave = async () => {
    setError('');
    if (!form.title.trim()) {
      setError('书名不能为空');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        site: form.site,
        type: form.type.trim() || undefined,
        settings: form.settings.trim() || undefined,
        folder: form.folder || '根目录',
        pinned: form.pinned,
      };
      let res: Response;
      if (editing) {
        res = await fetch('/api/novels', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...payload }),
        });
      } else {
        res = await fetch('/api/novels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '保存失败');
        return;
      }
      setModalOpen(false);
      await loadNovels();
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (n: NovelSummary) => {
    if (!window.confirm(`确定删除小说「${n.title}」？此操作不可恢复。`)) return;
    await fetch(`/api/novels?id=${encodeURIComponent(n.id)}`, { method: 'DELETE' });
    await loadNovels();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* 页面标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600
                        flex items-center justify-center text-white font-bold text-lg">
            N
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">小说管理</h1>
            <p className="text-xs text-gray-500">Novel Management · 创建与管理你的小说项目</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium
                     bg-gradient-to-r from-cyan-600 to-blue-600 text-white
                     hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-900/40"
        >
          <Plus size={18} />
          新建小说
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-gray-500 text-sm">加载中…</p>
        ) : novels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Library size={48} className="text-gray-700 mb-3" />
            <p className="text-gray-400 mb-1">还没有小说项目</p>
            <p className="text-gray-600 text-sm mb-5">点击右上角「新建小说」开始，或从「导入 OCR」批量导入。</p>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium
                         bg-gradient-to-r from-cyan-600 to-blue-600 text-white
                         hover:from-cyan-500 hover:to-blue-500 transition-all"
            >
              <Plus size={18} />
              新建小说
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {novels.map((n) => (
              <div key={n.id} className="glass-panel rounded-2xl border border-gray-800 p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {n.pinned && (
                      <Pin size={14} className="text-orange-400 shrink-0 mt-0.5" />
                    )}
                    <h2 className="text-lg font-semibold text-gray-100 leading-tight truncate">{n.title}</h2>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] border ${SITE_COLOR[n.site]}`}>
                    {SITE_LABEL[n.site]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {n.type && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] border border-purple-500/30 bg-purple-500/10 text-purple-300">
                      {n.type}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[11px] border border-gray-700 bg-gray-800/50 text-gray-400">
                    {n.chapterCount} 章
                  </span>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  导入于 {formatTimestamp(n.importedAt)}
                </p>

                {/* 联动入口 + 操作 */}
                <div className="mt-auto flex items-center gap-2">
                  <Link
                    href={`/chapter?novel=${encodeURIComponent(n.id)}`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                               bg-cyan-600/90 hover:bg-cyan-500 text-white text-sm transition-colors"
                  >
                    <BookOpen size={15} />
                    阅读
                  </Link>
                  <Link
                    href={`/story-memory?storyId=${encodeURIComponent(n.id)}`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                               bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm transition-colors"
                  >
                    <Brain size={15} />
                    记忆
                  </Link>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => openEdit(n)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                               border border-gray-700 hover:bg-gray-800 text-gray-300 text-sm transition-colors"
                  >
                    <Pencil size={15} />
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(n)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                               border border-red-500/30 hover:bg-red-500/10 text-red-300 text-sm transition-colors"
                  >
                    <Trash2 size={15} />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新建 / 编辑 弹窗 */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeModal}
        >
          <div
            className="glass-panel w-full max-w-lg rounded-2xl border border-gray-800 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-100 mb-4">
              {editing ? '编辑小说' : '新建小说'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">书名 *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="例如：诡秘之主"
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700
                             text-gray-100 text-sm outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">站点</label>
                  <select
                    value={form.site}
                    onChange={(e) => setForm((f) => ({ ...f, site: e.target.value as NovelSite }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700
                               text-gray-100 text-sm outline-none focus:border-cyan-500"
                  >
                    <option value="unknown">未知</option>
                    <option value="qidian">起点</option>
                    <option value="fanqie">番茄</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">类型</label>
                  <input
                    list="novel-types"
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    placeholder="选择或输入"
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700
                               text-gray-100 text-sm outline-none focus:border-cyan-500"
                  />
                  <datalist id="novel-types">
                    {COMMON_TYPES.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">设定 / 世界观</label>
                <textarea
                  value={form.settings}
                  onChange={(e) => setForm((f) => ({ ...f, settings: e.target.value }))}
                  rows={4}
                  placeholder="记录该小说的世界观、力量体系、主要势力等设定…"
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700
                             text-gray-100 text-sm outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              {/* 保存位置 */}
              <div className="flex items-start gap-3 rounded-xl bg-gray-900/60 border border-gray-800 p-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <FolderOpen size={20} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-200">保存位置</p>
                      <p className="text-xs text-gray-500 mt-0.5">选择作品归属文件夹</p>
                    </div>
                    <select
                      value={form.folder}
                      onChange={(e) => setForm((f) => ({ ...f, folder: e.target.value }))}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700
                                 text-gray-200 text-sm outline-none focus:border-cyan-500 min-w-[120px]"
                    >
                      <option value="根目录">根目录</option>
                      <option value="玄幻区">玄幻区</option>
                      <option value="都市区">都市区</option>
                      <option value="科幻区">科幻区</option>
                      <option value="已完成">已完成</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 置顶作品 */}
              <div className="flex items-start gap-3 rounded-xl bg-gray-900/60 border border-gray-800 p-4">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Pin size={20} className="text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-200">置顶作品</p>
                      <p className="text-xs text-gray-500 mt-0.5">在列表中优先展示该作品</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.pinned}
                      onClick={() => setForm((f) => ({ ...f, pinned: !f.pinned }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors
                        ${form.pinned ? 'bg-cyan-500' : 'bg-gray-700'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform
                          ${form.pinned ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300
                           hover:bg-gray-800 text-sm transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600
                           text-white text-sm font-medium hover:from-cyan-500 hover:to-blue-500
                           transition-all disabled:opacity-50"
              >
                {saving ? '保存中…' : editing ? '保存修改' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
