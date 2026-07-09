/**
 * Story Memory - 故事记忆系统（持久化版）
 *
 * 记忆不存全文，存结构化摘要：
 * - 本章发生了什么
 * - 谁改变了状态
 * - 谁知道了什么
 * - 哪个伏笔被埋下
 * - 哪个伏笔被回收
 * - 世界规则有没有新增
 * - 下一章必须承接什么
 *
 * 数据文件：
 *   data/projects/<projectId>/memory/chapter_summaries.json  - 章节摘要列表
 *   data/projects/<projectId>/memory/characters.json          - 角色状态
 *   data/projects/<projectId>/memory/world_state.json        - 世界状态
 *   data/projects/<projectId>/memory/foreshadowing.json      - 伏笔管理
 *   data/projects/<projectId>/memory/unresolved_hooks.json   - 未回收钩子
 *   data/projects/<projectId>/memory/style_profile.json      - 风格画像
 *   data/projects/<projectId>/memory/summary.json            - 总摘要
 */

import { projectStore } from '@/server/project/projectStore';

// ==================== 类型定义 ====================

export interface ChapterSummary {
  chapterNumber: number;
  title: string;
  wordCount: number;
  whatHappened: string;          // 本章发生了什么（200字摘要）
  stateChanges: StateChange[];   // 谁改变了状态
  knowledgeGained: KnowledgeUpdate[]; // 谁知道了什么
  foreshadowingPlanted: ForeshadowEntry[]; // 埋下伏笔
  foreshadowingResolved: string[]; // 回收伏笔 ID
  worldRulesAdded: string[];     // 新增世界规则
  mustCarryForward: string[];    // 下一章必须承接
  timestamp: number;
}

export interface StateChange {
  entityType: 'character' | 'faction' | 'item' | 'location';
  entityId: string;
  entityName: string;
  field: string;
  oldValue: any;
  newValue: any;
}

export interface KnowledgeUpdate {
  characterId: string;
  characterName: string;
  knowledge: string;
  source: string; // 从哪获知的
}

export interface ForeshadowEntry {
  id: string;
  description: string;
  plantedChapter: number;
  status: 'pending' | 'partially_resolved' | 'resolved';
  targetChapter?: number;
  resolution?: string;
  resolvedChapter?: number;
}

export interface CharacterState {
  id: string;
  name: string;
  currentLocation: string;
  hp: number;
  level?: number;
  abilities: string[];
  factionAffiliation: string[];
  factionReputation: Record<string, number>;
  inventory: string[];
  questStatus: Record<string, string>;
  statusEffects: string[];
  lastUpdateChapter: number;
}

export interface WorldStateData {
  flags: Record<string, boolean | string | number>;
  locations: Record<string, { name: string; status: string; description: string }>;
  factions: Record<string, { name: string; power: number; description: string }>;
  rules: string[];
  timeline: { chapterNumber: number; event: string; timestamp: number }[];
}

// ==================== 持久化 StoryMemory ====================

export class StoryMemory {
  private projectId: string;
  private chapterSummariesCache: ChapterSummary[] | null = null;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  // --- 章节摘要持久化 ---

  /**
   * 加载章节摘要（从 chapter_summaries.json）
   */
  private async loadChapterSummaries(): Promise<ChapterSummary[]> {
    if (this.chapterSummariesCache !== null) {
      return this.chapterSummariesCache;
    }

    const data = await projectStore.getMemoryData<ChapterSummary[]>(
      this.projectId,
      'chapter_summaries.json',
      []
    );
    this.chapterSummariesCache = data;
    return data;
  }

  /**
   * 保存全部章节摘要到 chapter_summaries.json
   */
  private async persistChapterSummaries(summaries: ChapterSummary[]): Promise<void> {
    this.chapterSummariesCache = summaries;
    await projectStore.saveMemoryData(this.projectId, 'chapter_summaries.json', summaries);
  }

  /**
   * 保存单章摘要 — commitChapter 后调用
   */
  async saveChapterSummary(summary: ChapterSummary): Promise<void> {
    const summaries = await this.loadChapterSummaries();

    // 同章节号覆盖（幂等），否则追加
    const existingIdx = summaries.findIndex(s => s.chapterNumber === summary.chapterNumber);
    if (existingIdx >= 0) {
      summaries[existingIdx] = summary;
    } else {
      summaries.push(summary);
      // 按章节号排序
      summaries.sort((a, b) => a.chapterNumber - b.chapterNumber);
    }

    await this.persistChapterSummaries(summaries);
  }

  /**
   * 获取最近 N 章的摘要
   * 从 chapter_summaries.json 读取真实数据
   */
  async getRecentSummaries(count: number): Promise<ChapterSummary[]> {
    const summaries = await this.loadChapterSummaries();
    return summaries.slice(-count);
  }

  async getLastChapterSummary(): Promise<ChapterSummary | null> {
    const summaries = await this.loadChapterSummaries();
    return summaries.length > 0 ? summaries[summaries.length - 1] : null;
  }

  async getOverallSummary(): Promise<string> {
    const data = await projectStore.getMemoryData<any>(this.projectId, 'summary.json', { overallSummary: '' });
    return data.overallSummary || '';
  }

  async updateOverallSummary(summary: string): Promise<void> {
    await projectStore.saveMemoryData(this.projectId, 'summary.json', { overallSummary: summary });
  }

  // --- 角色状态 ---
  async getCharacters(): Promise<Record<string, CharacterState>> {
    return projectStore.getMemoryData<Record<string, CharacterState>>(
      this.projectId, 'characters.json', {}
    );
  }

  async getCharacter(charId: string): Promise<CharacterState | null> {
    const chars = await this.getCharacters();
    return chars[charId] || null;
  }

