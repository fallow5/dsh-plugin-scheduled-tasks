import { createServer }    from 'node:http';
import { readFileSync }    from 'node:fs';
import { WebSocketServer } from 'ws';
import { fileURLToPath }   from 'node:url';
import { dirname, join }   from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(dir, '.env'), 'utf8').split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const PORT        = parseInt(env.PORT || '3000', 10);
const TOKEN       = env.TOKEN || '';
const ACCESS_PATH = (env.ACCESS_PATH || '').replace(/^\/+|\/+$/g, '');
const PUBLIC_URL  = env.PUBLIC_URL || `http://localhost:${PORT}/${ACCESS_PATH}`;

if (!TOKEN)       { console.error('[dsh-tunnel] ERROR: TOKEN is not set');       process.exit(1); }
if (!ACCESS_PATH) { console.error('[dsh-tunnel] ERROR: ACCESS_PATH is not set'); process.exit(1); }

console.log(`[dsh-tunnel] starting  port=${PORT}  path=/${ACCESS_PATH}  url=${PUBLIC_URL}`);

const PATH_PREFIX = `/${ACCESS_PATH}`;
const tunnelClients = new Map();
const pending       = new Map();

function forwardRequest(ws, req, res, forwardPath) {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    ws.send(JSON.stringify({
      type: 'request', requestId,
      method: req.method, path: forwardPath,
      headers: req.headers,
      body: Buffer.concat(chunks).toString('base64'),
    }));
    // API 请求（历史记录等大响应）用更长超时
    const timeoutMs = forwardPath.startsWith('/api/') ? 120000 : 30000;
    const timer = setTimeout(() => {
      if (!pending.has(requestId)) return;
      pending.delete(requestId);
      res.writeHead(504, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Gateway Timeout');
    }, timeoutMs);
    pending.set(requestId, { res, timer });
  });
  req.on('error', () => res.destroy());
}

const httpServer = createServer((req, res) => {
  const url = req.url ?? '/';

  // 健康检查：仅允许本机访问
  if (url === '/healthz') {
    const ip = req.socket.remoteAddress ?? '';
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, clients: tunnelClients.size, uptime: process.uptime() | 0 }));
    } else {
      res.writeHead(404); res.end();
    }
    return;
  }

  const [, ws] = [...tunnelClients.entries()][0] ?? [];

  // 带前缀的请求：剥离前缀再转发（主页面入口）
  if (url === PATH_PREFIX || url.startsWith(PATH_PREFIX + '/') || url.startsWith(PATH_PREFIX + '?')) {
    if (!ws) {
      res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('No tunnel client connected. Please enable the custom tunnel in dsh-bridge.');
      return;
    }
    const stripped = url.slice(PATH_PREFIX.length) || '/';
    forwardRequest(ws, req, res, stripped);
    return;
  }

  // 不带前缀的请求（/assets/xxx.js、/api/xxx 等）：
  // 仅在已有 tunnel client 时透传——浏览器加载页面资源必须走这条路
  // 无 client 时返回 404，不泄露服务存在
  if (!ws) {
    res.writeHead(404); res.end();
    return;
  }
  forwardRequest(ws, req, res, url);
});

// 控制通道 WebSocket（tunnel client 连进来的）
const wss = new WebSocketServer({ noServer: true });

// 浏览器 WebSocket 代理（/api/events.host 等）— 等待 tunnel client 的 ws-accept
const pendingWsUpgrades = new Map(); // wsId -> { socket, head, req }
const browserWsSockets  = new Map(); // wsId -> net.Socket (已升级)

