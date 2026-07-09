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
}

// ==================== 模型配置 ====================

const MODEL_REGISTRY: Record<string, ModelConfig> = {
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

    // 默认选择
    const defaults: Record<ModelRole, string> = {
      cheap: 'deepseek-v3',
      longctx: 'claude-sonnet',
      creative: 'deepseek-v3-creative',
      auditor: 'gpt-4o-auditor',
    };

    return MODEL_REGISTRY[defaults[role]];
  }

  /**
   * 计算 Token 成本
   */
  calcCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const config = MODEL_REGISTRY[modelId];
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
