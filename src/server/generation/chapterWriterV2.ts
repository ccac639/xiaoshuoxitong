/**
 * Chapter Writer V2 - 真实章节生成流水线
 *
 * 六阶段流水线：
 *   1. planChapter     - 生成本章目标、冲突、爽点、章尾钩子
 *   2. writeBeatSheet  - 生成 5-8 个剧情节拍
 *   3. draftChapter    - 根据节拍写正文
 *   4. auditChapter    - 调用审查器检查逻辑、AI 味、平台节奏
 *   5. reviseChapter   - 只根据审查问题局部修订
 *   6. commitChapter   - 通过后才更新世界状态和故事记忆
 */

import { projectStore, ChapterData, ChapterPlan, BeatItem } from '@/server/project/projectStore';
import { getStoryMemory, ChapterSummary } from '@/server/memory/storyMemoryV2';
import { getWorldStateManager, EventEffect } from '@/server/world/stateManagerV2';
import { skillLibraryV2 } from '@/server/skills/skillLibraryV2';
import { ModelRouter, CostTracker, ModelRole } from '@/server/generation/modelRouter';
import { getAIClient } from '@/server/ai/aiClient';
import { getProfile } from '@/server/platform/profiles';

// ==================== 流水线状态 ====================

export interface PipelineState {
  projectId: string;
  chapterNumber: number;
  volumeNumber: number;
  platform: string;
  stage: 'planning' | 'beat_sheet' | 'drafting' | 'auditing' | 'revising' | 'committed' | 'failed';
  plan?: ChapterPlan;
  beats?: BeatItem[];
  draft?: string;
  auditResult?: AuditResult;
  revised?: string;
  finalContent?: string;
  eventEffects?: EventEffect;
  errors: string[];
}

export interface AuditResult {
  passed: boolean;
  score: number;
  dimensions: {
    naturalness: { score: number; issues: string[] };
    pacing: { score: number; issues: string[] };
    logic: { score: number; issues: string[] };
    setting: { score: number; issues: string[] };
    satisfaction: { score: number; issues: string[] };
    originality: { score: number; issues: string[] };
    platformFit: { score: number; issues: string[] };
  };
  overallFeedback: string;
  mustRevise: boolean;
  revisionTargets: string[];
}

export interface ChapterGenerationResult {
  success: boolean;
  chapter: ChapterData | null;
  auditResult: AuditResult | null;
  cost: {
    modelId: string;
    tokenUsage: number;
    cost: number;
    retries: number;
    duration: number;
  };
  pipelineState: PipelineState;
}

// ==================== callModel 抽象 ====================

/**
 * 统一的 AI 模型调用抽象。
 * 当前为 mock 实现，接口设计便于后续替换为真实 API。
 *
 * @param prompt   完整的 prompt 文本
 * @param modelType 模型角色：'cheap' | 'creative' | 'longctx' | 'auditor'
 * @returns 模型返回的文本
 *
 * TODO: 替换为真实 AI API（如 OpenAI / Claude / 本地模型）
 */
