/**
 * Skill Library V2 - 写作工序 Skill（可配置 + 内置预设）
 *
 * 每个 Skill 包含：
 * - 适用平台
 * - 输入字段
 * - 输出字段
 * - 检查点
 * - 禁忌
 */

// ==================== Skill 类型定义 ====================

export interface SkillDef {
  id: string;
  name: string;
  category: 'structure' | 'pacing' | 'character' | 'style' | 'audit' | 'platform';
  platforms: string[];          // 适用平台
  description: string;
  inputFields: string[];        // 需要哪些输入
  outputFields: string[];       // 输出什么
  checkpoints: string[];        // 检查点
  taboos: string[];             // 禁忌
  priority: number;
  prompt: string;               // 实际 SKILL PROMPT，用于注入 AI 生成
}

// ==================== 内置 Skill 定义 ====================

export const BUILTIN_SKILLS: SkillDef[] = [

  // ==================== 结构类 ====================

  {
    id: 'golden_three_chapters',
    name: '黄金三章设计',
    category: 'structure',
    platforms: ['qidian', 'fanqie', 'all'],
    description: '设计小说开头三章，确保每章独立完成一个小闭环，整体构成大钩子',
    inputFields: ['project_one_liner', 'target_platform', 'genre'],
    outputFields: ['ch1_goal', 'ch1_conflict', 'ch1_hook', 'ch2_goal', 'ch2_conflict', 'ch2_hook', 'ch3_goal', 'ch3_conflict', 'ch3_hook'],
    checkpoints: [
      '第一章 500 字内主角必须登场并有行动',
      '第一章结尾必须有新悬念',
      '第二章扩展世界观但不超过 300 字纯说明',
      '第三章完成第一个小高潮并埋更大伏笔',
    ],
    taboos: [
      '禁止开篇大段世界观说明（超过 200 字）',
      '禁止第一章全是内心独白无行动',
      '禁止三章后仍无明确主线方向',
    ],
    priority: 1,
    prompt: `你是"黄金三章"结构设计师。根据项目卖点和平台，设计开头三章的每章目标、核心冲突、章尾钩子。
要求：每章完成一个独立的小闭环（引入→冲突→推进→悬念），三章整体构成一个无法拒绝的大钩子。
输出格式：
- 第一章目标/冲突/钩子
- 第二章目标/冲突/钩子
- 第三章目标/冲突/钩子`,
  },

  {
    id: 'chapter_hook',
    name: '章首/章尾钩子',
    category: 'structure',
    platforms: ['all'],
    description: '设计每章开篇钩子和结尾悬念，保持读者翻页欲望',
    inputFields: ['chapter_plan', 'previous_cliffhanger', 'platform'],
    outputFields: ['opening_hook', 'closing_cliffhanger', 'mid_chapter_twist'],
    checkpoints: [
      '章首 200 字内必须有让人想继续读的内容',
      '章尾必须是一个"未完成"状态',
      '章中至少有一个小转折',
    ],
    taboos: [
      '禁止章尾完整收束（读者没有翻页动力）',
      '禁止章首重复前情提要超过 50 字',
      '禁止钩子用"他不知道的是..."这种过度模式化句式',
    ],
    priority: 2,
    prompt: `你是章节钩子设计师。根据本章计划和上一章结尾悬念，设计：
1. 章首钩子（200字内，让读者想知道后续）
2. 章中转折（打破读者预期）
3. 章尾悬念（让读者必须点下一章）
平台要求：番茄/起点章尾必须有即时冲突；Royal Road/KDP 章尾必须有清晰的目标更新或新信息揭示。`,
  },

  // ==================== 节奏类 ====================

  {
    id: 'upgrade_loop',
    name: '升级循环节奏',
    category: 'pacing',
    platforms: ['qidian', 'fanqie', 'royalroad', 'webnovel'],
    description: '目标 -> 阻碍 -> 行动 -> 收益 -> 新危机 五段式升级循环',
    inputFields: ['current_level', 'current_goal', 'available_resources', 'world_rules'],
    outputFields: ['obstacle', 'action_plan', 'reward', 'new_crisis'],
    checkpoints: [
      '升级必须付出代价（不能白给）',
      '收益后必须有新危机（不能停）',
      '阻碍必须和角色弱点相关',
      '新危机必须比之前更大',
    ],
    taboos: [
      '禁止原地飞升级无代价',
      '禁止收益后无新危机（会让读者觉得"爽完可以弃了"）',
      '禁止所有阻碍都是"来了一群更强的敌人"（套路疲劳）',
    ],
    priority: 3,
    prompt: `你是"升级循环"节奏设计师。严格执行：目标→阻碍→行动→收益→新危机。
规则：
- 阻碍必须和角色当前弱点相关，不能只是"敌人更强"
- 行动必须是角色主动做出的选择，不能是被动反应
- 收益要具体（新能力/新信息/新盟友），不能空泛
- 新危机必须和收益直接相关（收益带来了新问题）
输出格式：
- 当前目标 / 阻碍 / 行动方案 / 收益 / 新危机`,
  },

  {
    id: 'qidian_progression',
    name: '起点升级流节奏',
    category: 'pacing',
    platforms: ['qidian'],
    description: '起点经典升级节奏：3000 字一章节，每章完成一个小升级节点',
    inputFields: ['current_realm', 'next_realm', 'chapter_goal'],
    outputFields: ['realm_progress', 'battle_design', 'resource_gain', 'power_display'],
    checkpoints: [
      '每 5 章一个小境界突破',
      '每 20 章一个大境界突破',
      '突破必须有陪衬（同辈对比/长辈震惊）',
      '战力体系必须保持一致',
    ],
    taboos: [
      '禁止境界突破无仪式感',
      '禁止跨大境界不展示新能力',
      '禁止战力通货膨胀（前期稀有后期烂大街）',
    ],
    priority: 4,
    prompt: `你是起点升级流节奏专家。设计本章的升级进度：
- 当前境界 vs 目标境界
- 本章推进多少（不一定要突破）
- 战斗设计（敌人类型/战术/意外）
- 资源获取（功法/丹药/机缘）
- 实力展示（让读者看到成长）
注意：不是每章都要突破，但每章都要让读者看到"变强"的轨迹。`,
  },

  {
    id: 'fanqie_fast_hook',
    name: '番茄快节奏',
    category: 'pacing',
    platforms: ['fanqie'],
    description: '番茄快节奏模式：开篇即冲突，短章高频钩子',
    inputFields: ['chapter_goal', 'protagonist_name', 'previous_end'],
    outputFields: ['opening_conflict', 'mid_twist', 'chapter_end_hook'],
    checkpoints: [
      '前 300 字必须出现冲突或逆转',
      '每 800-1000 字一个信息炸弹',
      '章尾必须是即时危机或关键抉择',
      '全章不超过 5000 字',
    ],
    taboos: [
      '禁止前 500 字无冲突',
      '禁止超过 200 字连续内心独白',
      '禁止章尾自然收束',
    ],
    priority: 5,
    prompt: `你是番茄快节奏专家。本章要求：
- 开篇 300 字内出现冲突/逆转/信息炸弹三者之一
- 每 800 字必须有新的推动（新信息/新冲突/新角色登场）
- 章尾必须是即时危机或关键抉择（不能是"他心里想着"这种软钩子）
- 节奏对标番茄头部作品`,
  },

  {
    id: 'royalroad_litrpg',
    name: '海外 LitRPG / Royal Road 节奏',
    category: 'pacing',
    platforms: ['royalroad', 'webnovel'],
    description: 'LitRPG 节奏：清晰的数值成长 + 系统交互 + 章尾升级预告',
    inputFields: ['character_stats', 'system_messages', 'quest_log'],
    outputFields: ['stat_changes', 'system_notifications', 'quest_progress', 'next_chapter_teaser'],
    checkpoints: [
      '每章至少一次系统面板展示',
      '数值变化必须有可感知的效果',
      '章尾必须有升级预告（下一章能获得什么）',
      'Stats 不能只是数字，要对应剧情表现',
    ],
    taboos: [
      '禁止 Stats 堆砌无剧情对应',
      '禁止系统给万能方案（削弱角色主动性）',
      '禁止连续三章无数值变化',
    ],
    priority: 6,
    prompt: `你是 LitRPG 系统设计师。设计本章的数值变化和系统交互：
- Stat 变化（什么行为导致了什么数值增长）
- 系统通知（至少一条有信息量的系统消息）
- 任务进度更新
- 章尾预告（下一章可能解锁的新能力/新等级）
注意：数值必须对应剧情表现，不能空涨数字。`,
  },

  // ==================== 角色类 ====================

  {
    id: 'player_chaos',
    name: '第四天灾玩家整活',
    category: 'character',
    platforms: ['qidian', 'fanqie'],
    description: '玩家行为设计：玩家应该制造意外、破局、整活，而不是当 NPC',
    inputFields: ['player_count', 'current_situation', 'system_rules'],
    outputFields: ['player_actions', 'unexpected_outcomes', 'npc_reactions'],
    checkpoints: [
      '玩家行为必须打破 NPC 预期',
      '至少一个玩家利用系统规则的漏洞',
      '玩家造成的混乱必须有连锁反应',
      'NPC 反应必须合理但意想不到',
    ],
    taboos: [
      '禁止玩家行为像 NPC 一样按部就班',
      '禁止所有玩家意见一致（真实玩家不可能统一）',
      '禁止玩家只在旁边喊 666',
    ],
    priority: 7,
    prompt: `你是"第四天灾"玩家行为设计师。设计本章玩家们的整活内容：
- 玩家们如何解读/曲解 NPC 的指令
- 谁来利用系统规则漏洞
- 玩家造成的意外后果
- NPC 的震惊/崩溃/无奈反应
核心：玩家不是 NPC，他们会做一切 NPC 想不到的事。`,
  },

  {
    id: 'npc_reality',
    name: 'NPC 真实代价',
    category: 'character',
    platforms: ['all'],
    description: '确保 NPC 行为有真实代价，世界不只是游戏布景',
    inputFields: ['npc_list', 'current_events', 'world_economy'],
    outputFields: ['npc_daily_life', 'economic_impact', 'social_consequences'],
    checkpoints: [
      'NPC 有独立于主角的日常',
      '主角行为对平民有可感知的影响',
      '经济逻辑不能崩塌（资源从哪里来）',
      'NPC 伤亡后有真实悼念/影响',
    ],
    taboos: [
      '禁止 NPC 存在只为主角服务',
      '禁止战争不影响平民生活',
      '禁止资源无限供应不解释来源',
    ],
    priority: 8,
    prompt: `你是 NPC 真实感设计师。检查本章中非主角角色的行为是否有真实代价：
- NPC 是否有独立于主角的目标和恐惧
- 战斗/灾难是否影响到了普通人
- 资源消耗是否有合理来源
- 角色死亡后是否有情感涟漪效应`,
  },

  {
    id: 'quest_design',
    name: '任务/隐藏任务设计',
    category: 'character',
    platforms: ['royalroad', 'webnovel', 'qidian', 'fanqie'],
    description: '设计任务链：主线任务、支线任务、隐藏任务、奖励',
    inputFields: ['current_arc', 'world_state', 'available_npcs'],
    outputFields: ['main_quest', 'side_quests', 'hidden_quest', 'rewards', 'quest_hooks'],
    checkpoints: [
      '隐藏任务的触发条件必须合理且可追溯',
      '奖励不能破坏平衡',
      '支线任务必须和主线有潜在关联',
      '任务失败必须有后果',
    ],
    taboos: [
      '禁止所有任务都成功无代价',
      '禁止奖励无上限堆数值',
      '禁止隐藏任务全靠运气触发',
    ],
    priority: 9,
    prompt: `你是任务系统设计师。为核心弧线设计：
- 主线任务（本章推进什么）
- 1-2 个支线（可选但增加世界深度）
- 1 个隐藏任务触发条件（读者可以回头找到线索）
- 奖励设计（不能破坏平衡）
- 任务失败的可能性及后果`,
  },

  // ==================== 风格类 ====================

  {
    id: 'anti_template_prose',
    name: '去模板腔、去翻译腔',
    category: 'style',
    platforms: ['all'],
    description: '消除 AI 常见的模板化表达、翻译腔、空洞修辞',
    inputFields: ['chapter_content'],
    outputFields: ['flagged_sentences', 'replacement_suggestions', 'style_score'],
    checkpoints: [
      '消除了"然而/事实上/值得一提的是"等模板词',
      '消除了"一种说不清道不明的感觉"等空洞表达',
      '每段开头的句式有变化',
      '对话不全是"XX道"',
    ],
    taboos: [
      '禁止用更华丽的模板替代简单的模板',
      '禁止把口语改成书面语（破坏角色辨识度）',
    ],
    priority: 10,
    prompt: `你是"去模板腔"风格编辑。扫描文本，标记并改写以下问题：
1. 模板化过渡词（然而/事实上/值得一提的是/无独有偶...）
2. 翻译腔句式（"他不得不承认..." / "在某种意义上..." / "从某种程度上来说..."）
3. AI 空洞表达（"一种说不清道不明的感觉" / "眼神中闪过一丝复杂的神色"）
4. 排比句滥用（连续 3 个以上相同结构）
5. 对话引导词单调（全部用"XX道"）
输出：标记原句 + 自然改写建议`,
  },

  {
    id: 'continuity_guard',
    name: '连续性检查',
    category: 'audit',
    platforms: ['all'],
    description: '检查章节之间的连续性：人物位置、状态、时间线、伏笔是否衔接',
    inputFields: ['previous_chapter_summary', 'current_chapter', 'character_states', 'pending_foreshadowing'],
    outputFields: ['continuity_issues', 'location_conflicts', 'timeline_conflicts', 'state_conflicts'],
    checkpoints: [
      '人物位置是否连续（不能上一章在北境，本章瞬移到南宫）',
      '时间线是否推进合理',
      '角色状态是否衔接（受伤/升级/情绪）',
      '伏笔是否有提及或推进',
    ],
    taboos: [
      '禁止忽略上一章的未解决状态',
      '禁止时间线跳跃无说明',
    ],
    priority: 11,
    prompt: `你是连续性检查员。对比上一章状态和本章内容：
1. 人物位置：上一章在哪 → 本章在哪（是否合理）
2. 时间线：上次事件时间 → 本章时间（是否推进合理）
3. 角色状态：HP/情绪/能力/装备是否衔接
4. 伏笔：待回收伏笔在本章是否有推进
输出不连续之处及修正建议。`,
  },
];

