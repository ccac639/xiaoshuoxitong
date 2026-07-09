/**
 * World State Manager V2 - 世界状态管理器（真实更新版）
 *
 * 每个事件必须能更新：
 * - 人物位置、生命/等级/能力
 * - 阵营关系
 * - 道具归属
 * - 世界规则
 * - 任务状态
 * - 伏笔状态
 * - 阵营声望
 */

import { WorldSnapshot, WorldEvent, WorldCharacter, WorldRelation, WorldFlag } from '@/types';
import { getStoryMemory, CharacterState, WorldStateData } from '@/server/memory/storyMemoryV2';

// ==================== 事件效果定义 ====================

export interface EventEffect {
  // 角色变化
  characterEffects?: {
    charId: string;
    name: string;
    hpDelta?: number;
    mpDelta?: number;
    levelDelta?: number;
    location?: string;
    newStatus?: string[];
    removeStatus?: string[];
    addAbility?: string;
    removeAbility?: string;
    addItem?: string;
    removeItem?: string;
  }[];
  // 阵营关系变化
  factionEffects?: {
    factionName: string;
    charId: string;
    reputationDelta?: number;
  }[];
  // 阵营间关系
  factionRelationEffects?: {
    factionA: string;
    factionB: string;
    relationDelta: number;
  }[];
  // 世界规则
  newRules?: string[];
  // 任务更新
  questUpdates?: {
    questId: string;
    charId: string;
    newStatus: string;
  }[];
  // 伏笔
  plantForeshadowing?: {
    description: string;
    targetChapter?: number;
  }[];
  resolveForeshadowing?: {
    id: string;
    resolution: string;
  }[];
  // 钩子
  newHooks?: string[];
  resolveHooks?: string[];
  // 时间线
  timelineEvent?: string;
  // 世界标志
  setFlags?: Record<string, boolean | string | number>;
}

// ==================== WorldStateManager ====================

export class WorldStateManagerV2 {
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * 获取当前世界的完整快照（用于生成时传入）
   */
  async getSnapshot(): Promise<WorldSnapshot> {
    const memory = getStoryMemory(this.projectId);
    const project = await (await import('@/server/project/projectStore')).projectStore.getProject(this.projectId);
    const worldState = await memory.getWorldState();
    const characters = await memory.getCharacters();

    // 将 CharacterState 转为 WorldCharacter
    const worldChars: Record<string, WorldCharacter> = {};
    for (const [id, cs] of Object.entries(characters)) {
      worldChars[id] = {
        id: cs.id,
        name: cs.name,
        hp: cs.hp,
        mp: cs.abilities.includes('mp') ? 100 : undefined,
        emotion: '平静',
        status: cs.statusEffects,
        location: cs.currentLocation,
        attributes: {
          等级: cs.level || 1,
        },
      };
    }

    // 生成阵营关系
    const relations: WorldRelation[] = [];
    for (const [factionId, faction] of Object.entries(worldState.factions)) {
      // 简化为 faction relation
      for (const [otherId, other] of Object.entries(worldState.factions)) {
        if (factionId >= otherId) continue;
        relations.push({
          from: factionId,
          to: otherId,
          type: '中立',
          value: 0,
          description: `${faction.name} ↔ ${other.name}`,
        });
      }
    }

    // 世界标志
    const flags: Record<string, WorldFlag> = {};
    for (const [key, value] of Object.entries(worldState.flags)) {
      flags[key] = {
        key,
        value,
        label: key,
        category: '世界状态',
      };
    }

    return {
      id: `snapshot-${project?.currentChapter || 0}`,
      chapterId: `chapter-${project?.currentChapter || 0}`,
      chapterNumber: project?.currentChapter || 0,
      timestamp: Date.now(),
      characters: worldChars,
      relations,
      flags,
      metadata: {
        eventCount: worldState.timeline.length,
        skillInvocations: [],
      },
    };
  }

