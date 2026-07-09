/**
 * 统一 AI 客户端（多 Provider）
 *
 * 支持通过 OpenAI 兼容协议调用多个 AI 平台：
 *   - SiliconFlow（DeepSeek-V4-Flash 等）
 *   - 智谱 BigModel（GLM-4.7-Flash 等）
 *   - OpenRouter（聚合多厂商，含 tencent/hy3:free、qwen3 系列免费国内模型）
 *
 * 重要：GLM-4.7-Flash / tencent/hy3 等推理模型默认开启思考链，会把整个
 * max_tokens 预算花在 reasoning 上导致 content 为空。本客户端默认关闭思考
 * （thinking:false），按 provider 注入对应关闭参数，保证正文/JSON 稳定产出。
 *
 * 由 ModelRouter 根据 ModelRole 选择模型，客户端根据 config.provider 自动路由到对应 endpoint。
 *
 * 环境变量：
 *   SILICONFLOW_API_KEY    SiliconFlow 控制台获取的 API Key
 *   SILICONFLOW_BASE_URL   默认 https://api.siliconflow.cn/v1
 *   ZHIPU_API_KEY          智谱开放平台获取的 API Key
 *   ZHIPU_BASE_URL         默认 https://open.bigmodel.cn/api/paas/v4
 *   OPENROUTER_API_KEY     OpenRouter 控制台获取的 API Key
 *   OPENROUTER_BASE_URL    默认 https://openrouter.ai/api/v1
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
  openrouter: {
    name: 'OpenRouter',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, ''),
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
  /**
   * 是否开启模型思考/推理链。
   * - 默认 false：关闭思考（推理模型如 GLM-4.7-Flash / tencent-hy3 关闭后才会产出正文，否则整段 token 被思考链吃掉，content 为空）
   * - 设为 true 可打开思考（适合审计/长线一致性等分析型任务，但会消耗更多 token 且需更长超时）
   */
  thinking?: boolean;
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
   * 发起一次对话补全（按角色路由到对应模型）
   * @param modelType 模型角色（决定路由到哪个模型 / 成本）
   * @param messages 对话消息
   * @param opts 可选参数
   */
  async chat(
    modelType: ModelRole,
    messages: ChatMessage[],
    opts: ChatOptions = {}
  ): Promise<ChatResult> {
    const cfg = this.router.selectModel(modelType);
    return this.callProvider(cfg, messages, opts);
  }

  /**
   * 按注册表模型 id 直接调用（统一接口 /api/xiaoshuo 用）
   * 不经过角色路由，精准指定要用的模型。
   */
  async chatWithModel(
    modelId: string,
    messages: ChatMessage[],
    opts: ChatOptions = {}
  ): Promise<ChatResult> {
    const cfg = this.router.getModel(modelId);
    if (!cfg) {
      throw new Error(`未知模型 id: ${modelId}（可用模型见 /api/xiaoshuo GET）`);
    }
    return this.callProvider(cfg, messages, opts);
  }

  /**
   * 实际发起 Provider 请求（chat / chatWithModel 共用）
   */
  private async callProvider(
    cfg: ModelConfig,
    messages: ChatMessage[],
    opts: ChatOptions
  ): Promise<ChatResult> {
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
      // 构建请求体；推理模型默认关闭思考，否则 content 为空
      const body: Record<string, any> = {
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? cfg.maxTokens,
        stream: false,
      };

      // 按 provider 注入「关闭思考」参数（仅当 thinking 未显式开启时）
      if (opts.thinking !== true) {
        if (cfg.provider === 'zhipu') {
          // 智谱 GLM 系列：thinking.type=disabled 才会直出正文
          body.thinking = { type: 'disabled' };
        } else if (cfg.provider === 'openrouter') {
          // OpenRouter 上的推理模型（如 tencent/hy3）通过 chat_template_kwargs 关思考
          body.chat_template_kwargs = { enable_thinking: false };
        }
      }

      const res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify(body),
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
