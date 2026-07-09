/**
 * Model Router - 模型路由层
 *
 * 四种模型角色：
 * - cheap:    清洗、摘要、标签、风格卡提取
 * - longctx:  读大纲、检查长线一致性
 * - creative: 正文初稿和关键高潮章
 * - auditor:  独立审查，不参与写作
 */

export type ModelRole = 'cheap' | 'longctx' | 'creative' | 'auditor';

export interface ModelConfig {
  provider: string;
  model: string;
  role: ModelRole;
  maxTokens: number;
  contextWindow: number;
  costPer1kInput: number;   // USD
  costPer1kOutput: number;  // USD
  id?: string;              // 注册表 key（由下方循环注入），成本计算优先用它精确命中
}

// ==================== 模型配置 ====================

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  // ============ 智谱 GLM 系列（OpenAI 兼容，baseURL: open.bigmodel.cn/api/paas/v4）============
  // GLM-4.7-Flash：免费模型，200K 上下文，适合个人版全角色统一使用
  'glm-4.7-flash': {
    provider: 'zhipu',
    model: 'glm-4.7-flash',
    role: 'cheap',
    maxTokens: 8192,
    contextWindow: 200_000,
    costPer1kInput: 0,       // 免费
    costPer1kOutput: 0,      // 免费
  },

  // ============ OpenRouter 免费国内模型（OpenAI 兼容，baseURL: openrouter.ai/api/v1）============
  // 以下模型在 OpenRouter 上均标注 free（prompt/completion 计费为 0）
  // tencent/hy3：腾讯混元 Hy3，262K 上下文，推理与生成能力强，适合长线一致性/正文
  'tencent-hy3-free': {
    provider: 'openrouter',
    model: 'tencent/hy3:free',
    role: 'longctx',
    maxTokens: 8192,
    contextWindow: 262_144,
    costPer1kInput: 0,       // 免费
    costPer1kOutput: 0,      // 免费
  },
  // qwen/qwen3-next-80b-a3b-instruct：阿里通义千问，262K 上下文，通用指令遵循好，适合清洗/审计
  'qwen3-next-80b-free': {
    provider: 'openrouter',
    model: 'qwen/qwen3-next-80b-a3b-instruct:free',
    role: 'cheap',
    maxTokens: 8192,
    contextWindow: 262_144,
    costPer1kInput: 0,       // 免费
    costPer1kOutput: 0,      // 免费
  },
  // qwen/qwen3-coder：阿里通义千问 Coder，1M 上下文，超长上下文适合读大纲/长线一致性
  'qwen3-coder-free': {
    provider: 'openrouter',
    model: 'qwen/qwen3-coder:free',
    role: 'longctx',
    maxTokens: 8192,
    contextWindow: 1_048_576,
    costPer1kInput: 0,       // 免费
    costPer1kOutput: 0,      // 免费
  },

  // ============ SiliconFlow DeepSeek 系列（OpenAI 兼容，baseURL: api.siliconflow.cn/v1）============
  // DeepSeek-V4-Flash：个人版主力备选（免费档已验证可用）
  'deepseek-v4-flash': {
    provider: 'siliconflow',
    model: 'deepseek-ai/DeepSeek-V4-Flash',
    role: 'cheap',
    maxTokens: 8192,
    contextWindow: 128000,
    costPer1kInput: 0.0001, // TODO: 以 SiliconFlow 控制台实际报价校准
    costPer1kOutput: 0.0001,
  },

  // ============ 移动云 MoMA / MaaS（OpenAI 兼容，baseURL: zhenze-huhehaote.cmecloud.cn/v1）============
  // DeepSeek-V4-Flash：移动云赠送 2500万 tokens 体验额度（免费），标准 OpenAI 兼容 Bearer 调用。
  // 网关按需加载模型，冷启动首次请求可能 404（AIClient 已对 moma 做 404 重试）。
  'moma-deepseek-v4-flash': {
    provider: 'moma',
    model: 'deepseek-v4-flash',
    role: 'creative',
    maxTokens: 8192,
    contextWindow: 128000,
    costPer1kInput: 0,   // 免费额度
    costPer1kOutput: 0,  // 免费额度
  },
  // DeepSeek-V4-Pro：SiliconFlow 上的 pro 档（质量更高，付费）
  'deepseek-v4-pro': {
    provider: 'siliconflow',
    model: 'deepseek-ai/DeepSeek-V4-Pro',
    role: 'creative',
    maxTokens: 8192,
    contextWindow: 128000,
    costPer1kInput: 0.0005, // TODO: 以 SiliconFlow 控制台实际报价校准
    costPer1kOutput: 0.0015,
  },

  // cheap - 摘要/清洗/标签
  'deepseek-v3': {
    provider: 'deepseek',
    model: 'deepseek-chat',
    role: 'cheap',
    maxTokens: 4096,
    contextWindow: 65536,
    costPer1kInput: 0.00027,
    costPer1kOutput: 0.0011,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    role: 'cheap',
    maxTokens: 4096,
    contextWindow: 128000,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
  },

  // longctx - 长上下文一致性
  'deepseek-r1': {
    provider: 'deepseek',
    model: 'deepseek-reasoner',
    role: 'longctx',
    maxTokens: 8192,
    contextWindow: 65536,
    costPer1kInput: 0.00055,
    costPer1kOutput: 0.00219,
  },
  'claude-sonnet': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    role: 'longctx',
    maxTokens: 8192,
    contextWindow: 200000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },

  // creative - 正文初稿/高潮章
  'claude-opus': {
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    role: 'creative',
    maxTokens: 4096,
    contextWindow: 200000,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
  },
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    role: 'creative',
    maxTokens: 4096,
    contextWindow: 128000,
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
  },
  'deepseek-v3-creative': {
    provider: 'deepseek',
    model: 'deepseek-chat',
    role: 'creative',
    maxTokens: 4096,
    contextWindow: 65536,
    costPer1kInput: 0.00027,
    costPer1kOutput: 0.0011,
  },

  // auditor - 独立审查
  'gpt-4o-auditor': {
    provider: 'openai',
    model: 'gpt-4o',
    role: 'auditor',
    maxTokens: 2048,
    contextWindow: 128000,
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
  },
};