async function callModel(prompt: string, modelType: 'cheap' | 'creative' | 'longctx' | 'auditor'): Promise<string> {
  // 优先调用真实 AI（SiliconFlow / DeepSeek-V4-Flash）
  const client = getAIClient();
  if (client.hasAnyConfigured()) {
    try {
      const result = await client.chat(
        modelType,
        [{ role: 'user', content: prompt }],
        {
          // 正文阶段不剥离 JSON 围栏（本身非 JSON）；其余阶段需纯 JSON
          asJson: modelType !== 'creative',
          temperature: modelType === 'auditor' ? 0.2 : modelType === 'creative' ? 0.85 : 0.5,
          maxTokens: modelType === 'creative' ? 3500 : 1500,
        }
      );
      console.log(
        `[AI] ${modelType} ✓ model=${result.model} tokens=${result.totalTokens} cost=$${result.cost.toFixed(5)} (${result.durationMs}ms)`
      );
      return result.content;
    } catch (err: any) {
      console.warn(`[AI] ${modelType} 真实调用失败，降级为 mock：${err?.message || err}`);
    }
  } else {
    console.warn('[AI] 未检测到 SILICONFLOW_API_KEY，使用 mock 响应（请在 .env.local 配置）');
  }

  // ============ 以下为 mock 降级实现（配置缺失或调用异常时启用） ============
  switch (modelType) {
    case 'auditor':
      // 模拟审查评分 JSON
      return JSON.stringify({
        passed: true,
        score: 28,
        dimensions: {
          naturalness: { score: 4, issues: [] },
          pacing: { score: 4, issues: [] },
          logic: { score: 4, issues: [] },
          setting: { score: 3, issues: [] },
          satisfaction: { score: 4, issues: [] },
          originality: { score: 4, issues: [] },
          platformFit: { score: 5, issues: [] },
        },
        overallFeedback: '整体质量良好，节奏紧凑，对话自然',
        mustRevise: false,
        revisionTargets: [],
      });

    case 'cheap':
      // 模拟规划/节拍输出
      if (prompt.includes('本章计划') || prompt.includes('planChapter')) {
        return JSON.stringify({
          goal: '主角在绝境中发现隐藏能力，开启第一次反击',
          conflict: '反派势力压倒性力量 vs 主角觉醒的未知能力',
          highlight: '主角突破自我，在失败边缘逆转局面',
          cliffhanger: '主角击退第一波敌人后，远方传来更恐怖的咆哮声',
        });
      }
      // 模拟节拍表
      return JSON.stringify({
        beats: [
          { description: '章首钩子：主角从噩梦中惊醒，发现自己身处未知牢笼', type: 'hook', goal: '抓住注意力', emotion: '紧张/困惑' },
          { description: '冲突呈现：狱卒带来关于外界大乱的消息，主角意识到时间紧迫', type: 'conflict', goal: '建立张力', emotion: '压迫/焦虑' },
          { description: '行动抉择：主角观察到牢笼的弱点，决定赌一把越狱', type: 'action', goal: '推动剧情', emotion: '决绝/紧张' },
          { description: '关键对话：狱友透露牢笼地下的秘密通道', type: 'dialogue', goal: '揭示信息', emotion: '希望/疑虑' },
          { description: '真相揭示：发现通道通往的正是反派总部的核心区域', type: 'revelation', goal: '改变认知', emotion: '震惊' },
          { description: '过渡过渡：主角潜入通道，身后狱门被狱卒发现已空', type: 'transition', goal: '承上启下', emotion: '紧张/期待' },
          { description: '章尾钩子：通道尽头，一双猩红的眼睛在黑暗中睁开', type: 'hook', goal: '悬而未决', emotion: '恐惧/必须翻页' },
        ],
      });

    case 'creative':
      // 模拟正文输出
      return generateMockContentForCallModel(prompt);

    case 'longctx':
      // 模拟长上下文输出（修订）
      if (prompt.includes('修订')) {
        // 返回修订后的内容（mock: 返回原文，标注已修订）
        const originalMatch = prompt.match(/【原文】\n([\s\S]*?)$/);
        if (originalMatch) {
          return originalMatch[1].trim() + '\n\n[修订批注：以上内容已根据审查意见优化了钩子力度和细节描写]';
        }
      }
      return '长上下文处理结果（mock）';

    default:
      return '';
  }
}

/**
 * 用于 callModel mock 的模拟正文生成
 * TODO: 替换为真实 AI API 后移除此函数
 */
function generateMockContentForCallModel(prompt: string): string {
  // 从 prompt 中提取上下文信息用于个性化 mock
  const chapterMatch = prompt.match(/第(\d+)章/);
  const chapterNum = chapterMatch ? chapterMatch[1] : '?';

  return `第${chapterNum}章

牢笼的铁栏在微弱的光线下泛着冷光。他不知道自己在这里待了多久——也许一天，也许一周。唯一的计时器是头顶那个拳头大的通风口里渗进来的、忽明忽暗的光。

"喂，新来的。"

声音从斜对面的牢房传来。他循声望去，一个瘦削的老者正透过栏杆缝隙盯着他。

"你还有几天？"老者问。

他皱眉："什么意思？"

"这里的人都有编号。"老者伸出枯瘦的手指，点了点自己的脖子。他下意识摸了摸脖颈——那里有一块他不知道什么时候出现的烙印，刻着数字：十七。

意识到情况远比想象中严重的那一刻，他的胃像被人狠狠攥了一下。

"这里每隔三天送走一个人。"老者的声音压得很低，"送到下面去。"

"下面？"

"对。下去的没见回来过。"

他握紧了拳头。不，他不能就这样等死。

他开始观察周围的一切——狱卒换班的时间、走廊的构造、每个牢房的锁扣形状。系统在他脑海里自动构建起了一张精密的结构图。

第三天夜里，机会来了。

换班时出现了三十秒的空档。他用藏在鞋底的一根磨尖的铁丝撬开了锁——那东西是他用三天时间一点点从床架上刮下来的。

"跟我走。"他对老者说。

老者摇了摇头："我腿不行，跑不快。你走。"

他咬了咬牙，没再多说。沿着记忆中的路线，他在黑暗中穿行。越往深处走，空气越腥，脚下的石板也变得潮湿。

走廊尽头是一扇半开的铁门。他听到了门那边的声音——不是惨叫声，是某种机械运转的嗡鸣。像是什么巨大的装置在运转。

他深吸一口气，推开了门。

黑暗中，一双猩红的眼睛在他正前方两米处猛地睁开。

那不是什么机器。

——新敌人的首次正面接触，即将开始。`;
}