  async saveCharacter(char: CharacterState): Promise<void> {
    const chars = await this.getCharacters();
    chars[char.id] = char;
    await projectStore.saveMemoryData(this.projectId, 'characters.json', chars);
  }

  async updateCharacterState(charId: string, update: Partial<CharacterState>): Promise<void> {
    const chars = await this.getCharacters();
    if (chars[charId]) {
      chars[charId] = { ...chars[charId], ...update };
      await projectStore.saveMemoryData(this.projectId, 'characters.json', chars);
    }
  }

  // --- 世界状态 ---
  async getWorldState(): Promise<WorldStateData> {
    return projectStore.getMemoryData<WorldStateData>(this.projectId, 'world_state.json', {
      flags: {},
      locations: {},
      factions: {},
      rules: [],
      timeline: [],
    });
  }

  async saveWorldState(state: WorldStateData): Promise<void> {
    await projectStore.saveMemoryData(this.projectId, 'world_state.json', state);
  }

  async updateWorldFlag(key: string, value: boolean | string | number): Promise<void> {
    const state = await this.getWorldState();
    state.flags[key] = value;
    await this.saveWorldState(state);
  }

  async addWorldRule(rule: string): Promise<void> {
    const state = await this.getWorldState();
    if (!state.rules.includes(rule)) {
      state.rules.push(rule);
      await this.saveWorldState(state);
    }
  }

  async addTimelineEvent(chapterNumber: number, event: string): Promise<void> {
    const state = await this.getWorldState();
    state.timeline.push({ chapterNumber, event, timestamp: Date.now() });
    await this.saveWorldState(state);
  }

  // --- 伏笔管理 ---
  async getForeshadowing(): Promise<ForeshadowEntry[]> {
    return projectStore.getMemoryData<ForeshadowEntry[]>(this.projectId, 'foreshadowing.json', []);
  }

  async plantForeshadow(entry: Omit<ForeshadowEntry, 'id' | 'status'>): Promise<ForeshadowEntry> {
    const entries = await this.getForeshadowing();
    const newEntry: ForeshadowEntry = {
      ...entry,
      id: `fs-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: 'pending',
    };
    entries.push(newEntry);
    await projectStore.saveMemoryData(this.projectId, 'foreshadowing.json', entries);
    return newEntry;
  }

  async resolveForeshadow(id: string, resolution: string, chapterNumber: number): Promise<void> {
    const entries = await this.getForeshadowing();
    const entry = entries.find(e => e.id === id);
    if (entry) {
      entry.status = 'resolved';
      entry.resolution = resolution;
      entry.resolvedChapter = chapterNumber;
      await projectStore.saveMemoryData(this.projectId, 'foreshadowing.json', entries);
    }
  }

  async getPendingForeshadowing(): Promise<ForeshadowEntry[]> {
    const entries = await this.getForeshadowing();
    return entries.filter(e => e.status === 'pending');
  }

  // --- 未回收钩子 ---
  async getUnresolvedHooks(): Promise<string[]> {
    return projectStore.getMemoryData<string[]>(this.projectId, 'unresolved_hooks.json', []);
  }

  async addUnresolvedHook(hook: string): Promise<void> {
    const hooks = await this.getUnresolvedHooks();
    hooks.push(hook);
    await projectStore.saveMemoryData(this.projectId, 'unresolved_hooks.json', hooks);
  }

  async resolveHook(hook: string): Promise<void> {
    const hooks = await this.getUnresolvedHooks();
    const idx = hooks.indexOf(hook);
    if (idx >= 0) {
      hooks.splice(idx, 1);
      await projectStore.saveMemoryData(this.projectId, 'unresolved_hooks.json', hooks);
    }
  }

  // --- 风格画像 ---
  async getStyleProfile(): Promise<any> {
    return projectStore.getMemoryData(this.projectId, 'style_profile.json', {
      toneKeywords: [],
      pacingProfile: 'balanced',
      sentenceLengthPreference: 'mixed',
      bannedPatterns: [],
    });
  }

  async updateStyleProfile(update: any): Promise<void> {
    const profile = await this.getStyleProfile();
    await projectStore.saveMemoryData(this.projectId, 'style_profile.json', { ...profile, ...update });
  }

  // --- 完整上下文（供生成下一章用） ---
  async getGenerationContext(chapterNumber: number): Promise<{
    oneLiner: string;
    volumeGoal: string;
    recentSummaries: ChapterSummary[];
    lastChapterSummary: ChapterSummary | null;
    worldState: WorldStateData;
    characters: Record<string, CharacterState>;
    pendingForeshadowing: ForeshadowEntry[];
    unresolvedHooks: string[];
    styleProfile: any;
  }> {
    const project = await projectStore.getProject(this.projectId);
    const volumes = await projectStore.getVolumes(this.projectId);
    const currentVolume = volumes.find(v => v.volumeNumber === project?.currentVolume);

    return {
      oneLiner: project?.oneLiner || '',
      volumeGoal: currentVolume?.goal || '',
      recentSummaries: await this.getRecentSummaries(2),
      lastChapterSummary: await this.getLastChapterSummary(),
      worldState: await this.getWorldState(),
      characters: await this.getCharacters(),
      pendingForeshadowing: await this.getPendingForeshadowing(),
      unresolvedHooks: await this.getUnresolvedHooks(),
      styleProfile: await this.getStyleProfile(),
    };
  }
}

// 实例缓存
const instances = new Map<string, StoryMemory>();

export function getStoryMemory(projectId: string): StoryMemory {
  if (!instances.has(projectId)) {
    instances.set(projectId, new StoryMemory(projectId));
  }
  return instances.get(projectId)!;
}