// 注入注册表 key 作为 id，供成本计算精确命中，
// 避免 model 名与 key 重名导致的歧义（例：moma 的 model 名 deepseek-v4-flash 与 siliconflow 的 key 冲突）
for (const [id, cfg] of Object.entries(MODEL_REGISTRY)) {
  cfg.id = id;
}

// ==================== 模型路由器 ====================

export class ModelRouter {
  private budgetLimit: number; // USD
  private spentSoFar: number;

  constructor(budgetLimit = 10.0) {
    this.budgetLimit = budgetLimit;
    this.spentSoFar = 0;
  }

  /**
   * 根据角色选择模型
   */
  selectModel(role: ModelRole, preferModel?: string): ModelConfig {
    if (preferModel && MODEL_REGISTRY[preferModel]) {
      return MODEL_REGISTRY[preferModel];
    }

    // 默认选择（个人版优先使用免费国内模型：智谱 GLM-4.7-Flash 稳定直出 + OpenRouter 腾讯混元辅助）
    // 注：OpenRouter 上 qwen3 系列免费模型上游常限流，故不作为默认；tencent/hy3 经关闭思考后可稳定产出
    const defaults: Record<ModelRole, string> = {
      cheap: 'glm-4.7-flash',          // 智谱免费，清洗/摘要（稳定直出）
      longctx: 'tencent-hy3-free',     // OpenRouter 腾讯混元免费，262K（短分析输出可用）
      creative: 'glm-4.7-flash',       // 智谱免费，正文初稿（推理模型长文易空，故用 GLM）
      auditor: 'glm-4.7-flash',        // 智谱免费，独立审查
    };

    return MODEL_REGISTRY[defaults[role]];
  }

  /**
   * 按注册表 id 直接取模型配置（统一接口 /api/xiaoshuo 用）
   */
  getModel(modelId: string): ModelConfig | undefined {
    return MODEL_REGISTRY[modelId];
  }

  /**
   * 计算 Token 成本
   */
  calcCost(modelId: string, inputTokens: number, outputTokens: number): number {
    // 同时支持短名（'deepseek-v4-flash'）与模型全名（'deepseek-ai/DeepSeek-V4-Flash'）
    const config =
      MODEL_REGISTRY[modelId] ||
      Object.values(MODEL_REGISTRY).find((c) => c.model === modelId);
    if (!config) return 0;

    return (
      (inputTokens / 1000) * config.costPer1kInput +
      (outputTokens / 1000) * config.costPer1kOutput
    );
  }

  /**
   * 检查预算
   */
  checkBudget(estimatedCost: number): boolean {
    return this.spentSoFar + estimatedCost <= this.budgetLimit;
  }

  /**
   * 记录消费
   */
  recordSpending(cost: number): void {
    this.spentSoFar += cost;
  }

  getRemainingBudget(): number {
    return this.budgetLimit - this.spentSoFar;
  }
}

// ==================== 成本追踪器 ====================

export interface CostRecord {
  timestamp: number;
  chapterNumber?: number;
  step: string;
  modelId: string;
  role: ModelRole;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  retryCount: number;
  duration: number; // ms
}

export class CostTracker {
  private records: CostRecord[] = [];

  record(entry: Omit<CostRecord, 'timestamp'>): void {
    this.records.push({ ...entry, timestamp: Date.now() });
  }