httpServer.on('upgrade', (req, socket, head) => {
  const url = req.url ?? '/';

  // tunnel client 自己的控制通道
  if (url.startsWith('/connect')) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    return;
  }

  // 浏览器发来的 WebSocket 升级（如 /api/events.host）
  const [, tunnelWs] = [...tunnelClients.entries()][0] ?? [];
  if (!tunnelWs) { socket.destroy(); return; }

  // 剥前缀
  let forwardPath = url;
  if (url === PATH_PREFIX || url.startsWith(PATH_PREFIX + '/') || url.startsWith(PATH_PREFIX + '?')) {
    forwardPath = url.slice(PATH_PREFIX.length) || '/';
  }

  const wsId = `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  pendingWsUpgrades.set(wsId, { socket, head, req: { url: forwardPath, headers: req.headers } });

  tunnelWs.send(JSON.stringify({
    type: 'ws-open', wsId,
    path: forwardPath,
    headers: req.headers,
  }));

  // 超时清理
  setTimeout(() => {
    if (pendingWsUpgrades.has(wsId)) {
      pendingWsUpgrades.get(wsId).socket.destroy();
      pendingWsUpgrades.delete(wsId);
    }
  }, 10000);
});

wss.on('connection', (ws, req) => {
  const params = new URL(req.url, 'http://x').searchParams;
  if (params.get('token') !== TOKEN) { ws.close(4001, 'Unauthorized'); return; }

  const id = Math.random().toString(36).slice(2);
  tunnelClients.set(id, ws);
  console.log(`[dsh-tunnel] client connected  id=${id}  ip=${req.socket.remoteAddress}  total=${tunnelClients.size}`);
  ws.send(JSON.stringify({ type: 'ready', publicUrl: PUBLIC_URL }));

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw.toString());

      // HTTP 响应（非流式：一次性返回完整 body）
      if (msg.type === 'response') {
        const p = pending.get(msg.requestId);
        if (!p) return;
        clearTimeout(p.timer);
        pending.delete(msg.requestId);
        const HOP_BY_HOP = new Set(['transfer-encoding', 'connection', 'keep-alive', 'te', 'trailer', 'upgrade']);
        const headers = Object.fromEntries(
          Object.entries(msg.headers ?? {}).filter(([k]) => !HOP_BY_HOP.has(k.toLowerCase()))
        );
        p.res.writeHead(msg.statusCode ?? 502, headers);
        p.res.end(Buffer.from(msg.body || '', 'base64'));
        return;
      }

      // ── SSE 流式响应（response-start / response-chunk / response-end）──
      // 向后兼容：老客户端不发这三类消息，走上面的 response 路径不受影响。

      // 流式响应开始：写头，清除超时（SSE 长连接不设超时）
      if (msg.type === 'response-start') {
        const p = pending.get(msg.requestId);
        if (!p) return;
        clearTimeout(p.timer);
        p.timer = null;
        const HOP_BY_HOP = new Set(['transfer-encoding', 'connection', 'keep-alive', 'te', 'trailer', 'upgrade']);
        const headers = Object.fromEntries(
          Object.entries(msg.headers ?? {}).filter(([k]) => !HOP_BY_HOP.has(k.toLowerCase()))
        );
        p.res.writeHead(msg.statusCode ?? 200, headers);
        return;
      }

      // 流式响应 chunk：逐块写入
      if (msg.type === 'response-chunk') {
        const p = pending.get(msg.requestId);
        if (!p) return;
        p.res.write(Buffer.from(msg.body || '', 'base64'));
        return;
      }

      // 流式响应结束：end 并清理
      if (msg.type === 'response-end') {
        const p = pending.get(msg.requestId);
        if (!p) return;
        if (p.timer) clearTimeout(p.timer);
        pending.delete(msg.requestId);
        try { p.res.end(); } catch {}
        return;
      }

      // WebSocket 握手成功，完成升级并接管 socket
      if (msg.type === 'ws-accept') {
        const { wsId, replyHeaders, statusCode, statusMessage } = msg;
        const upgrade = pendingWsUpgrades.get(wsId);
        if (!upgrade) return;
        pendingWsUpgrades.delete(wsId);

        const { socket } = upgrade;
        // 使用隧道客户端传来的实际状态码（非 101 时浏览器能看到真实错误）
        const code = statusCode || 101;
        const reason = statusMessage || (code === 101 ? 'Switching Protocols' : '');
        const lines = [`HTTP/1.1 ${code} ${reason}`.trim()];
        for (const [k, v] of Object.entries(replyHeaders ?? {})) lines.push(`${k}: ${v}`);
        lines.push('', '');
        socket.write(lines.join('\r\n'));

        // 仅 101 时才接管为 WebSocket 隧道
        if (code === 101) {
          browserWsSockets.set(wsId, socket);
          socket.on('data', chunk => {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({ type: 'ws-frame', wsId, data: chunk.toString('base64') }));
            }
          });
          socket.on('close', () => {
            if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'ws-close', wsId }));
            browserWsSockets.delete(wsId);
          });
          socket.on('error', () => socket.destroy());
        } else {
          // 非 101：结束连接，不接管为 WebSocket
          socket.end();
        }
        return;
      }

      // WebSocket 数据帧（来自本地 DSH，转给浏览器）
      if (msg.type === 'ws-frame') {
        const sock = browserWsSockets.get(msg.wsId);
        if (sock && !sock.destroyed) sock.write(Buffer.from(msg.data, 'base64'));
        return;
      }

      // WebSocket 关闭
      if (msg.type === 'ws-close') {
        const sock = browserWsSockets.get(msg.wsId);
        if (sock) { sock.destroy(); browserWsSockets.delete(msg.wsId); }
        return;
      }

      if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
    } catch {}
  });

  ws.on('close', code => {
    tunnelClients.delete(id);
    // 清理所有挂在这个 client 上的 browser socket
    for (const [wsId, sock] of browserWsSockets) { sock.destroy(); browserWsSockets.delete(wsId); }
    // 清理所有流式/待响应的 HTTP 响应
    for (const [requestId, p] of pending) {
      if (p.timer) clearTimeout(p.timer);
      try { p.res.end(); } catch {}
    }
    pending.clear();
    console.log(`[dsh-tunnel] client disconnected  id=${id}  code=${code}  remaining=${tunnelClients.size}`);
  });
  ws.on('error', err => console.error(`[dsh-tunnel] client error id=${id}: ${err.message}`));
});

httpServer.on('error', err => { console.error('[dsh-tunnel] server error:', err.message); process.exit(1); });
httpServer.listen(PORT, '0.0.0.0', () => console.log('[dsh-tunnel] ready'));
['SIGTERM', 'SIGINT'].forEach(s => process.on(s, () => { httpServer.close(); process.exit(0); }));