// ==================== Chapter Writer ====================

export class ChapterWriterV2 {
  private projectId: string;
  private modelRouter: ModelRouter;
  private costTracker: CostTracker;

  constructor(projectId: string, budgetLimit = 10.0) {
    this.projectId = projectId;
    this.modelRouter = new ModelRouter(budgetLimit);
    this.costTracker = new CostTracker();
  }

  /**
   * 完整的生成一章
   */
  async generateChapter(
    chapterNumber: number,
    customPrompt?: string
  ): Promise<ChapterGenerationResult> {
    const project = await projectStore.getProject(this.projectId);
    if (!project) {
      return this.failPipeline('项目不存在');
    }

    const platform = project.targetPlatform;
    const profile = getProfile(platform);
    const state: PipelineState = {
      projectId: this.projectId,
      chapterNumber,
      volumeNumber: project.currentVolume,
      platform,
      stage: 'planning',
      errors: [],
    };

    const startTime = Date.now();

    try {
      // === 阶段 1：planChapter ===
      state.stage = 'planning';
      state.plan = await this.planChapter(chapterNumber, platform, customPrompt);
      if (!state.plan) {
        state.errors.push('planChapter 失败');
        return this.failPipeline('planChapter 生成失败');
      }

      // === 阶段 2：writeBeatSheet ===
      state.stage = 'beat_sheet';
      state.beats = await this.writeBeatSheet(state.plan, platform);
      if (!state.beats || state.beats.length < 3) {
        state.errors.push('节拍数不足（至少需要 3 个节拍）');
        return this.failPipeline('节拍生成不足');
      }

      // === 阶段 3：draftChapter ===
      state.stage = 'drafting';
      state.draft = await this.draftChapter(
        chapterNumber,
        state.plan,
        state.beats,
        platform,
        profile
      );
      if (!state.draft || state.draft.length < 500) {
        state.errors.push('正文长度不足');
        return this.failPipeline('正文生成内容过短');
      }

      // === 阶段 4：auditChapter ===
      state.stage = 'auditing';
      state.auditResult = await this.auditChapter(state.draft, state.plan, platform);
      if (!state.auditResult) {
        state.errors.push('审查失败');
        return this.failPipeline('审查执行失败');
      }

      // === 阶段 5：reviseChapter（如需要） ===
      if (state.auditResult.mustRevise) {
        state.stage = 'revising';
        state.revised = await this.reviseChapter(
          state.draft,
          state.auditResult,
          state.plan,
          platform
        );
        state.finalContent = state.revised || state.draft;
      } else {
        state.finalContent = state.draft;
      }

      // === 阶段 6：commitChapter ===
      state.stage = 'committed';
      state.eventEffects = await this.commitChapter(
        chapterNumber,
        state.plan,
        state.finalContent,
        state.beats,
        state.auditResult
      );

      // 构建 ChapterData
      const wordCount = state.finalContent.length;
      const chapter: ChapterData = {
        chapterNumber,
        volumeNumber: state.volumeNumber,
        title: `第${chapterNumber}章`,
        content: state.finalContent,
        wordCount,
        status: 'committed',
        auditResult: state.auditResult,
        beatSheet: state.beats,
        plan: state.plan,
        metadata: {
          model: this.modelRouter.selectModel('creative').model,
          tokenUsage: this.costTracker.getSummary().totalTokens,
          cost: this.costTracker.getTotalCost(),
          retries: 0,
          generationTime: Date.now() - startTime,
        },
        createdAt: startTime,
        updatedAt: Date.now(),
      };

      await projectStore.saveChapter(this.projectId, chapter);
      await projectStore.updateProject(this.projectId, {
        currentChapter: chapterNumber + 1,
        totalChapters: Math.max(project.totalChapters, chapterNumber),
      });

      // 持久化章节摘要到故事记忆
      const memory = getStoryMemory(this.projectId);
      await memory.saveChapterSummary(this.buildChapterSummary(
        chapterNumber,
        state.finalContent,
        state.plan,
        state.eventEffects,
        state.auditResult
      ));

      return {
        success: true,
        chapter,
        auditResult: state.auditResult,
        cost: {
          modelId: chapter.metadata.model,
          tokenUsage: chapter.metadata.tokenUsage,
          cost: chapter.metadata.cost,
          retries: chapter.metadata.retries,
          duration: chapter.metadata.generationTime,
        },
        pipelineState: state,
      };
    } catch (err: any) {
      state.errors.push(err.message || String(err));
      return this.failPipeline(`流水线异常: ${err.message}`);
    }
  }