// ==================== Skill 管理器 ====================

export class SkillLibraryV2 {
  private skills: SkillDef[];

  constructor(customSkills?: SkillDef[]) {
    this.skills = [...BUILTIN_SKILLS, ...(customSkills || [])];
  }

  getAll(): SkillDef[] {
    return this.skills;
  }

  getById(id: string): SkillDef | undefined {
    return this.skills.find(s => s.id === id);
  }

  getByCategory(category: SkillDef['category']): SkillDef[] {
    return this.skills.filter(s => s.category === category);
  }

  getByPlatform(platform: string): SkillDef[] {
    return this.skills.filter(s =>
      s.platforms.includes('all') || s.platforms.includes(platform)
    );
  }

  /**
   * 获取写作流水线所需的 Skill 序列
   * 根据平台返回推荐 Skill 组合
   */
  getPipeline(platform: string): SkillDef[] {
    const platformSkills = this.getByPlatform(platform);
    const structureFirst = platformSkills.filter(s => s.category === 'structure');
    const pacing = platformSkills.filter(s => s.category === 'pacing');
    const character = platformSkills.filter(s => s.category === 'character');
    const style = platformSkills.filter(s => s.category === 'style');

    // 按 priority 排序
    const all = [...structureFirst, ...pacing, ...character, ...style];
    all.sort((a, b) => a.priority - b.priority);

    return all;
  }