  getChapterCost(chapterNumber: number): CostRecord[] {
    return this.records.filter(r => r.chapterNumber === chapterNumber);
  }

  getTotalCost(): number {
    return this.records.reduce((sum, r) => sum + r.cost, 0);
  }

  getCostByRole(): Record<string, number> {
    const byRole: Record<string, number> = {};
    for (const r of this.records) {
      byRole[r.role] = (byRole[r.role] || 0) + r.cost;
    }
    return byRole;
  }

  getSummary(): {
    totalCost: number;
    totalTokens: number;
    chapterCount: number;
    byRole: Record<string, number>;
    records: CostRecord[];
  } {
    return {
      totalCost: this.getTotalCost(),
      totalTokens: this.records.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0),
      chapterCount: new Set(this.records.map(r => r.chapterNumber).filter(Boolean)).size,
      byRole: this.getCostByRole(),
      records: this.records,
    };
  }

  clear(): void {
    this.records = [];
  }
}

// ==================== 统一接口别名（/api/xiaoshuo 用）====================
// 用户只需记短别名，即可通过统一接口调用任意平台模型。
// 输入会被统一归一化（小写 + 去除空格/连字符/下划线/点/斜杠）后匹配，
// 故 SFV4-Flash / sfv4flash / deepseekv4flash 等价；亦支持传完整模型名/注册表 id。

export const MODEL_ALIASES: Record<string, string> = {
  // ---- SiliconFlow / DeepSeek ----
  'sfv4flash': 'deepseek-v4-flash',
  'deepseekv4flash': 'deepseek-v4-flash',
  'dsv4flash': 'deepseek-v4-flash',
  'sf': 'deepseek-v4-flash',                 // siliconflow 简写 → flash
  'siliconflow': 'deepseek-v4-flash',
  'siliconflowflash': 'deepseek-v4-flash',
  'v4flash': 'deepseek-v4-flash',
  'sfv4pro': 'deepseek-v4-pro',
  'deepseekv4pro': 'deepseek-v4-pro',
  'siliconflowpro': 'deepseek-v4-pro',
  'v4pro': 'deepseek-v4-pro',
  'dsv4pro': 'deepseek-v4-pro',

  // ---- 智谱 GLM ----
  'glm': 'glm-4.7-flash',
  'glm47': 'glm-4.7-flash',
  'glm47flash': 'glm-4.7-flash',
  'zhipu': 'glm-4.7-flash',
  'zhipuglm': 'glm-4.7-flash',

  // ---- OpenRouter 免费国内 ----
  'orhy3': 'tencent-hy3-free',
  'hy3': 'tencent-hy3-free',
  'or': 'tencent-hy3-free',                  // 仅 "or" → 默认 OpenRouter 免费（腾讯混元）
  'orqwen3': 'qwen3-coder-free',
  'qwen': 'qwen3-coder-free',                // 用户指定：qwen → OpenRouter qwen3-coder:free
  'qwen3': 'qwen3-coder-free',
  'qwen3coder': 'qwen3-coder-free',
  'orqwen3next': 'qwen3-next-80b-free',
  'qwen3next': 'qwen3-next-80b-free',

  // ---- 移动云 MoMA（免费 2500万 tokens 额度）----
  'moma': 'moma-deepseek-v4-flash',          // 核心别名
  'momav4': 'moma-deepseek-v4-flash',
  'momaflash': 'moma-deepseek-v4-flash',
  'momadeepseek': 'moma-deepseek-v4-flash',
  'momads': 'moma-deepseek-v4-flash',
};

function normalizeAlias(input: string): string {
  return input.trim().toLowerCase().replace(/[\s_\-./]+/g, '');
}

/**
 * 将用户别名 / 模型全名 / 注册表 id 解析为注册表 key；解析失败返回 null
 */
export function resolveModelAlias(input: string): string | null {
  if (!input) return null;
  const key = normalizeAlias(input);
  if (MODEL_REGISTRY[key]) return key;          // 直接命中注册表 key
  if (MODEL_ALIASES[key]) return MODEL_ALIASES[key]; // 别名命中
  for (const id of Object.keys(MODEL_REGISTRY)) {    // 归一化后命中（支持传完整模型名 / 注册表 id）
    if (normalizeAlias(id) === key) return id;
    if (normalizeAlias(MODEL_REGISTRY[id].model) === key) return id; // 支持传完整模型名（如 deepseek-ai/DeepSeek-V4-Flash）
  }
  return null;
}

/** 列出所有可用别名（供 /api/xiaoshuo GET 发现） */
export function listAliases(): { alias: string; model: string; provider: string }[] {
  return Object.entries(MODEL_ALIASES).map(([alias, modelId]) => ({
    alias,
    model: MODEL_REGISTRY[modelId]?.model ?? modelId,
    provider: MODEL_REGISTRY[modelId]?.provider ?? '',
  }));
}
