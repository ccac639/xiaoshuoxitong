/**
 * Project Store - 项目持久化存储
 *
 * 文件结构:
 *   data/projects/<projectId>/
 *     project.json          - 项目元信息
 *     outline.json          - 大纲
 *     volumes.json          - 卷结构
 *     chapters/
 *       ch001.json ...      - 各章节数据
 *     memory/
 *       summary.json        - 故事总结
 *       characters.json     - 角色状态
 *       world_state.json    - 世界状态
 *       foreshadowing.json  - 伏笔管理
 *       unresolved_hooks.json - 未回收钩子
 *       style_profile.json  - 风格画像
 *     platform_profile.json - 平台配置 (royalroad/起点/番茄等)
 */

import { promises as fs } from 'fs';
import path from 'path';

const DATA_ROOT = path.join(process.cwd(), 'data', 'projects');

// ==================== 类型定义 ====================

export interface ProjectMeta {
  id: string;
  title: string;
  oneLiner: string;           // 一句话卖点
  genre: string;
  subGenres: string[];
  targetPlatform: 'qidian' | 'fanqie' | 'royalroad' | 'webnovel' | 'kdp' | 'custom';
  targetWords: number;
  status: 'planning' | 'writing' | 'paused' | 'completed';
  currentVolume: number;
  currentChapter: number;
  totalChapters: number;
  createdAt: number;
  updatedAt: number;
}

export interface VolumeInfo {
  volumeNumber: number;
  title: string;
  goal: string;               // 本卷目标
  startChapter: number;
  endChapter?: number;
  status: 'planned' | 'writing' | 'completed';
}

export interface OutlineNode {
  id: string;
  title: string;
  description: string;
  volumeNumber: number;
  chapterStart: number;
  chapterEnd: number;
  children?: OutlineNode[];
  majorEvents: string[];      // 关键剧情节点
  characterFocus: string[];   // 重点角色
}