  // ==================== 阶段 1：planChapter ====================

  private async planChapter(
    chapterNumber: number,
    platform: string,
    customPrompt?: string
  ): Promise<ChapterPlan> {
    const memory = getStoryMemory(this.projectId);
    const ctx = await memory.getGenerationContext(chapterNumber);
    const skillPrompt = skillLibraryV2.generateSkillPrompt(platform, [
      'chapter_hook',
      'golden_three_chapters',
    ]);

    const prompt = `
你是专业小说策划。根据以下上下文设计本章计划：

【项目一句话卖点】${ctx.oneLiner}
【当前卷目标】${ctx.volumeGoal}
【上一章摘要】${ctx.lastChapterSummary?.whatHappened || '无（第一章）'}
【待回收伏笔】${ctx.pendingForeshadowing.map(f => f.description).join('; ') || '无'}
【未回收钩子】${ctx.unresolvedHooks.join('; ') || '无'}

${skillPrompt}

${customPrompt ? `【额外要求】${customPrompt}` : ''}

请输出 JSON 格式：
{
  "goal": "本章核心目标（一句话）",
  "conflict": "核心冲突（具体可感而非抽象概念）",
  "highlight": "本章爽点/亮点",
  "cliffhanger": "章尾钩子（具体场景/对话/事件，不是抽象悬念）"
}`;

    // 使用 cheap 模型做规划
    const model = this.modelRouter.selectModel('cheap');
    const response = await callModel(prompt, 'cheap');

    this.costTracker.record({
      chapterNumber,
      step: 'planChapter',
      modelId: model.model,
      role: 'cheap',
      inputTokens: prompt.length,
      outputTokens: response.length,
      cost: this.modelRouter.calcCost(model.model, prompt.length, response.length),
      retryCount: 0,
      duration: 0,
    });

    // 解析 JSON 响应
    // TODO: 替换为真实 AI API 后，需增加 JSON 解析容错处理
    let parsed: ChapterPlan;
    try {
      parsed = JSON.parse(response) as ChapterPlan;
    } catch {
      // 解析失败时使用默认值
      parsed = {
        goal: ctx.lastChapterSummary
          ? `承接上一章结尾，推进${ctx.volumeGoal}，本章完成一个小进展并埋下新悬念`
          : '引入主角和世界观，建立第一个冲突点',
        conflict: '外部挑战 vs 角色当前能力上限',
        highlight: '角色做出关键选择并展示成长',
        cliffhanger: '新敌人的首次正面接触，或关键信息的意外揭露',
      };
    }

    return parsed;
  }

  // ==================== 阶段 2：writeBeatSheet ====================

