/**
 * 知识库 - 系统核心资料库
 * 
 * 功能：
 * 1. 小说设定（世界观/角色/势力）
 * 2. 写作技巧/模板
 * 3. 番茄小说规则
 * 4. 伏笔管理（Truth Files）
 * 5. AI写作去AI味指南
 * 6. 上传小说 JSON（起点/番茄畅销书）
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Library,
  Globe,
  Users,
  BookOpen,
  FileText,
  Search,
  Plus,
  Trash2,
  Edit3,
  Tag,
  Clock,
  ChevronRight,
  Filter,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

interface KnowledgeItem {
  id: string;
  title: string;
  type: KnowledgeType;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata?: {
    author?: string;
    source?: string;
    wordCount?: number;
    category?: string;
    chapterCount?: number;
    [key: string]: any;
  };
}

type KnowledgeType = 
  | 'worldview'      // 世界观设定
  | 'character'      // 角色档案
  | 'plot'           // 剧情模板
  | 'rule'           // 写作规则
  | 'foreshadow'     // 伏笔记录
  | 'guide'          // 写作指南
  | 'novel';         // 小说数据

// ==================== 分类配置 ====================

const TYPE_CONFIG = {
  worldview: { label: '世界观', icon: Globe, color: 'purple' },
  character: { label: '角色', icon: Users, color: 'blue' },
  plot: { label: '剧情', icon: BookOpen, color: 'green' },
  rule: { label: '规则', icon: FileText, color: 'orange' },
  foreshadow: { label: '伏笔', icon: Tag, color: 'red' },
  guide: { label: '指南', icon: FileText, color: 'cyan' },
  novel: { label: '小说', icon: Library, color: 'pink' },
};

// ==================== API 函数 ====================

async function fetchKnowledgeItems(type?: string, query?: string): Promise<KnowledgeItem[]> {
  const params = new URLSearchParams();
  if (type && type !== 'all') params.append('type', type);
  if (query) params.append('q', query);

  const response = await fetch(`/api/knowledge?${params.toString()}`);
  if (!response.ok) throw new Error('获取知识库失败');
  const data = await response.json();
  return data.data || [];
}

async function deleteKnowledgeItem(id: string): Promise<void> {
  const response = await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('删除失败');
}

async function uploadNovel(file: File, platform: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('platform', platform);

  const response = await fetch('/api/knowledge/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '上传失败');
  }

  return await response.json();
}

// ==================== 主组件 ====================

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<KnowledgeType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);

  // 加载知识库数据
  const loadKnowledge = useCallback(async () => {
    try {
      setLoading(true);
      const items = await fetchKnowledgeItems(
        activeTab === 'all' ? undefined : activeTab,
        searchQuery || undefined
      );
      setKnowledgeItems(items);
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    loadKnowledge();
  }, [loadKnowledge]);

  // 过滤知识项（前端再过滤一次，确保实时性）
  const filteredKnowledge = knowledgeItems.filter(item => {
    const matchCategory = activeTab === 'all' || item.type === activeTab;
    const matchSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  // 处理文件上传
  const handleUpload = async (file: File, platform: string) => {
    try {
      setUploading(true);
      setUploadStatus(null);

      const result = await uploadNovel(file, platform);
      setUploadStatus({ success: true, message: `成功上传《${result.data.title}》` });
      
      // 重新加载列表
      await loadKnowledge();
      
      // 3秒后关闭弹窗
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadStatus(null);
      }, 3000);
    } catch (error: any) {
      setUploadStatus({ success: false, message: error.message || '上传失败' });
    } finally {
      setUploading(false);
    }
  };

  // 处理删除
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条知识吗？')) return;

    try {
      await deleteKnowledgeItem(id);
      await loadKnowledge();
      if (selectedItem?.id === id) {
        setSelectedItem(null);
        setViewMode('list');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100">
      {/* 顶部工具栏 */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Library className="w-7 h-7 text-purple-400" />
            知识库
          </h1>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Upload size={18} />
            上传小说
          </button>
        </div>
        
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="搜索知识库..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden flex">
        {/* 左侧：分类 + 列表 */}
        <div className={cn(
          "border-r border-gray-800 flex flex-col",
          viewMode === 'detail' ? "w-96" : "flex-1"
        )}>
          {/* 分类标签 */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-gray-500" />
              <span className="text-sm text-gray-400">分类筛选</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <CategoryButton
                label="全部"
                active={activeTab === 'all'}
                onClick={() => setActiveTab('all')}
              />
              {(Object.entries(TYPE_CONFIG) as [KnowledgeType, typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG]][]).map(([key, config]) => (
                <CategoryButton
                  key={key}
                  label={config.label}
                  active={activeTab === key}
                  onClick={() => setActiveTab(key as KnowledgeType)}
                  color={config.color}
                  icon={config.icon}
                />
              ))}
            </div>
          </div>

          {/* 知识列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <Loader2 size={48} className="mx-auto mb-4 animate-spin" />
                <p>加载中...</p>
              </div>
            ) : filteredKnowledge.length > 0 ? (
              filteredKnowledge.map(item => (
                <KnowledgeCard
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  onClick={() => {
                    setSelectedItem(item);
                    setViewMode('detail');
                  }}
                />
              ))
            ) : (
              <EmptyState searchQuery={searchQuery} />
            )}
            
            {/* 统计信息 */}
            <div className="pt-4 text-sm text-gray-600 text-center">
              共 {filteredKnowledge.length} 条知识
            </div>
          </div>
        </div>

        {/* 右侧：详情面板 */}
        {viewMode === 'detail' && selectedItem && (
          <div className="flex-1 overflow-y-auto p-6">
            <KnowledgeDetail 
              item={selectedItem} 
              onBack={() => setViewMode('list')}
              onDelete={() => handleDelete(selectedItem.id)}
            />
          </div>
        )}
      </div>

      {/* 上传弹窗 */}
      {showUploadModal && (
        <UploadModal
          onClose={() => {
            setShowUploadModal(false);
            setUploadStatus(null);
          }}
          onUpload={handleUpload}
          uploading={uploading}
          uploadStatus={uploadStatus}
        />
      )}
    </div>
  );
}