  /**
   * 生成注入 AI 的 SKILL 块
   */
  generateSkillPrompt(platform: string, selectedSkillIds?: string[]): string {
    let skills: SkillDef[];
    if (selectedSkillIds && selectedSkillIds.length > 0) {
      skills = selectedSkillIds
        .map(id => this.getById(id))
        .filter(Boolean) as SkillDef[];
    } else {
      skills = this.getPipeline(platform);
    }

    const blocks = skills.map(s => {
      const checkpoints = s.checkpoints.map(cp => `  - ${cp}`).join('\n');
      const taboos = s.taboos.map(t => `  - ${t}`).join('\n');
      return `## SKILL: ${s.name} (${s.id})
${s.description}

**检查点：**
${checkpoints}

**禁忌：**
${taboos}

**执行指令：**
${s.prompt}
`;
    });

    return blocks.join('\n---\n\n');
  }

  addSkill(skill: SkillDef): void {
    // 防止重复
    const existing = this.skills.findIndex(s => s.id === skill.id);
    if (existing >= 0) {
      this.skills[existing] = skill;
    } else {
      this.skills.push(skill);
    }
  }

  removeSkill(id: string): void {
    this.skills = this.skills.filter(s => s.id !== id);
  }
}

// 导出单例
export const skillLibraryV2 = new SkillLibraryV2();
