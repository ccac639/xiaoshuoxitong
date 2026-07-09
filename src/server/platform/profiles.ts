/**
 * Platform Profiles - 平台配置预设
 *
 * 每个 Profile 定义：
 * - 字数区间
 * - 必须有
 * - 必须避免
 * - 风格指南
 */

import { PlatformProfile } from '@/server/project/projectStore';

// ==================== 华语平台 ====================

export const PROFILE_QIDIAN: PlatformProfile = {
  platform: 'qidian',
  genre: 'custom',
  chapterWords: [2500, 4500],
  mustHave: [
    '每章第一个 500 字内出现冲突或转折',
    '章尾必须有悬念或升级预告',
    '每章有明确的实力展示',
    '战力体系前后一致',
    '脸谱化但鲜明的配角',
    '每次升级有仪式感和陪衬',
  ],
  avoid: [
    '大段世界观纯说明（超过 300 字）',
    '内心独白超过 200 字',
    '连续三章无数值/等级变化',
    '主角性格懦弱或过度犹豫',
    '配角比主角更有吸引力',
    '战力通货膨胀（前期稀有后期烂大街）',
  ],
  styleGuides: {
    dialogue: '简洁有力，少用修饰语，"XX道"可接受但不能全篇统一',
    description: '简洁但到位，关键场景 100-200 字',
    action: '动作链清晰，读者能脑补画面',
    internalThought: '每章不超过 150 字',
  },
};

export const PROFILE_FANQIE: PlatformProfile = {
  platform: 'fanqie',
  genre: 'custom',
  chapterWords: [1500, 5000],
  mustHave: [
    '前 300 字必须有冲突/逆转/信息炸弹之一',
    '每 800 字一个新信息',
    '章尾必须是即时危机或关键选择',
    '快节奏，短段落',
    '信息量密集',
    '主角主动性强（不能被动等剧情）',
  ],
  avoid: [
    '前 500 字无冲突',
    '连续内心独白超过 100 字',
    '章尾自然收束（无钩子）',
    '段落过长（超过 5 行）',
    '配角对话过于正式',
    '"他心想..." 式心理活动超过 2 处/章',
  ],
  styleGuides: {
    dialogue: '口语化，短句为主，适当使用网络化表达',
    description: '极少，场景靠对话和动作推动',
    action: '高频动作，短句切换快',
    internalThought: '极少，通过行动和对话传达',
  },
};

// ==================== 海外平台 ====================

export const PROFILE_ROYALROAD: PlatformProfile = {
  platform: 'royalroad',
  genre: 'litrpg_kingdom_building',
  chapterWords: [1500, 2500],
  mustHave: [
    'clear progression (stats / skills / level up)',
    'visible system mechanics (blue boxes, notifications)',
    'early conflict within first 300 words',
    'chapter-end hook (stat preview or quest update)',
    'recurring player characters with distinct personalities',
    'minimal exposition (show via system interactions)',
    'protagonist agency (active choices, not reactive)',
  ],
  avoid: [
    'long exposition paragraphs (over 150 words)',
    'translated Chinese idioms or chengyu',
    'face-slapping without proper setup',
    'NPCs only acting shocked as reaction',
    'info-dump worldbuilding in first chapter',
    'protagonist being passive observer',
    'overpowered without cost or limitation',
  ],
  styleGuides: {
    dialogue: 'Natural English, distinct character voices, minimal dialogue tags',
    description: 'Brief but vivid, 50-100 words per scene setting',
    action: 'Clear cause-and-effect chains',
    internalThought: 'Present but filtered through goal-oriented lens',
  },
};

