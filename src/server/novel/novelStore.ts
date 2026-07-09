// 小说数据存储层（服务端）——
// 导入的 OCR 小说落盘到 data/novels/，刷新不丢。
//   data/novels/index.json        → NovelSummary[]
//   data/novels/<id>.json         → 完整 NovelProject

import { promises as fs } from 'fs';
import path from 'path';
import {
  NovelProject,
  NovelSummary,
  ImportResult,
  NovelInput,
  NovelSite,
} from '@/types/novel';
import { generateId } from '@/lib/utils';
import { parseOcrObject, assembleNovel } from './ocrImporter';

const DATA_DIR = path.join(process.cwd(), 'data', 'novels');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readIndex(): Promise<NovelSummary[]> {
  try {
    const buf = await fs.readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(buf) as NovelSummary[];
  } catch {
    return [];
  }
}

async function writeIndex(list: NovelSummary[]) {
  await fs.writeFile(INDEX_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

export async function listNovels(): Promise<NovelSummary[]> {
  const list = await readIndex();
  return list.sort((a, b) => b.importedAt - a.importedAt);
}

export async function getNovel(id: string): Promise<NovelProject | null> {
  try {
    const buf = await fs.readFile(path.join(DATA_DIR, `${id}.json`), 'utf-8');
    return JSON.parse(buf) as NovelProject;
  } catch {
    return null;
  }
}

async function saveNovel(project: NovelProject) {
  await ensureDir();
  const list = await readIndex();
  const summary: NovelSummary = {
    id: project.id,
    title: project.title,
    site: project.site,
    chapterCount: project.chapterCount,
    importedAt: project.importedAt,
    type: project.type,
    folder: project.folder,
    pinned: project.pinned || false,
  };
  const existing = list.findIndex((n) => n.id === project.id);
  if (existing >= 0) list[existing] = summary;
  else list.push(summary);
  await writeIndex(list);
  await fs.writeFile(path.join(DATA_DIR, `${project.id}.json`), JSON.stringify(project, null, 2), 'utf-8');
}

export async function deleteNovel(id: string): Promise<void> {
  const list = await readIndex();
  const next = list.filter((n) => n.id !== id);
  await writeIndex(next);
  try {
    await fs.unlink(path.join(DATA_DIR, `${id}.json`));
  } catch {
    /* ignore */
  }
}

/**
 * 新建一本空白小说项目（手动创建，无导入章节）。
 */
export async function createNovel(input: NovelInput): Promise<NovelProject> {
  const project: NovelProject = {
    id: generateId(),
    title: (input.title || '').trim() || '未命名小说',
    site: input.site || 'unknown',
    chapterCount: 0,
    importedAt: Date.now(),
    chapters: [],
    type: input.type?.trim() || undefined,
    settings: input.settings?.trim() || undefined,
    folder: input.folder?.trim() || undefined,
    pinned: !!input.pinned,
  };
  await saveNovel(project);
  return project;
}

/**
 * 更新小说的元信息（标题 / 站点 / 类型 / 设定）。
 * 返回更新后的完整项目；id 不存在时返回 null。
 */
export async function updateNovel(
  id: string,
  patch: Partial<NovelInput>
): Promise<NovelProject | null> {
  const existing = await getNovel(id);
  if (!existing) return null;
  const updated: NovelProject = {
    ...existing,
    title: (patch.title?.trim() || existing.title) || '未命名小说',
    site: patch.site || existing.site,
    type: patch.type?.trim() || existing.type,
    settings: patch.settings?.trim() || existing.settings,
    folder: patch.folder?.trim() !== undefined ? (patch.folder.trim() || undefined) : existing.folder,
    pinned: patch.pinned !== undefined ? !!patch.pinned : (existing.pinned || false),
  };
  await saveNovel(updated);
  return updated;
}

/**
 * 扫描一个 OCR 输出文件夹，解析并导入为小说项目。
 * 支持：
 *  - 合并 JSON（含 chapters[]）
 *  - 扁平的多个单章 JSON
 *  - 每个子文件夹作为一本独立小说
 */
export async function importFromFolder(folderPath: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    folderPath,
    novels: [],
    scannedFiles: 0,
  };

  let stat;
  try {
    stat = await fs.stat(folderPath);
  } catch {
    result.error = `文件夹不存在或无法访问：${folderPath}`;
    return result;
  }
  if (!stat.isDirectory()) {
    result.error = `路径不是文件夹：${folderPath}`;
    return result;
  }

  // 收集 JSON 文件（根目录 + 一层子文件夹）
  const jsonFiles: string[] = [];
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(folderPath, e.name);
    if (e.isDirectory()) {
      const sub = await fs.readdir(full);
      for (const f of sub) {
        if (f.toLowerCase().endsWith('.json')) jsonFiles.push(path.join(full, f));
      }
    } else if (e.name.toLowerCase().endsWith('.json')) {
      jsonFiles.push(full);
    }
  }

  result.scannedFiles = jsonFiles.length;
  if (jsonFiles.length === 0) {
    result.error = `文件夹内未找到任何 .json 文件：${folderPath}`;
    return result;
  }

  // 分组：merged book / 子文件夹 / 扁平
  const mergedBooks: { title: string; chapters: any[]; site: NovelSite }[] = [];
  const bySubfolder = new Map<string, any[]>();
  const flat: any[] = [];

  for (const file of jsonFiles) {
    let obj: any = null;
    try {
      obj = JSON.parse(await fs.readFile(file, 'utf-8'));
    } catch {
      continue;
    }
    const parsed = parseOcrObject(obj);
    if (!parsed || parsed.chapters.length === 0) continue;

    if (obj.chapters && (obj.title !== undefined || obj.chapter_count !== undefined)) {
      mergedBooks.push({
        title: obj.title || path.basename(path.dirname(file)) || '未命名小说',
        chapters: parsed.chapters,
        site: parsed.site,
      });
    } else if (path.dirname(file) !== path.resolve(folderPath)) {
      const key = path.dirname(file);
      if (!bySubfolder.has(key)) bySubfolder.set(key, []);
      bySubfolder.get(key)!.push(...parsed.chapters);
    } else {
      flat.push(...parsed.chapters);
    }
  }

  const projects: NovelProject[] = [];

  for (const b of mergedBooks) {
    projects.push(assembleNovel(b.title, b.chapters, b.site));
  }
  const subfolders = Array.from(bySubfolder.entries());
  for (let i = 0; i < subfolders.length; i++) {
    const dir = subfolders[i][0];
    const chaps = subfolders[i][1];
    if (chaps.length === 0) continue;
    projects.push(assembleNovel(path.basename(dir), chaps, chaps[0] ? inferSiteSafe(chaps) : 'unknown'));
  }
  if (flat.length > 0) {
    projects.push(assembleNovel(path.basename(folderPath) || '未命名小说', flat, inferSiteSafe(flat)));
  }

  if (projects.length === 0) {
    result.error = '未在文件夹中找到有效的章节数据（期望包含 paragraphs 字段的 JSON）';
    return result;
  }

  for (const p of projects) {
    await saveNovel(p);
    result.novels.push({ id: p.id, title: p.title, chapterCount: p.chapterCount, site: p.site });
  }

  result.success = true;
  return result;
}

function inferSiteSafe(chapters: { rawTitle: string }[]): NovelSite {
  // 复用 importer 的推断（避免循环，这里简单内联）
  const sample = chapters[0]?.rawTitle || '';
  if (/第\s*\d+\s*章\s*[_－-]?\s*第\s*\d+\s*章/.test(sample)) return 'fanqie';
  if (/第\s*\d+\s*章/.test(sample)) return 'qidian';
  return 'unknown';
}