export interface ChapterData {
  chapterNumber: number;
  volumeNumber: number;
  title: string;
  content: string;
  wordCount: number;
  status: 'draft' | 'audited' | 'revised' | 'committed';
  auditResult?: any;
  beatSheet?: BeatItem[];
  plan?: ChapterPlan;
  metadata: {
    model: string;
    tokenUsage: number;
    cost: number;
    retries: number;
    generationTime: number;
    auditTime?: number;
    revisionTime?: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface BeatItem {
  beatNumber: number;
  description: string;
  type: 'conflict' | 'dialogue' | 'action' | 'revelation' | 'transition' | 'hook';
  goal: string;
  emotion: string;
}

export interface ChapterPlan {
  goal: string;               // 本章目标
  conflict: string;           // 核心冲突
  highlight: string;          // 爽点
  cliffhanger: string;        // 章尾钩子
}

// ==================== 存储函数 ====================

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson<T>(filePath: string, defaultVal: T): Promise<T> {
  try {
    const buf = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(buf) as T;
  } catch {
    return defaultVal;
  }
}

async function writeJson(filePath: string, data: any): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function projectDir(projectId: string): string {
  return path.join(DATA_ROOT, projectId);
}

// ==================== 项目 CRUD ====================

export async function createProject(meta: Omit<ProjectMeta, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectMeta> {
  const id = `proj-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = Date.now();
  const project: ProjectMeta = {
    ...meta,
    id,
    createdAt: now,
    updatedAt: now,
  };

  const dir = projectDir(id);
  await ensureDir(dir);
  await ensureDir(path.join(dir, 'chapters'));
  await ensureDir(path.join(dir, 'memory'));

  await writeJson(path.join(dir, 'project.json'), project);
  await writeJson(path.join(dir, 'outline.json'), []);
  await writeJson(path.join(dir, 'volumes.json'), []);

  // 初始化 memory 文件
  await writeJson(path.join(dir, 'memory', 'summary.json'), {
    overallSummary: '',
    volumeSummaries: [] as { volume: number; summary: string }[],
  });
  await writeJson(path.join(dir, 'memory', 'characters.json'), {});
  await writeJson(path.join(dir, 'memory', 'world_state.json'), {
    flags: {},
    locations: {},
    factions: {},
    rules: [],
  });
  await writeJson(path.join(dir, 'memory', 'foreshadowing.json'), []);
  await writeJson(path.join(dir, 'memory', 'unresolved_hooks.json'), []);
  await writeJson(path.join(dir, 'memory', 'style_profile.json'), {
    toneKeywords: [],
    pacingProfile: 'balanced',
    sentenceLengthPreference: 'mixed',
    bannedPatterns: [],
  });

  return project;
}

export async function getProject(projectId: string): Promise<ProjectMeta | null> {
  return readJson<ProjectMeta | null>(path.join(projectDir(projectId), 'project.json'), null);
}

export async function listProjects(): Promise<ProjectMeta[]> {
  try {
    const dirs = await fs.readdir(DATA_ROOT, { withFileTypes: true });
    const projects: ProjectMeta[] = [];
    for (const d of dirs) {
      if (d.isDirectory()) {
        const p = await getProject(d.name);
        if (p) projects.push(p);
      }
    }
    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function updateProject(projectId: string, update: Partial<ProjectMeta>): Promise<ProjectMeta | null> {
  const existing = await getProject(projectId);
  if (!existing) return null;
  const updated: ProjectMeta = { ...existing, ...update, updatedAt: Date.now() };
  await writeJson(path.join(projectDir(projectId), 'project.json'), updated);
  return updated;
}

export async function deleteProject(projectId: string): Promise<void> {
  const dir = projectDir(projectId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

// ==================== 大纲管理 ====================

export async function getOutline(projectId: string): Promise<OutlineNode[]> {
  return readJson(path.join(projectDir(projectId), 'outline.json'), [] as OutlineNode[]);
}

export async function saveOutline(projectId: string, outline: OutlineNode[]): Promise<void> {
  await writeJson(path.join(projectDir(projectId), 'outline.json'), outline);
}

// ==================== 卷管理 ====================

export async function getVolumes(projectId: string): Promise<VolumeInfo[]> {
  return readJson(path.join(projectDir(projectId), 'volumes.json'), [] as VolumeInfo[]);
}

export async function saveVolumes(projectId: string, volumes: VolumeInfo[]): Promise<void> {
  await writeJson(path.join(projectDir(projectId), 'volumes.json'), volumes);
}

// ==================== 章节管理 ====================

export async function getChapter(projectId: string, chapterNumber: number): Promise<ChapterData | null> {
  const chNum = String(chapterNumber).padStart(3, '0');
  return readJson<ChapterData | null>(
    path.join(projectDir(projectId), 'chapters', `ch${chNum}.json`),
    null
  );
}

export async function saveChapter(projectId: string, chapter: ChapterData): Promise<void> {
  const chNum = String(chapter.chapterNumber).padStart(3, '0');
  await writeJson(
    path.join(projectDir(projectId), 'chapters', `ch${chNum}.json`),
    chapter
  );
}

export async function listChapters(projectId: string): Promise<ChapterData[]> {
  const dir = path.join(projectDir(projectId), 'chapters');
  try {
    const files = await fs.readdir(dir);
    const chapters: ChapterData[] = [];
    for (const f of files) {
      if (f.startsWith('ch') && f.endsWith('.json')) {
        const ch = await readJson<ChapterData | null>(path.join(dir, f), null);
        if (ch) chapters.push(ch);
      }
    }
    return chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
  } catch {
    return [];
  }
}

export async function getLatestChapter(projectId: string): Promise<ChapterData | null> {
  const chapters = await listChapters(projectId);
  return chapters.length > 0 ? chapters[chapters.length - 1] : null;
}

// ==================== 记忆管理 ====================

export async function getMemoryData<T>(projectId: string, file: string, defaultVal: T): Promise<T> {
  return readJson<T>(path.join(projectDir(projectId), 'memory', file), defaultVal);
}

export async function saveMemoryData(projectId: string, file: string, data: any): Promise<void> {
  await writeJson(path.join(projectDir(projectId), 'memory', file), data);
}

// ==================== 平台 Profile ====================

export interface PlatformProfile {
  platform: string;
  genre: string;
  chapterWords: [number, number];
  mustHave: string[];
  avoid: string[];
  styleGuides?: Record<string, string>;
}

export async function getPlatformProfile(projectId: string): Promise<PlatformProfile | null> {
  return readJson<PlatformProfile | null>(
    path.join(projectDir(projectId), 'platform_profile.json'),
    null
  );
}

export async function savePlatformProfile(projectId: string, profile: PlatformProfile): Promise<void> {
  await writeJson(path.join(projectDir(projectId), 'platform_profile.json'), profile);
}

// ==================== 导出 ====================

export const projectStore = {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  getOutline,
  saveOutline,
  getVolumes,
  saveVolumes,
  getChapter,
  saveChapter,
  listChapters,
  getLatestChapter,
  getMemoryData,
  saveMemoryData,
  getPlatformProfile,
  savePlatformProfile,
};