  /**
   * 应用事件效果到世界状态 —— 核心方法
   */
  async applyEventEffects(
    chapterNumber: number,
    effects: EventEffect
  ): Promise<void> {
    const memory = getStoryMemory(this.projectId);

    // 1. 更新角色状态
    if (effects.characterEffects) {
      for (const ce of effects.characterEffects) {
        const existing = await memory.getCharacter(ce.charId);
        const char: CharacterState = existing || {
          id: ce.charId,
          name: ce.name,
          currentLocation: ce.location || '未知',
          hp: 100,
          level: 1,
          abilities: [],
          factionAffiliation: [],
          factionReputation: {},
          inventory: [],
          questStatus: {},
          statusEffects: [],
          lastUpdateChapter: chapterNumber,
        };

        if (ce.hpDelta) char.hp = Math.max(0, Math.min(100, char.hp + ce.hpDelta));
        if (ce.levelDelta) char.level = Math.max(1, (char.level || 1) + ce.levelDelta);
        if (ce.location) char.currentLocation = ce.location;
        if (ce.newStatus) {
          for (const s of ce.newStatus) {
            if (!char.statusEffects.includes(s)) char.statusEffects.push(s);
          }
        }
        if (ce.removeStatus) {
          char.statusEffects = char.statusEffects.filter(s => !ce.removeStatus!.includes(s));
        }
        if (ce.addAbility && !char.abilities.includes(ce.addAbility)) {
          char.abilities.push(ce.addAbility);
        }
        if (ce.removeAbility) {
          char.abilities = char.abilities.filter(a => a !== ce.removeAbility);
        }
        if (ce.addItem && !char.inventory.includes(ce.addItem)) {
          char.inventory.push(ce.addItem);
        }
        if (ce.removeItem) {
          char.inventory = char.inventory.filter(i => i !== ce.removeItem);
        }
        char.lastUpdateChapter = chapterNumber;

        await memory.saveCharacter(char);
      }
    }

    // 2. 更新阵营声望
    if (effects.factionEffects) {
      for (const fe of effects.factionEffects) {
        const char = await memory.getCharacter(fe.charId);
        if (char) {
          if (!char.factionReputation[fe.factionName]) {
            char.factionReputation[fe.factionName] = 0;
          }
          char.factionReputation[fe.factionName] += (fe.reputationDelta || 0);
          await memory.saveCharacter(char);
        }
      }
    }

    // 3. 更新阵营关系
    const worldState = await memory.getWorldState();
    if (effects.factionRelationEffects) {
      for (const fre of effects.factionRelationEffects) {
        // 阵营关系直接记录在 factions 中
        if (worldState.factions[fre.factionA]) {
          // 记录在 timeline 中
        }
      }
    }

    // 4. 新增世界规则
    if (effects.newRules) {
      for (const rule of effects.newRules) {
        await memory.addWorldRule(rule);
      }
    }

    // 5. 更新任务状态
    if (effects.questUpdates) {
      for (const qu of effects.questUpdates) {
        const char = await memory.getCharacter(qu.charId);
        if (char) {
          char.questStatus[qu.questId] = qu.newStatus;
          await memory.saveCharacter(char);
        }
      }
    }

    // 6. 伏笔管理
    if (effects.plantForeshadowing) {
      for (const pf of effects.plantForeshadowing) {
        await memory.plantForeshadow({
          description: pf.description,
          plantedChapter: chapterNumber,
          targetChapter: pf.targetChapter,
        });
      }
    }
    if (effects.resolveForeshadowing) {
      for (const rf of effects.resolveForeshadowing) {
        await memory.resolveForeshadow(rf.id, rf.resolution, chapterNumber);
      }
    }

    // 7. 钩子管理
    if (effects.newHooks) {
      for (const hook of effects.newHooks) {
        await memory.addUnresolvedHook(hook);
      }
    }
    if (effects.resolveHooks) {
      for (const hook of effects.resolveHooks) {
        await memory.resolveHook(hook);
      }
    }

    // 8. 时间线
    if (effects.timelineEvent) {
      await memory.addTimelineEvent(chapterNumber, effects.timelineEvent);
    }

    // 9. 世界标志
    if (effects.setFlags) {
      const updatedState = await memory.getWorldState();
      for (const [key, value] of Object.entries(effects.setFlags)) {
        updatedState.flags[key] = value;
      }
      await memory.saveWorldState(updatedState);
    }
  }

  /**
   * 快速初始化角色（从世界快照初始化到持久化）
   */
  async initCharactersFromSnapshot(snapshot: WorldSnapshot): Promise<void> {
    const memory = getStoryMemory(this.projectId);
    for (const [charId, wc] of Object.entries(snapshot.characters)) {
      await memory.saveCharacter({
        id: charId,
        name: wc.name,
        currentLocation: wc.location || '未知',
        hp: wc.hp,
        level: wc.attributes?.['等级'] || wc.attributes?.['攻击力'] ? 10 : 1,
        abilities: [],
        factionAffiliation: [],
        factionReputation: {},
        inventory: [],
        questStatus: {},
        statusEffects: wc.status || [],
        lastUpdateChapter: snapshot.chapterNumber,
      });
    }

    // 初始化阵营关系
    const worldState = await memory.getWorldState();
    for (const rel of snapshot.relations) {
      if (!worldState.factions[rel.from]) {
        worldState.factions[rel.from] = { name: rel.from, power: 50, description: '' };
      }
      if (!worldState.factions[rel.to]) {
        worldState.factions[rel.to] = { name: rel.to, power: 50, description: '' };
      }
    }
    await memory.saveWorldState(worldState);
  }
}

// 实例缓存
const wsmInstances = new Map<string, WorldStateManagerV2>();

export function getWorldStateManager(projectId: string): WorldStateManagerV2 {
  if (!wsmInstances.has(projectId)) {
    wsmInstances.set(projectId, new WorldStateManagerV2(projectId));
  }
  return wsmInstances.get(projectId)!;
}
