/**
 * 统一 AI 接口代理（/api/xiaoshuo）
 *
 * 把所有平台的模型收敛到「一个接口」调用：
 *   - 路径别名：  POST /api/xiaoshuo/SFV4-Flash
 *   - body 别名： POST /api/xiaoshuo/   body: { "model": "orHy3", "prompt": "..." }
 *
 * 别名规则（详见 modelRouter.MODEL_ALIASES，大小写/空格/连字符不敏感）：
 *   SFV4-Flash / deepseekv4flash / siliconflow      → deepseek-ai/DeepSeek-V4-Flash（SiliconFlow）
 *   siliconflowpro / v4pro                          → deepseek-ai/DeepSeek-V4-Pro（SiliconFlow）
 *   glm / glm47 / zhipu                             → glm-4.7-flash（智谱，免费）
 *   orHy3 / hy3 / or                                → tencent/hy3:free（OpenRouter，免费）
 *   orqwen3 / qwen                                  → qwen/qwen3-coder:free（OpenRouter，免费）
 *
 * 入参（OpenAI 兼容风格）：
 *   model     : 模型别名或完整模型名（路径已带则忽略）
 *   messages  : [{role:'system'|'user'|'assistant', content:'...'}]（与 prompt 二选一）
 *   prompt    : 单行用户输入（自动补成 user 消息）
 *   system    : 系统提示（配合 prompt 使用）
 *   temperature / maxTokens / asJson / thinking / timeoutMs : 可选调参
 *
 * 返回：{ ok, alias, model, provider, content, usage, cost, durationMs }
 */

import { NextResponse } from 'next/server';
import { getAIClient, ChatMessage } from '../ai/aiClient';
import { resolveModelAlias, listAliases } from './modelRouter';

export async function handleXiaoshuo(
  req: Request,
  pathAlias?: string
): Promise<Response> {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // ---- 1. 解析模型别名 ----
  const aliasInput = String(pathAlias ?? body.model ?? '').trim();
  if (!aliasInput) {
    return NextResponse.json(
      {
        ok: false,
        error:
          '缺少模型参数。请在路径或 body 中提供 model，例如：\n' +
          '  POST /api/xiaoshuo/orHy3\n' +
          '  POST /api/xiaoshuo/  body={"model":"qwen","prompt":"你好"}',
        available: listAliases(),
      },
      { status: 400 }
    );
  }

  const modelId = resolveModelAlias(aliasInput);
  if (!modelId) {
    return NextResponse.json(
      {
        ok: false,
        error: `未知模型别名: "${aliasInput}"`,
        available: listAliases(),
      },
      { status: 404 }
    );
  }

  // ---- 2. 解析对话内容 ----
  let messages: ChatMessage[];
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    messages = body.messages.map((m: any) => ({
      role:
        m.role === 'system' || m.role === 'assistant' ? m.role : 'user',
      content: String(m.content ?? ''),
    }));
  } else {
    const prompt = body.prompt ?? body.content ?? body.text ?? '';
    messages = [];
    if (body.system) {
      messages.push({ role: 'system', content: String(body.system) });
    }
    messages.push({ role: 'user', content: String(prompt) });
  }

  const last = messages[messages.length - 1];
  if (!messages.length || !last || !last.content.trim()) {
    return NextResponse.json(
      { ok: false, error: '缺少对话内容（messages 或 prompt）' },
      { status: 400 }
    );
  }

  // ---- 3. 调参 ----
  const client = getAIClient();
  const opts = {
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
    maxTokens: typeof body.maxTokens === 'number' ? body.maxTokens : 2000,
    asJson: !!body.asJson,
    thinking: !!body.thinking,
    timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : 300_000,
  };

  // ---- 4. 调用并回包 ----
  try {
    const result = await client.chatWithModel(modelId, messages, opts);
    return NextResponse.json({
      ok: true,
      alias: aliasInput,
      model: result.model,
      provider: result.provider,
      content: result.content,
      usage: {
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
        total_tokens: result.totalTokens,
      },
      cost: result.cost,
      durationMs: result.durationMs,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        alias: aliasInput,
        error: err?.message ?? String(err),
      },
      { status: 502 }
    );
  }
}
