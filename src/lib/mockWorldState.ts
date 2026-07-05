// World State 模拟数据
import { WorldSnapshot, WorldCharacter, WorldRelation, WorldFlag } from '@/types';

/**
 * 模拟当前世界快照
 * 包含 5 个角色，8 条关系
 */
export const MOCK_SNAPSHOT: WorldSnapshot = {
  id: 'snapshot-chapter-15',
  chapterId: 'chapter-15',
  chapterNumber: 15,
  timestamp: Date.now(),
  characters: {
    'char-1': {
      id: 'char-1',
      name: '林夜',
      hp: 72,
      mp: 45,
      emotion: '平静',
      status: ['护盾', '加速'],
      location: '北境城门',
      attributes: {
        '攻击力': 85,
        '防御力': 60,
        '灵力': 70,
      },
    },
    'char-2': {
      id: 'char-2',
      name: '血影宗长老·墨煞',
      hp: 100,
      emotion: '愤怒',
      status: ['狂暴'],
      location: '北境城门',
      attributes: {
        '攻击力': 95,
        '防御力': 40,
        '血术': 88,
      },
    },
    'char-3': {
      id: 'char-3',
      name: '苏清歌',
      hp: 88,
      mp: 92,
      emotion: '平静',
      status: [],
      location: '城主府',
      attributes: {
        '攻击力': 55,
        '防御力': 50,
        '灵力': 90,
      },
    },
    'char-4': {
      id: 'char-4',
      name: '铁塔',
      hp: 45,
      emotion: '恐惧',
      status: ['流血', '减速'],
      location: '北境城门',
      attributes: {
        '攻击力': 78,
        '防御力': 75,
        '耐力': 85,
      },
    },
    'char-5': {
      id: 'char-5',
      name: '北境城主·韩靖',
      hp: 100,
      mp: 100,
      emotion: '平静',
      status: ['统帅光环'],
      location: '城主府',
      attributes: {
        '攻击力': 70,
        '防御力': 65,
        '统帅力': 95,
      },
    },
  },
  relations: [
    { from: 'char-1', to: 'char-2', type: '敌对', value: -85, description: '血影宗袭击林夜' },
    { from: 'char-1', to: 'char-3', type: '盟友', value: 75, description: '共同对抗血影宗' },
    { from: 'char-1', to: 'char-4', type: '盟友', value: 60, description: '并肩作战' },
    { from: 'char-1', to: 'char-5', type: '中立', value: 30, description: '尚未正式会面' },
    { from: 'char-2', to: 'char-4', type: '敌对', value: -90, description: '血影宗追杀叛逃者' },
    { from: 'char-3', to: 'char-5', type: '师徒', value: 90, description: '苏清歌是韩靖的弟子' },
    { from: 'char-4', to: 'char-5', type: '家族', value: 80, description: '铁塔是韩靖的旧部' },
    { from: 'char-5', to: 'char-2', type: '敌对', value: -70, description: '血影宗威胁北境' },
  ],
  flags: {
    'gate-closed': {
      key: 'gate-closed',
      value: true,
      label: '城门关闭',
      category: '世界状态',
    },
    'martial-law': {
      key: 'martial-law',
      value: true,
      label: '戒严令',
      category: '世界状态',
    },
    'blood-shadow-active': {
      key: 'blood-shadow-active',
      value: true,
      label: '血影宗活跃',
      category: '剧情标记',
    },
    'mc-has-shield': {
      key: 'mc-has-shield',
      value: true,
      label: '林夜护盾激活',
      category: '角色状态',
    },
    'weather': {
      key: 'weather',
      value: '暴雪',
      label: '天气',
      category: '环境',
    },
    'chapter-theme': {
      key: 'chapter-theme',
      value: '血影来袭',
      label: '章节主题',
      category: '剧情标记',
    },
  },
  metadata: {
    eventCount: 12,
    skillInvocations: ['battle_intensity', 'cliffhanger_emotion'],
  },
};

/**
 * 模拟历史快照列表
 */
export const MOCK_HISTORY: WorldSnapshot[] = [
  {
    ...MOCK_SNAPSHOT,
    id: 'snapshot-chapter-14',
    chapterId: 'chapter-14',
    chapterNumber: 14,
    timestamp: Date.now() - 3600000, // 1 小时前
    characters: {
      ...MOCK_SNAPSHOT.characters,
      'char-1': {
        ...MOCK_SNAPSHOT.characters['char-1'],
        hp: 100,
        emotion: '平静',
        status: [],
      },
    },
  },
  {
    ...MOCK_SNAPSHOT,
    id: 'snapshot-chapter-13',
    chapterId: 'chapter-13',
    chapterNumber: 13,
    timestamp: Date.now() - 7200000, // 2 小时前
    characters: {
      ...MOCK_SNAPSHOT.characters,
      'char-2': {
        ...MOCK_SNAPSHOT.characters['char-2'],
        hp: 100,
        emotion: '平静',
        status: [],
      },
    },
  },
];

/**
 * 获取角色名称
 */
export function getCharacterName(charId: string, snapshot: WorldSnapshot): string {
  return snapshot.characters[charId]?.name || charId;
}

/**
 * 获取关系类型对应的颜色
 */
export function getRelationColor(type: WorldRelation['type']): string {
  const colors: Record<WorldRelation['type'], string> = {
    '敌对': '#ef4444',
    '盟友': '#22c55e',
    '爱慕': '#ec4899',
    '师徒': '#a855f7',
    '家族': '#f97316',
    '中立': '#64748b',
  };
  return colors[type] || '#64748b';
}

/**
 * 获取情绪对应的颜色
 */
export function getEmotionColor(emotion: WorldCharacter['emotion']): string {
  const colors: Record<WorldCharacter['emotion'], string> = {
    '平静': '#64748b',
    '愤怒': '#ef4444',
    '恐惧': '#a855f7',
    '喜悦': '#22c55e',
    '悲伤': '#3b82f6',
    '困惑': '#f97316',
  };
  return colors[emotion] || '#64748b';
}