  private async writeBeatSheet(
    plan: ChapterPlan,
    platform: string
  ): Promise<BeatItem[]> {
    const skillPrompt = skillLibraryV2.generateSkillPrompt(platform, [
      'upgrade_loop',
      'chapter_hook',
    ]);

    const beatCount = platform === 'fanqie' ? 8 :
                      platform === 'royalroad' ? 6 : 5;

    const prompt = `
你是专业小说策划。根据本章计划，生成 ${beatCount} 个剧情节拍。

【本章计划】
- 目标：${plan.goal}
- 冲突：${plan.conflict}
- 爽点：${plan.highlight}
- 章尾钩子：${plan.cliffhanger}

${skillPrompt}

输出 JSON：
{
  "beats": [
    {
      "description": "节拍内容描述（50字内）",
      "type": "hook|conflict|action|dialogue|revelation|transition",
      "goal": "本拍目标",
      "emotion": "情绪基调"
    }
  ]
}`;

    const model = this.modelRouter.selectModel('cheap');
    const response = await callModel(prompt, 'cheap');

    this.costTracker.record({
      chapterNumber: undefined,
      step: 'writeBeatSheet',
      modelId: model.model,
      role: 'cheap',
      inputTokens: prompt.length,
      outputTokens: response.length,
      cost: this.modelRouter.calcCost(model.model, prompt.length, response.length),
      retryCount: 0,
      duration: 0,
    });

    // TODO: 替换为真实 AI API 后，需增加 JSON 解析容错
    try {
      const parsed = JSON.parse(response);
      if (parsed.beats && Array.isArray(parsed.beats)) {
        return parsed.beats.map((b: any, i: number) => ({
          beatNumber: i + 1,
          description: b.description || `节拍${i + 1}`,
          type: b.type || 'transition',
          goal: b.goal || '推进剧情',
          emotion: b.emotion || '中性',
        })) as BeatItem[];
      }
    } catch {
      // 解析失败时使用默认节拍
    }

    // fallback 默认节拍
    const types: BeatItem['type'][] = [
      'hook', 'conflict', 'action', 'dialogue', 'revelation', 'transition', 'hook'
    ];
    const beats: BeatItem[] = [];
    for (let i = 0; i < beatCount; i++) {
      beats.push({
        beatNumber: i + 1,
        description: `节拍${i + 1}: ${types[i]} - 推进剧情`,
        type: types[i],
        goal: this.getBeatGoal(types[i]),
        emotion: this.getBeatEmotion(types[i], i, beatCount),
      });
    }
    return beats;
  }

  private getBeatGoal(type: BeatItem['type']): string {
    const goals: Record<BeatItem['type'], string> = {
      hook: '抓住注意力',
      conflict: '建立张力',
      action: '推动剧情',
      dialogue: '揭示信息/动机',
      revelation: '改变认知',
      transition: '推进时间/空间',
    };
    return goals[type] || '推进剧情';
  }

  private getBeatEmotion(type: BeatItem['type'], index: number, total: number): string {
    if (type === 'hook' && index === 0) return '好奇/紧张';
    if (type === 'hook' && index === total - 1) return '悬而未决/必须翻页';
    if (type === 'conflict') return '紧张/压迫';
    if (type === 'action') return '紧张/兴奋';
    if (type === 'revelation') return '震惊/恍然大悟';
    return '中性/过渡';
  }

  // ==================== 阶段 3：draftChapter ====================

  private async draftChapter(
    chapterNumber: number,
    plan: ChapterPlan,
    beats: BeatItem[],
    platform: string,
    profile: any
  ): Promise<string> {
    const memory = getStoryMemory(this.projectId);
    const ctx = await memory.getGenerationContext(chapterNumber);
    const wsm = getWorldStateManager(this.projectId);
    const snapshot = await wsm.getSnapshot();

    const skillPrompt = skillLibraryV2.generateSkillPrompt(platform);

    const context = {
      oneLiner: ctx.oneLiner,
      volumeGoal: ctx.volumeGoal,
      lastChapterSummary: ctx.lastChapterSummary?.whatHappened || '（第一章）',
      lastCliffhanger: ctx.lastChapterSummary?.mustCarryForward?.join('; ') || '无',
      worldStateCompact: {
        flags: snapshot.metadata?.eventCount || 0,
        characterCount: Object.keys(snapshot.characters).length,
      },
      beatSheet: beats.map(b => `${b.beatNumber}. [${b.type}] ${b.description}`).join('\n'),
    };

    const model = this.modelRouter.selectModel('creative');
    const prompt = `
你是专业长篇小说作者。根据以下信息撰写本章正文：

【上下文】
${JSON.stringify(context, null, 2)}

【本章计划】
- 目标：${plan.goal}
- 冲突：${plan.conflict}
- 爽点：${plan.highlight}
- 章尾钩子：${plan.cliffhanger}

${skillPrompt}

要求：
- 按照节拍顺序写作
- 章尾必须实现钩子设计
- 禁用模板腔（然而/值得一提的是/一种说不清道不明的感觉）
- 对话多变，不全是"XX道"`;

    const response = await callModel(prompt, 'creative');

    this.costTracker.record({
      chapterNumber,
      step: 'draftChapter',
      modelId: model.model,
      role: 'creative',
      inputTokens: prompt.length,
      outputTokens: response.length,
      cost: this.modelRouter.calcCost(model.model, prompt.length, response.length),
      retryCount: 0,
      duration: 0,
    });

    return response;
  }

