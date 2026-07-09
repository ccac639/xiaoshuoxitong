/**
 * SiliconFlow AI 客户端
 *
 * 基于 OpenAI 兼容协议调用 SiliconFlow 平台（https://api.siliconflow.cn/v1）。
 * 个人版 AI Novel OS 默认使用 deepseek-ai/DeepSeek-V4-Flash 作为统一模型，
 * 通过 ModelRouter 进行角色路由与成本追踪。
 *
 * 环境变量：
 *   SILICONFLOW_API_KEY   必填，SiliconFlow 控制台获取的 API Key
 *   SILICONFLOW_BASE_URL  可选，默认 https://api.siliconflow.cn/v1
 */

import { ModelRouter, ModelRole, ModelConfig } from '../generation/modelRouter';

const BASE_URL = (process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1').replace(/\/+$/, '');
const API_KEY = process.env.SILICONFLOW_API_KEY || '';

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

/**
 * SiliconFlow 客户端（OpenAI 兼容 chat/completions）
 */
export class SiliconFlowClient {
  private router = new ModelRouter();

  /** 是否已配置 API Key */
  isConfigured(): boolean {
    return !!API_KEY;
  }

  /**
   * 发起一次对话补全
   * @param modelType 模型角色（决定路由到哪个模型 / 成本）
   * @param messages 对话消息
   * @param opts 可选参数
   */
  async chat(
    modelType: ModelRole,
    messages: ChatMessage[],
    opts: ChatOptions = {}
  ): Promise<ChatResult> {
    if (!API_KEY) {
      throw new Error('SILICONFLOW_API_KEY 未配置（请在 .env.local 中设置）');
    }

    const cfg: ModelConfig = this.router.selectModel(modelType);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 300_000);
    const t0 = Date.now();

    let data: any;
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
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
        throw new Error(`SiliconFlow HTTP ${res.status}: ${errText.slice(0, 400)}`);
      }
      data = await res.json();
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('SiliconFlow 请求超时（>300s）');
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
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      cost,
      durationMs: Date.now() - t0,
    };
  }
}

let _client: SiliconFlowClient | null = null;

/** 获取单例客户端 */
export function getAIClient(): SiliconFlowClient {
  if (!_client) _client = new SiliconFlowClient();
  return _client;
}
