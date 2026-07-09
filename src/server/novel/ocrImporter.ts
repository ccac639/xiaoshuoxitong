// OCR 产物解析器 —— 把 novel-ocr-tool 的输出映射为 NovelProject
//
// 支持的两种产物格式：
//  1) 单章 JSON：{ chapter, source_image, paragraphs:[...], paragraph_count }
//  2) 合并 JSON：{ title, chapter_count, export_time, chapters:[ 同单章结构 ] }

import { NovelChapter, NovelProject, NovelSite } from '@/types/novel';
import { generateId } from '@/lib/utils';

/**
 * 从章节原始字段/文件名提取「序号 + 标题」
 * 例：
 *   "第001章_第一章_翠蜥蛇"  → { number:1, title:"第一章_翠蜥蛇" }
 *   "第28章 棋差一着_1"      → { number:28, title:"棋差一着_1" }
 */
export function extractChapterMeta(raw: string): { number: number; title: string } {
  const s = (raw || '').trim();
  const m = s.match(/第\s*(\d+)\s*章/);
  const number = m ? parseInt(m[1], 10) : 0;

  // 去掉首个 "第X章" 前缀
  let rest = s.replace(/第\s*\d+\s*章/, '');
  rest = rest.replace(/^[\s_－-]+/, '').trim();
  // 去掉可能残留的二级章号 "第Y章"（番茄格式）
  rest = rest.replace(/^第\s*\d+\s*章[\s_－-]*/, '').trim();

  return { number, title: rest || s };
}

/** 根据文件名/标题推断站点 */
export function inferSite(sample: string): NovelSite {
  // 番茄格式：第X章_第Y章
  if (/第\s*\d+\s*章\s*[_－-]?\s*第\s*\d+\s*章/.test(sample)) return 'fanqie';
  // 起点格式：第X章_标题（无二级章号）
  if (/第\s*\d+\s*章/.test(sample)) return 'qidian';
  return 'unknown';
}

function buildChapter(rawChapter: string, paragraphs: string[], sourceImage?: string): NovelChapter {
  const { number, title } = extractChapterMeta(rawChapter);
  return {
    id: generateId(),
    number,
    title,
    rawTitle: rawChapter,
    paragraphs: (paragraphs || []).filter((p) => typeof p === 'string' && p.trim().length > 0),
    sourceImage,
    wordCount: (paragraphs || []).reduce((n, p) => n + (p?.length || 0), 0),
  };
}

interface RawChapter {
  chapter?: string;
  source_image?: string;
  paragraphs?: string[];
  paragraph_count?: number;
  txt?: string;
}

function isMergedBook(obj: any): boolean {
  return obj && Array.isArray(obj.chapters) && (obj.title !== undefined || obj.chapter_count !== undefined);
}

function isChapterFile(obj: any): boolean {
  return obj && (Array.isArray(obj.paragraphs) || typeof obj.txt === 'string') && !Array.isArray(obj.chapters);
}

/**
 * 解析一个 OCR 产物对象为章节列表 + 站点
 */
export function parseOcrObject(obj: any): { chapters: NovelChapter[]; site: NovelSite } | null {
  if (isMergedBook(obj)) {
    const chapters = (obj.chapters as RawChapter[])
      .map((c) => buildChapter(c.chapter || '', c.paragraphs || [], c.source_image))
      .filter((c) => c.paragraphs.length > 0);
    const site = chapters.length ? inferSite(chapters[0].rawTitle) : 'unknown';
    return { chapters, site };
  }
  if (isChapterFile(obj)) {
    const paras = obj.paragraphs || (obj.txt ? obj.txt.split('\n') : []);
    const ch = buildChapter(obj.chapter || '', paras, obj.source_image);
    if (ch.paragraphs.length === 0) return null;
    return { chapters: [ch], site: inferSite(ch.rawTitle) };
  }
  return null;
}

/**
 * 把一组章节组装成 NovelProject
 */
export function assembleNovel(
  title: string,
  chapters: NovelChapter[],
  site: NovelSite
): NovelProject {
  const sorted = [...chapters].sort((a, b) => a.number - b.number || a.rawTitle.localeCompare(b.rawTitle));
  return {
    id: generateId(),
    title,
    site,
    chapterCount: sorted.length,
    importedAt: Date.now(),
    chapters: sorted,
  };
}
