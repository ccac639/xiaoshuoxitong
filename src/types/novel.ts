// OCR 导入的小说数据模型

export type NovelSite = 'qidian' | 'fanqie' | 'unknown';

/** 单章（来自 OCR 清洗产物） */
export interface NovelChapter {
  id: string;
  number: number; // 章节序号（从文件名/字段提取）
  title: string; // 章节标题（不含序号）
  rawTitle: string; // 原始章节字段 / 文件名
  paragraphs: string[]; // OCR 正文段落
  sourceImage?: string; // 来源截图文件名
  wordCount: number;
}

/** 一本导入的小说 */
export interface NovelProject {
  id: string;
  title: string; // 书名
  site: NovelSite;
  chapterCount: number;
  importedAt: number;
  chapters: NovelChapter[];
  /** 小说类型（如 玄幻 / 都市 / 科幻），手动创建时填写 */
  type?: string;
  /** 世界观 / 设定（自由文本） */
  settings?: string;
  /** 归属文件夹（保存位置） */
  folder?: string;
  /** 是否置顶 */
  pinned?: boolean;
}

/** 导入结果摘要 */
export interface ImportResult {
  success: boolean;
  folderPath: string;
  novels: { id: string; title: string; chapterCount: number; site: NovelSite }[];
  scannedFiles: number;
  error?: string;
}

/** 列表项（不含章节正文，节省传输） */
export interface NovelSummary {
  id: string;
  title: string;
  site: NovelSite;
  chapterCount: number;
  importedAt: number;
  /** 小说类型，用于卡片展示 */
  type?: string;
  /** 归属文件夹 */
  folder?: string;
  /** 是否置顶 */
  pinned?: boolean;
}

/** 新建 / 编辑小说时的可填字段 */
export interface NovelInput {
  title: string;
  site?: NovelSite;
  type?: string;
  settings?: string;
  folder?: string;
  pinned?: boolean;
}