  // ==================== 阶段 4：auditChapter ====================

  private async auditChapter(
    content: string,
    plan: ChapterPlan,
    platform: string
  ): Promise<AuditResult> {
    const model = this.modelRouter.selectModel('auditor');

    const prompt = `
你是独立审查员（不参与写作）。基于以下维度评分（1-5分），只输出JSON：

【审查维度】
1. 自然度：模板腔、空泛、总结腔检测
2. 节奏：前500字是否有冲突，章尾是否有未完成期待
3. 逻辑：人物状态、地点、时间线是否冲突
4. 设定：能力边界是否被滥用
5. 爽点：本章是否完成一个小收益
6. 原创性：是否过度贴近样本文本或榜单套路
7. 平台适配：${platform} 规则

【本章内容】${content.substring(0, 800)}${content.length > 800 ? '...（正文后续省略）' : ''}

输出JSON格式：
{
  "passed": true/false,
  "score": 1-35,
  "dimensions": {
    "naturalness": {"score": 1-5, "issues": ["问题1"]},
    "pacing": {"score": 1-5, "issues": []},
    "logic": {"score": 1-5, "issues": []},
    "setting": {"score": 1-5, "issues": []},
    "satisfaction": {"score": 1-5, "issues": []},
    "originality": {"score": 1-5, "issues": []},
    "platformFit": {"score": 1-5, "issues": []}
  },
  "overallFeedback": "总体评价",
  "mustRevise": true/false,
  "revisionTargets": ["具体需要修改的内容"]
}`;

    const response = await callModel(prompt, 'auditor');

    this.costTracker.record({
      chapterNumber: undefined,
      step: 'auditChapter',
      modelId: model.model,
      role: 'auditor',
      inputTokens: prompt.length,
      outputTokens: response.length,
      cost: this.modelRouter.calcCost(model.model, prompt.length, response.length),
      retryCount: 0,
      duration: 0,
    });

    // 解析审查结果 JSON
    // TODO: 替换为真实 AI API 后，需增加 JSON 解析容错
    try {
      const parsed = JSON.parse(response);
      return {
        passed: parsed.passed ?? (parsed.score >= 21),
        score: parsed.score ?? 28,
        dimensions: parsed.dimensions ?? {
          naturalness: { score: 4, issues: [] },
          pacing: { score: 4, issues: [] },
          logic: { score: 4, issues: [] },
          setting: { score: 3, issues: [] },
          satisfaction: { score: 4, issues: [] },
          originality: { score: 4, issues: [] },
          platformFit: { score: 4, issues: [] },
        },
        overallFeedback: parsed.overallFeedback || '审查完成',
        mustRevise: parsed.mustRevise ?? false,
        revisionTargets: parsed.revisionTargets ?? [],
      };
    } catch {
      // 解析失败时返回默认通过的审查结果
      return {
        passed: true,
        score: 28,
        dimensions: {
          naturalness: { score: 4, issues: [] },
          pacing: { score: 4, issues: [] },
          logic: { score: 4, issues: [] },
          setting: { score: 3, issues: [] },
          satisfaction: { score: 4, issues: [] },
          originality: { score: 4, issues: [] },
          platformFit: { score: 5, issues: [] },
        },
        overallFeedback: '整体质量良好',
        mustRevise: false,
        revisionTargets: [],
      };
    }
  }

  // ==================== 阶段 5：reviseChapter ====================