// ==================== 子组件 ====================

/** 分类按钮 */
function CategoryButton({ 
  label, 
  active, 
  onClick, 
  color,
  icon: Icon,
}: { 
  label: string; 
  active: boolean; 
  onClick: () => void; 
  color?: string;
  icon?: any;
}) {
  const colorMap: Record<string, string> = {
    purple: active ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-purple-500/30',
    blue: active ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-blue-500/30',
    green: active ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-green-500/30',
    orange: active ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-orange-500/30',
    pink: active ? 'bg-pink-500/20 text-pink-400 border-pink-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-pink-500/30',
    red: active ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-red-500/30',
    cyan: active ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-cyan-500/30',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5",
        colorMap[color || 'purple']
      )}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
}

/** 知识卡片 */
function KnowledgeCard({
  item,
  isSelected,
  onClick,
}: {
  item: KnowledgeItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = TYPE_CONFIG[item.type];
  const Icon = config.icon;

  const colorClasses: Record<string, string> = {
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    pink: 'text-pink-400',
    red: 'text-red-400',
    cyan: 'text-cyan-400',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-lg border transition-all group",
        isSelected
          ? "bg-cyan-500/10 border-cyan-500/50"
          : "bg-gray-900 border-gray-800 hover:border-gray-700 hover:bg-gray-800/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-800"
        )}>
          <Icon size={20} className={colorClasses[config.color] || 'text-gray-400'} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-white truncate">{item.title}</h3>
            <ChevronRight size={16} className="text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          {item.metadata?.author && (
            <p className="text-xs text-gray-500 mt-1">
              作者: {item.metadata.author}
            </p>
          )}

          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {item.content.substring(0, 80)}...
          </p>
          
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
              {config.label}
            </span>
            {item.metadata?.wordCount && (
              <span className="text-xs text-gray-600">
                {item.metadata.wordCount.toLocaleString()} 字
              </span>
            )}
          </div>
          
          {/* 标签 */}
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-500">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

