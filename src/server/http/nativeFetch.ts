/**
 * 原生 HTTP 客户端（绕过 Next.js 运行时对 fetch / node:https 的 patch）
 *
 * 背景：Next.js dev 运行时会 patch 全局 fetch 与 node:https 的响应体处理。
 * 实测该 patch 在处理移动云 MoMA 的中文响应体时破坏了字节，导致内容出现 U+FFFD
 * 替换符（独立 `node` 脚本下完全正常）。即便改用原生 node:https 直接请求，只要仍
 * 处于 Next 运行时内，字节依旧被损坏。
 *
 * 解决：把真实 HTTP 请求放到【独立的 node 子进程】执行（nativeFetchWorker.cjs），
 * 该进程不加载 Next 运行时，node:https 表现与独立脚本一致。body 以 base64 在父子
 * 进程间传输，彻底隔离编码歧义。
 *
 * 韧性：若解码后文本仍含 U+FFFD（某些网络环境下响应体被间歇性损坏），自动重试。
 *
 * 职责边界：本层只做「HTTP 传输 + 返回 UTF-8 文本」，不承担 Prompt / Skill /
 * Memory / Event 等逻辑（那些属于 v2 架构的其他层）。未来 FastAPI 接管后端后，
 * 本文件与 worker 可直接删除。
 */

import { spawn } from 'node:child_process';
import path from 'node:path';

export interface NativeResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  /** 已解压的响应体文本（UTF-8） */
  body: string;
}

export interface NativeRequestOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  /** 检测到 U+FFFD（响应体被损坏）时的额外重试次数，默认 1 */
  retryOnCorrupt?: number;
}

function resolveWorkerPath(): string {
  // dev server / 生产均从项目根启动，故按 cwd 解析 worker 位置
  return path.join(process.cwd(), 'src/server/http/nativeFetchWorker.cjs');
}

function oneShot(
  url: string,
  headers: Record<string, string>,
  jsonBody: string,
  opts: NativeRequestOptions
): Promise<NativeResponse> {
  return new Promise((resolve, reject) => {
    const workerPath = resolveWorkerPath();
    const child = spawn(process.execPath, [workerPath], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    let stdout = '';
    child.stdout.on('data', (c: Buffer) => {
      stdout += c.toString('utf-8');
    });

    child.on('error', (e: any) => reject(e));

    child.on('close', (code) => {
      if (!stdout) {
        reject(new Error(`nativeFetch worker 异常退出（code=${code}）`));
        return;
      }
      try {
        const out = JSON.parse(stdout);
        if (out.error) {
          reject(new Error(out.error));
          return;
        }
        const body = Buffer.from(out.bodyB64 || '', 'base64').toString('utf-8');
        resolve({ status: out.status, headers: {}, body });
      } catch (e: any) {
        reject(new Error('nativeFetch 解析 worker 输出失败：' + (e?.message ?? e)));
      }
    });

    if (opts.signal) {
      if (opts.signal.aborted) {
        child.kill();
        return;
      }
      opts.signal.addEventListener('abort', () => child.kill(), { once: true });
    }

    child.stdin.write(
      JSON.stringify({
        url,
        headers,
        body: jsonBody,
        timeoutMs: opts.timeoutMs ?? 300_000,
      })
    );
    child.stdin.end();
  });
}

/**
 * 在独立 node 子进程中发送 JSON POST 请求，返回已解压的响应文本。
 * 若响应体含 U+FFFD（损坏），按 retryOnCorrupt 自动重试。
 */
export async function nativePostJson(
  url: string,
  headers: Record<string, string>,
  jsonBody: string,
  opts: NativeRequestOptions = {}
): Promise<NativeResponse> {
  const retries = opts.retryOnCorrupt && opts.retryOnCorrupt > 0 ? opts.retryOnCorrupt : 1;
  let last: NativeResponse | null = null;
  for (let i = 0; i <= retries; i++) {
    const r = await oneShot(url, headers, jsonBody, opts);
    if (!r.body.includes('�')) return r;
    last = r; // 检测到损坏字符，重试
  }
  return last as NativeResponse;
}
