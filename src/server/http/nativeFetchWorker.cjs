/**
 * nativeFetchWorker.cjs —— 独立 Node 子进程，执行真实 HTTP 请求。
 *
 * 为何需要它：Next.js dev 运行时会 patch 全局 fetch / node:https 的响应体处理，
 * 导致移动云 MoMA 的中文响应字节被损坏（出现 U+FFFD）。在 Next 运行时【之外】启动
 * 一个干净的 node 进程执行请求，即可复现独立 `node` 脚本下的正常表现。
 *
 * 协议（stdin -> stdout，全部 UTF-8 JSON）：
 *   stdin : {"url","headers","body","timeoutMs"}
 *   stdout: {"status":N,"bodyB64":"..."}   或  {"error":"..."}
 * body 以 base64 传输，彻底隔离编码歧义。本进程不输出任何额外日志。
 */
'use strict';
const https = require('node:https');
const http = require('node:http');
const zlib = require('node:zlib');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
  });
}

async function main() {
  let req;
  try {
    req = JSON.parse(await readStdin());
  } catch (e) {
    process.stdout.write(JSON.stringify({ status: 0, error: 'bad stdin json' }));
    return;
  }
  const { url, headers = {}, body = '', timeoutMs = 300000 } = req;
  let u;
  try {
    u = new URL(url);
  } catch (e) {
    process.stdout.write(JSON.stringify({ status: 0, error: 'bad url' }));
    return;
  }

  const lib = u.protocol === 'http:' ? http : https;
  // 强制 identity：避免服务端返回 gzip（Next 会在解压时损坏）
  const finalHeaders = { 'Accept-Encoding': 'identity', ...headers };

  const r = lib.request(
    url,
    {
      method: 'POST',
      headers: { ...finalHeaders, 'Content-Length': Buffer.byteLength(body) },
    },
    (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(Buffer.from(c)));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const ce = res.headers['content-encoding'] || '';
        let text = buf.toString('utf-8');
        try {
          if (ce.includes('gzip')) text = zlib.gunzipSync(buf).toString('utf-8');
          else if (ce.includes('deflate')) text = zlib.inflateSync(buf).toString('utf-8');
          else if (ce.includes('br')) text = zlib.brotliDecompressSync(buf).toString('utf-8');
        } catch {
          text = buf.toString('utf-8');
        }
        process.stdout.write(
          JSON.stringify({ status: res.statusCode || 0, bodyB64: Buffer.from(text, 'utf-8').toString('base64') })
        );
      });
    }
  );

  r.on('error', (e) => process.stdout.write(JSON.stringify({ status: 0, error: String((e && e.message) || e) })));
  r.setTimeout(timeoutMs, () => r.destroy(new Error('timeout')));
  r.write(body);
  r.end();
}

main();