export const PROFILE_WEB_NOVEL: PlatformProfile = {
  platform: 'webnovel',
  genre: 'litrpg',
  chapterWords: [1000, 2000],
  mustHave: [
    'system notifications every chapter',
    'clear power progression',
    'early hook (first 200 words)',
    'chapter-end cliffhanger',
    'accessible language (ESL-friendly)',
    'clear character motivations',
  ],
  avoid: [
    'culturally specific references without explanation',
    'complex sentence structures',
    'subtle humor that requires cultural context',
    'over 200 words without action or dialogue',
    'ambiguous character emotions',
  ],
  styleGuides: {
    dialogue: 'Simple, direct, with clear speaker attribution',
    description: 'Minimal, functional',
    action: 'Straightforward cause-effect',
    internalThought: 'Limited to clear goal statements',
  },
};

export const PROFILE_KDP: PlatformProfile = {
  platform: 'kdp',
  genre: 'litrpg',
  chapterWords: [2000, 3500],
  mustHave: [
    'complete story arcs per book',
    'satisfying mini-climax per 5 chapters',
    'character growth with emotional stakes',
    'foreshadowing with payoff',
    'professional prose quality',
    'genre expectations met (LitRPG = visible system)',
    'strong hook in Look Inside preview',
  ],
  avoid: [
    'cliffhanger-only chapter endings (Amazon readers expect satisfaction)',
    'excessive stat sheets (KDP readers prefer story over numbers)',
    'unearned power-ups',
    'abandoned subplots',
    'translated feel in prose',
  ],
  styleGuides: {
    dialogue: 'Natural, character-distinct, proper punctuation',
    description: 'Balanced, immersive',
    action: 'Clear, engaging, with stakes',
    internalThought: 'Present but integrated with scene flow',
  },
};

// ==================== 第四天灾专用模板 ====================

export const TEMPLATE_FALLEN_DRAGON_EMPEROR: PlatformProfile = {
  platform: 'royalroad',
  genre: 'litrpg_kingdom_building_players',
  chapterWords: [1800, 2500],
  mustHave: [
    // Dragon Emperor core
    'Fallen Dragon Emperor with sealed/nerfed power',
    'gradual power unsealing tied to kingdom growth',
    // Player Army
    'Player Army as primary force multiplier',
    'player personalities: min-maxer, troll, strategist, lore-nerd, casual',
    'players exploiting game mechanics creatively',
    // Base Building
    'kingdom base progression (tier 1 village → tier N empire)',
    'base defense events with player coordination',
    'resource management / tech tree choices',
    // Tax System
    'visible taxation system (gold, materials, player contributions)',
    'economic consequences of decisions',
    // LitRPG
    'blue-box system messages',
    'player stat sheets (not every chapter, but consistent)',
    'quest log and faction reputation',
    // Story
    'recurring enemy faction with scaling threat',
    'NPCs with agency and personal arcs',
    'worldbuilding through player discoveries',
  ],
  avoid: [
    'players acting as obedient NPC followers',
    'dragon emperor solving everything solo',
    'players having zero consequences for chaos',
    'tax system becoming irrelevant after setup',
    'kingdom growth without visible milestones',
    'Chinese-specific humor/references (adapt for global)',
    'wall of stats without narrative significance',
  ],
  styleGuides: {
    dialogue: 'Players use modern casual English; NPCs vary by role',
    description: 'System messages in code-block style; world described through player POV',
    action: 'Alternate between strategic overview and player-ground-level chaos',
    internalThought: 'Emperor POV for strategy; Player POV for humor and discovery',
  },
};

// ==================== 导出 ====================

export const PLATFORM_PROFILES: Record<string, PlatformProfile> = {
  qidian: PROFILE_QIDIAN,
  fanqie: PROFILE_FANQIE,
  royalroad: PROFILE_ROYALROAD,
  webnovel: PROFILE_WEB_NOVEL,
  kdp: PROFILE_KDP,
  'fallen-dragon-emperor': TEMPLATE_FALLEN_DRAGON_EMPEROR,
};

export function getProfile(platform: string): PlatformProfile {
  return PLATFORM_PROFILES[platform] || PROFILE_QIDIAN;
}