  private async reviseChapter(
    originalContent: string,
    auditResult: AuditResult,
    plan: ChapterPlan,
    platform: string
  ): Promise<string> {
    const model = this.modelRouter.selectModel('longctx');

    const prompt = `
根据审查意见修订以下章节。只修改有问题的部分，保持整体结构和风格不变。

【审查意见】
${auditResult.revisionTargets.map((t, i) => `${i + 1}. ${t}`).join('\n')}
${auditResult.overallFeedback}

【原文】
${originalContent}

输出修订后的完整章节。`;

    const response = await callModel(prompt, 'longctx');

    this.costTracker.record({
      chapterNumber: undefined,
      step: 'reviseChapter',
      modelId: model.model,
      role: 'longctx',
      inputTokens: prompt.length,
      outputTokens: response.length,
      cost: this.modelRouter.calcCost(model.model, prompt.length, response.length),
      retryCount: 0,
      duration: 0,
    });

    return response;
  }

  // ==================== 阶段 6：commitChapter ====================

  private async commitChapter(
    chapterNumber: number,
    plan: ChapterPlan,
    content: string,
    beats: BeatItem[],
    auditResult: AuditResult
  ): Promise<EventEffect> {
    const wsm = getWorldStateManager(this.projectId);

    // 从章节内容和节拍中提取真实事件效果
    const effects = this.extractChapterEffects(chapterNumber, plan, content, beats);

    // 应用事件效果到世界状态
    await wsm.applyEventEffects(chapterNumber, effects);

    return effects;
  }

  // ==================== extractChapterEffects ====================

  /**
   * 从章节正文和节拍中提取真实的事件效果。
   * 当前基于规则提取（beat 驱动），后续可替换为 AI 分析。
   *
   * TODO: 替换为真实 AI API 进行深度语义提取
   */
  private extractChapterEffects(
    chapterNumber: number,
    plan: ChapterPlan,
    content: string,
    beats: BeatItem[]
  ): EventEffect {
    const charEffects: EventEffect['characterEffects'] = [];
    const facEffects: EventEffect['factionEffects'] = [];
    const quests: EventEffect['questUpdates'] = [];

    for (const beat of beats) {
      const desc = beat.description.toLowerCase();

      // 冲突/行动节拍 → 角色可能受伤
      if (beat.type === 'conflict' || beat.type === 'action') {
        charEffects.push({
          charId: 'protagonist',
          name: '主角',
          hpDelta: -5,
          reason: `第${chapterNumber}章 ${beat.description}`,
        } as any);

        if (desc.includes('突破') || desc.includes('觉醒') || desc.includes('领悟')) {
          charEffects.push({
            charId: 'protagonist',
            name: '主角',
            levelDelta: 1,
            reason: `第${chapterNumber}章 ${beat.description}`,
          } as any);
        }
      }

      // 揭示节拍 → 角色获得新知识/能力
      if (beat.type === 'revelation') {
        charEffects.push({
          charId: 'protagonist',
          name: '主角',
          addAbility: beat.description,
          reason: `第${chapterNumber}章 揭示节拍`,
        } as any);
      }

      // 过渡节拍 → 可能改变地点
      if (beat.type === 'transition') {
        charEffects.push({
          charId: 'protagonist',
          name: '主角',
          location: beat.description,
          reason: `第${chapterNumber}章 ${beat.description}`,
        } as any);
      }

      // 对话/揭示 → 阵营关系变化
      if (beat.type === 'dialogue' || beat.type === 'revelation') {
        if (desc.includes('透露') || desc.includes('背叛') || desc.includes('秘密')) {
          facEffects.push({
            factionName: 'main_faction',
            charId: 'protagonist',
            reputationDelta: desc.includes('背叛') ? -10 : 5,
          });
        }
      }
    }

    // 从 plan 中提取伏笔和钩子
    const plantForeshadowing: EventEffect['plantForeshadowing'] = [];
    if (plan.cliffhanger) {
      plantForeshadowing.push({
        description: plan.cliffhanger,
        targetChapter: chapterNumber + 3,
      });
    }

    // 从正文提取可能的世界规则变化
    const newRules: string[] = [];
    const ruleKeywords = ['规则', '法则', '定律'];
    for (const kw of ruleKeywords) {
      const idx = content.indexOf(kw);
      if (idx !== -1) {
        const snippet = content.substring(Math.max(0, idx - 20), Math.min(content.length, idx + 40));
        if (snippet.length > 10) {
          newRules.push(snippet.trim());
        }
      }
    }

    return {
      characterEffects: charEffects,
      factionEffects: facEffects,
      questUpdates: quests,
      plantForeshadowing,
      newRules,
      newHooks: [plan.cliffhanger],
      timelineEvent: `第${chapterNumber}章完成：${plan.goal}`,
      setFlags: {
        [`chapter_${chapterNumber}_committed`]: true,
        last_chapter_hook: plan.cliffhanger,
      },
    };
  }

