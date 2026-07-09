/**
 * 统一 AI 客户端（多 Provider）
 *
 * 支持通过 OpenAI 兼容协议调用多个 AI 平台：
 *   - SiliconFlow（DeepSeek-V4-Flash 等）
 *   - 智谱 BigModel（GLM-4.7-Flash 等）
 *
 * 由 ModelRouter 根据 ModelRole 选择模型，客户端根据 config.provider 自动路由到对应 endpoint。
 *
 * 环境变量：
 *   SILICONFLOW_API_KEY    SiliconFlow 控制台获取的 API Key
 *   SILICONFLOW_BASE_URL   默认 https://api.siliconflow.cn/v1
 *   ZHIPU_API_KEY          智谱开放平台获取的 API Key
 *   ZHIPU_BASE_URL         默认 https://open.bigmodel.cn/api/paas/v4
 */

import { ModelRouter, ModelRole, ModelConfig } from '../generation/modelRouter';

// ==================== Provider 配置 ====================

interface ProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  siliconflow: {
    name: 'SiliconFlow',
    apiKey: process.env.SILICONFLOW_API_KEY || '',
    baseUrl: (process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1').replace(/\/+$/, ''),
  },
  zhipu: {
    name: '智谱 BigModel',
    apiKey: process.env.ZHIPU_API_KEY || '',
    baseUrl: (process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/+$/, ''),
  },
};

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** 返回前剥离 ```json 围栏，输出纯 JSON 文本（写作流各阶段要求 JSON） */
  asJson?: boolean;
  timeoutMs?: number;
}

export interface ChatResult {
  content: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  durationMs: number;
}

/**
 * 去掉 ```json ... ``` 或 ``` ... ``` 围栏。
 * 若文本未包裹围栏则原样返回（对纯正文文本无害）。
 */
export function stripJsonFences(text: string): string {
  let t = text.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) t = fence[1].trim();
  return t;
}

// ==================== 统一 AI 客户端 ====================

export class AIClient {
  private router = new ModelRouter();

  /**
   * 检查指定 provider 是否已配置
   */
  isProviderConfigured(provider: string): boolean {
    const p = PROVIDERS[provider];
    return !!(p && p.apiKey);
  }

  /** 检查是否有任意一个 provider 可用 */
  hasAnyConfigured(): boolean {
    return Object.values(PROVIDERS).some((p) => !!p.apiKey);
  }

  /**
   * 发起一次对话补全（自动路由到对应 Provider）
   * @param modelType 模型角色（决定路由到哪个模型 / 成本）
   * @param messages 对话消息
   * @param opts 可选参数
   */
  async chat(
    modelType: ModelRole,
    messages: ChatMessage[],
    opts: ChatOptions = {}
  ): Promise<ChatResult> {
    const cfg: ModelConfig = this.router.selectModel(modelType);
    const provider = PROVIDERS[cfg.provider];

    if (!provider) {
      throw new Error(`未知的 provider: ${cfg.provider}（已注册: ${Object.keys(PROVIDERS).join(', ')}）`);
    }
    if (!provider.apiKey) {
      throw new Error(
        `${provider.name} 未配置 API Key（请在 .env.local 中设置 ${cfg.provider.toUpperCase()}_API_KEY）`
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 300_000);
    const t0 = Date.now();

    let data: any;
    try {
      const res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxTokens ?? cfg.maxTokens,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`${provider.name} HTTP ${res.status}: ${errText.slice(0, 400)}`);
      }
      data = await res.json();
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(`${provider.name} 请求超时（>${Math.round((opts.timeoutMs ?? 300_000) / 1000)}s）`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    let content: string = data?.choices?.[0]?.message?.content ?? '';
    if (opts.asJson) content = stripJsonFences(content);

    const usage = data?.usage ?? {};
    const promptTokens = Number(usage.prompt_tokens ?? 0);
    const completionTokens = Number(usage.completion_tokens ?? 0);
    const cost = this.router.calcCost(cfg.model, promptTokens, completionTokens);

    return {
      content,
      model: cfg.model,
      provider: provider.name,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      cost,
      durationMs: Date.now() - t0,
    };
  }
}

// ==================== 向后兼容：SiliconFlowClient 别名 ====================

/** @deprecated 使用 AIClient 替代（多 Provider 统一入口） */
export class SiliconFlowClient extends AIClient {
  constructor() {
    super();
  }
}

let _client: AIClient | null = null;

/** 获取单例客户端 */
export function getAIClient(): AIClient {
  if (!_client) _client = new AIClient();
  return _client;
}
