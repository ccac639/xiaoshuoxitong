import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface KnowledgeItem {
  id: string;
  title: string;
  type: 'worldview' | 'character' | 'plot' | 'rule' | 'foreshadow' | 'guide' | 'novel';
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata?: {
    author?: string;
    source?: string;
    wordCount?: number;
    category?: string;
    [key: string]: any;
  };
}

export interface NovelData {
  title: string;
  author: string;
  platform: 'qidian' | 'fanqie' | 'other';
  category: string;
  tags: string[];
  wordCount: number;
  chapters: Array<{
    chapterNumber: number;
    title: string;
    content: string;
  }>;
  metadata?: {
    rating?: number;
    popularity?: number;
    updateTime?: string;
    [key: string]: any;
  };
}

const KNOWLEDGE_DIR = path.join(process.cwd(), 'data/knowledge');
const METADATA_FILE = path.join(KNOWLEDGE_DIR, 'metadata.json');

// 确保目录存在
async function ensureDirectoryExists() {
  try {
    await fs.access(KNOWLEDGE_DIR);
  } catch {
    await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
  }
}

// 读取元数据
async function readMetadata(): Promise<KnowledgeItem[]> {
  try {
    const data = await fs.readFile(METADATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 写入元数据
async function writeMetadata(items: KnowledgeItem[]): Promise<void> {
  await ensureDirectoryExists();
  await fs.writeFile(METADATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

// 生成文件路径
function getFilePath(id: string): string {
  return path.join(KNOWLEDGE_DIR, `${id}.json`);
}

export const knowledgeManager = {
  // 获取所有知识条目
  async getAll(): Promise<KnowledgeItem[]> {
    await ensureDirectoryExists();
    return await readMetadata();
  },

  // 根据 ID 获取知识条目
  async getById(id: string): Promise<KnowledgeItem | null> {
    const items = await readMetadata();
    const item = items.find(i => i.id === id);
    if (!item) return null;

    // 读取完整内容
    try {
      const fullData = await fs.readFile(getFilePath(id), 'utf-8');
      const fullItem = JSON.parse(fullData);
      return fullItem;
    } catch {
      return item; // 如果完整文件不存在，返回元数据
    }
  },

  // 创建新知识条目
  async create(
    title: string,
    type: KnowledgeItem['type'],
    content: string,
    tags: string[] = [],
    metadata?: KnowledgeItem['metadata']
  ): Promise<KnowledgeItem> {
    await ensureDirectoryExists();

    const id = uuidv4();
    const now = Date.now();

    const item: KnowledgeItem = {
      id,
      title,
      type,
      content,
      tags,
      createdAt: now,
      updatedAt: now,
      metadata,
    };

    // 保存完整数据到文件
    await fs.writeFile(getFilePath(id), JSON.stringify(item, null, 2), 'utf-8');

    // 更新元数据（不包含完整内容，只保留摘要）
    const items = await readMetadata();
    items.push({
      ...item,
      content: item.content.substring(0, 200), // 元数据中只保留前 200 字符
    });
    await writeMetadata(items);

    return item;
  },

  // 更新知识条目
  async update(
    id: string,
    updates: Partial<Omit<KnowledgeItem, 'id' | 'createdAt'>>
  ): Promise<KnowledgeItem | null> {
    const items = await readMetadata();
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return null;

    // 读取完整数据
    let fullItem: KnowledgeItem;
    try {
      const data = await fs.readFile(getFilePath(id), 'utf-8');
      fullItem = JSON.parse(data);
    } catch {
      fullItem = items[index];
    }

    // 更新数据
    Object.assign(fullItem, updates, { updatedAt: Date.now() });

    // 保存完整数据
    await fs.writeFile(getFilePath(id), JSON.stringify(fullItem, null, 2), 'utf-8');

    // 更新元数据
    items[index] = {
      ...fullItem,
      content: fullItem.content.substring(0, 200),
    };
    await writeMetadata(items);

    return fullItem;
  },

  // 删除知识条目
  async delete(id: string): Promise<boolean> {
    const items = await readMetadata();
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return false;

    // 删除文件
    try {
      await fs.unlink(getFilePath(id));
    } catch {
      // 文件可能不存在，忽略错误
    }

    // 更新元数据
    items.splice(index, 1);
    await writeMetadata(items);

    return true;
  },

  // 上传小说 JSON 数据
  async uploadNovel(novelData: NovelData): Promise<KnowledgeItem> {
    // 将小说数据转换为知识条目
    const content = this.novelToText(novelData);
    const tags = [
      novelData.platform,
      novelData.category,
      ...novelData.tags,
      'novel',
    ];

    const metadata = {
      author: novelData.author,
      source: novelData.platform,
      wordCount: novelData.wordCount,
      category: novelData.category,
      chapterCount: novelData.chapters.length,
      ...novelData.metadata,
    };

    return await this.create(
      novelData.title,
      'novel',
      content,
      tags,
      metadata
    );
  },

  // 将小说数据转换为文本
  novelToText(novelData: NovelData): string {
    let text = `# ${novelData.title}\n\n`;
    text += `**作者**: ${novelData.author}\n`;
    text += `**平台**: ${novelData.platform}\n`;
    text += `**分类**: ${novelData.category}\n`;
    text += `**标签**: ${novelData.tags.join(', ')}\n`;
    text += `**字数**: ${novelData.wordCount}\n\n`;

    if (novelData.metadata) {
      text += `## 元数据\n\n`;
      if (novelData.metadata.rating) {
        text += `- 评分: ${novelData.metadata.rating}\n`;
      }
      if (novelData.metadata.popularity) {
        text += `- 人气: ${novelData.metadata.popularity}\n`;
      }
      if (novelData.metadata.updateTime) {
        text += `- 更新时间: ${novelData.metadata.updateTime}\n`;
      }
      text += `\n`;
    }

    text += `## 章节内容\n\n`;
    for (const chapter of novelData.chapters) {
      text += `### 第${chapter.chapterNumber}章 ${chapter.title}\n\n`;
      text += `${chapter.content}\n\n`;
    }

    return text;
  },

  // 搜索知识条目
  async search(query: string): Promise<KnowledgeItem[]> {
    const items = await this.getAll();
    const lowerQuery = query.toLowerCase();

    return items.filter(item => {
      return (
        item.title.toLowerCase().includes(lowerQuery) ||
        item.content.toLowerCase().includes(lowerQuery) ||
        item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    });
  },

  // 根据类型筛选
  async filterByType(type: KnowledgeItem['type']): Promise<KnowledgeItem[]> {
    const items = await this.getAll();
    return items.filter(item => item.type === type);
  },
};