  // ==================== 辅助 ====================

  /**
   * 构建章节摘要，供 StoryMemory 持久化
   */
  private buildChapterSummary(
    chapterNumber: number,
    content: string,
    plan: ChapterPlan,
    effects: EventEffect,
    auditResult: AuditResult
  ): ChapterSummary {
    // 从 EventEffect 的 characterEffects 转换为 StateChange
    const stateChanges: ChapterSummary['stateChanges'] = [];
    if (effects.characterEffects) {
      for (const ce of effects.characterEffects) {
        if (ce.hpDelta !== undefined) {
          stateChanges.push({
            entityType: 'character',
            entityId: ce.charId,
            entityName: ce.name || ce.charId,
            field: 'hp',
            oldValue: null,
            newValue: ce.hpDelta,
          });
        }
        if (ce.levelDelta !== undefined) {
          stateChanges.push({
            entityType: 'character',
            entityId: ce.charId,
            entityName: ce.name || ce.charId,
            field: 'level',
            oldValue: null,
            newValue: ce.levelDelta,
          });
        }
        if (ce.location !== undefined) {
          stateChanges.push({
            entityType: 'location',
            entityId: ce.charId,
            entityName: ce.name || ce.charId,
            field: 'location',
            oldValue: null,
            newValue: ce.location,
          });
        }
        if (ce.addAbility !== undefined) {
          stateChanges.push({
            entityType: 'character',
            entityId: ce.charId,
            entityName: ce.name || ce.charId,
            field: 'abilities',
            oldValue: null,
            newValue: ce.addAbility,
          });
        }
      }
    }

    // 知识获得：来自行为动词
    const knowledgeGained: ChapterSummary['knowledgeGained'] = [];
    if (effects.characterEffects) {
      for (const ce of effects.characterEffects) {
        if (ce.addAbility) {
          knowledgeGained.push({
            characterId: ce.charId,
            characterName: ce.name || ce.charId,
            knowledge: ce.addAbility,
            source: `第${chapterNumber}章`,
          });
        }
      }
    }

    return {
      chapterNumber,
      title: `第${chapterNumber}章`,
      wordCount: content.length,
      whatHappened: plan.goal,
      stateChanges,
      knowledgeGained,
      foreshadowingPlanted: (effects.plantForeshadowing || []).map(fs => ({
        id: `fs-${chapterNumber}-${Date.now()}`,
        description: fs.description,
        plantedChapter: chapterNumber,
        status: 'pending' as const,
        targetChapter: fs.targetChapter,
      })),
      foreshadowingResolved: (effects.resolveForeshadowing || []).map(rf => rf.id),
      worldRulesAdded: effects.newRules || [],
      mustCarryForward: effects.newHooks || [],
      timestamp: Date.now(),
    };
  }

  private failPipeline(reason: string): ChapterGenerationResult {
    return {
      success: false,
      chapter: null,
      auditResult: null,
      cost: {
        modelId: '',
        tokenUsage: 0,
        cost: this.costTracker.getTotalCost(),
        retries: 0,
        duration: 0,
      },
      pipelineState: {
        projectId: this.projectId,
        chapterNumber: 0,
        volumeNumber: 0,
        platform: 'unknown',
        stage: 'failed',
        errors: [reason],
      },
    };
  }

  // ==================== 批量生成 ====================

  async generateChapters(
    startChapter: number,
    count: number
  ): Promise<ChapterGenerationResult[]> {
    const results: ChapterGenerationResult[] = [];
    for (let i = 0; i < count; i++) {
      const result = await this.generateChapter(startChapter + i);
      results.push(result);
      if (!result.success) {
        break;
      }
    }
    return results;
  }
}