/** 详情面板 */
function KnowledgeDetail({ item, onBack, onDelete }: { 
  item: KnowledgeItem; 
  onBack: () => void;
  onDelete: () => void;
}) {
  const config = TYPE_CONFIG[item.type];
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Icon size={24} className={`text-${config.color}-400`} />
            <h2 className="text-2xl font-bold text-white">{item.title}</h2>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="px-2 py-1 rounded-md bg-gray-800 text-gray-400">
              {config.label}
            </span>
            {item.metadata?.author && <span>作者: {item.metadata.author}</span>}
            {item.metadata?.source && <span>来源: {item.metadata.source}</span>}
            <span>创建于 {new Date(item.createdAt).toLocaleString('zh-CN')}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-gray-800 text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* 元数据 */}
      {item.metadata && (
        <div className="glass-panel p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {item.metadata.wordCount && (
            <div>
              <div className="text-xs text-gray-500 mb-1">字数</div>
              <div className="text-lg font-bold text-white">{item.metadata.wordCount.toLocaleString()}</div>
            </div>
          )}
          {item.metadata.chapterCount && (
            <div>
              <div className="text-xs text-gray-500 mb-1">章节数</div>
              <div className="text-lg font-bold text-white">{item.metadata.chapterCount}</div>
            </div>
          )}
          {item.metadata.category && (
            <div>
              <div className="text-xs text-gray-500 mb-1">分类</div>
              <div className="text-lg font-bold text-white">{item.metadata.category}</div>
            </div>
          )}
          {item.metadata.rating && (
            <div>
              <div className="text-xs text-gray-500 mb-1">评分</div>
              <div className="text-lg font-bold text-yellow-400">⭐ {item.metadata.rating}</div>
            </div>
          )}
        </div>
      )}

      {/* 标签 */}
      <div className="flex flex-wrap gap-2">
        {item.tags.map(tag => (
          <span key={tag} className="px-3 py-1 rounded-full bg-gray-800 text-gray-300 text-sm flex items-center gap-1">
            <Tag size={14} className="text-cyan-400" />
            {tag}
          </span>
        ))}
      </div>

      {/* 内容 */}
      <div className="glass-panel p-6">
        <div className="prose prose-invert max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-gray-200 leading-relaxed text-base">
            {item.content}
          </pre>
        </div>
      </div>
    </div>
  );
}

/** 上传弹窗 */
function UploadModal({ 
  onClose, 
  onUpload, 
  uploading, 
  uploadStatus 
}: { 
  onClose: () => void; 
  onUpload: (file: File, platform: string) => void;
  uploading: boolean;
  uploadStatus: { success: boolean; message: string } | null;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState<'qidian' | 'fanqie'>('fanqie');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.json')) {
        setSelectedFile(file);
      } else {
        alert('只支持 JSON 文件');
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    onUpload(selectedFile, platform);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">上传小说 JSON</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* 平台选择 */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">选择平台</label>
          <div className="flex gap-2">
            <button
              onClick={() => setPlatform('fanqie')}
              className={`flex-1 py-2 rounded-lg border transition-all ${
                platform === 'fanqie'
                  ? 'bg-red-500/20 border-red-500/50 text-red-400'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              番茄小说
            </button>
            <button
              onClick={() => setPlatform('qidian')}
              className={`flex-1 py-2 rounded-lg border transition-all ${
                platform === 'qidian'
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              起点中文网
            </button>
          </div>
        </div>

        {/* 文件上传区域 */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
            dragActive
              ? "border-cyan-500 bg-cyan-500/10"
              : "border-gray-700 hover:border-gray-600"
          )}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <input
            id="fileInput"
            type="file"
            accept=".json"
            onChange={handleFileInput}
            className="hidden"
          />
          
          {selectedFile ? (
            <div>
              <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
              <p className="text-white font-medium">{selectedFile.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          ) : (
            <div>
              <Upload size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">拖拽 JSON 文件到此处</p>
              <p className="text-sm text-gray-600 mt-1">或点击选择文件</p>
            </div>
          )}
        </div>

        {/* 上传状态 */}
        {uploadStatus && (
          <div className={cn(
            "mt-4 p-3 rounded-lg flex items-center gap-2",
            uploadStatus.success
              ? "bg-green-500/10 border border-green-500/50 text-green-400"
              : "bg-red-500/10 border border-red-500/50 text-red-400"
          )}>
            {uploadStatus.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm">{uploadStatus.message}</span>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
            disabled={uploading}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
            disabled={!selectedFile || uploading}
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload size={18} />
                上传
              </>
            )}
          </button>
        </div>

        {/* JSON 格式说明 */}
        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500 mb-2">JSON 格式要求：</p>
          <pre className="text-xs text-gray-400 overflow-x-auto">
{`{
  "title": "书名",
  "author": "作者",
  "category": "分类",
  "tags": ["标签1", "标签2"],
  "wordCount": 100000,
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "第一章",
      "content": "章节内容..."
    }
  ],
  "metadata": {
    "rating": 9.5,
    "popularity": 1000000
  }
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}

/** 空状态 */
function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="py-12 text-center">
      <Library size={48} className="mx-auto text-gray-700 mb-4" />
      <h3 className="text-lg font-medium text-gray-400 mb-2">
        未找到相关内容
      </h3>
      <p className="text-gray-500 text-sm">
        {searchQuery ? `未找到与"${searchQuery}"相关的知识` : '该分类暂无知识条目'}
      </p>
    </div>
  );
}
