import http from 'node:http';
import { fetchSubscription, deduplicateNames } from './fetch.js';
import { parseLines } from './parser.js';
import { buildConfig, toYaml } from './builder.js';

interface ServerOptions {
  url: string;
  port: number;
  intervalMin: number;
  ruleMode: 'builtin' | 'external';
}

interface CacheEntry {
  yaml: string;
  nodeCount: number;
  updatedAt: number;
}

export const startServer = async (opts: ServerOptions): Promise<http.Server> => {
  let cache: CacheEntry | null = null;
  let refreshError: string | null = null;
  let refreshing = false;

  const refresh = async (): Promise<{ skipped: boolean }> => {
    if (refreshing) {
      console.log(`  ⏭️  刷新已在进行中，跳过`);
      return { skipped: true };
    }
    refreshing = true;
    try {
      console.log(`[${new Date().toLocaleTimeString()}] 🔄 刷新订阅...`);
      const lines = await fetchSubscription(opts.url);
      const nodes = parseLines(lines);
      deduplicateNames(nodes);
      const config = buildConfig(nodes, opts.ruleMode);
      const yaml = toYaml(config);
      cache = { yaml, nodeCount: nodes.length, updatedAt: Date.now() };
      refreshError = null;
      console.log(`  ✅ 刷新成功 — ${nodes.length} 个节点`);
      return { skipped: false };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      refreshError = msg;
      if (cache) {
        console.warn(`  ⚠️  刷新失败，保留上次缓存: ${msg}`);
        return { skipped: false };
      } else {
        console.error(`  ❌ 首次拉取失败: ${msg}`);
        throw err;
      }
    } finally {
      refreshing = false;
    }
  };

  console.log('🔗 首次拉取订阅...');
  await refresh();
  console.log(`📡 启动 HTTP 服务，每 ${opts.intervalMin} 分钟自动刷新\n`);

  const refreshTimer = setInterval(() => { refresh().catch(() => {}); }, opts.intervalMin * 60_000);

  const server = http.createServer((req, res) => {
    const pathname = req.url ? new URL(req.url, 'http://127.0.0.1').pathname : '/';
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (pathname === '/clash.yaml') {
      if (!cache) { res.writeHead(503); res.end('Service unavailable'); return; }
      res.writeHead(200, { 'Content-Type': 'text/yaml; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(cache.yaml);
    } else if (pathname === '/health') {
      const now = Date.now();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        status: cache ? 'ok' : 'initializing',
        nodes: cache?.nodeCount ?? 0,
        updatedAt: cache?.updatedAt ? new Date(cache.updatedAt).toISOString() : null,
        nextRefreshMin: cache?.updatedAt ? Math.max(0, opts.intervalMin - Math.floor((now - cache.updatedAt) / 60_000)) : opts.intervalMin,
        lastError: refreshError,
      }));
    } else if (pathname === '/refresh') {
      if (req.method !== 'POST') { res.writeHead(405); res.end('Method Not Allowed'); return; }
      refresh()
        .then(({ skipped }) => { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ ok: true, skipped, nodes: cache?.nodeCount ?? 0 })); })
        .catch(() => { res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ ok: false, error: 'Refresh failed' })); });
    } else {
      res.writeHead(404); res.end('Not Found');
    }
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      const msg = `端口 ${opts.port} 已被占用，请使用其他端口`;
      server.close();
      throw new Error(msg);
    }
    throw err;
  });
  // CLI 模式通过 index.ts 注册 SIGINT/SIGTERM

  server.listen(opts.port, '127.0.0.1', () => {
    console.log(`┌──────────────────────────────────────┐`);
    console.log(`│  JMS Convert Service                 │`);
    console.log(`│                                      │`);
    console.log(`│  Clash 订阅:  http://127.0.0.1:${String(opts.port).padEnd(5)}│`);
    console.log(`│              /clash.yaml             │`);
    console.log(`│                                      │`);
    console.log(`│  健康检查:    http://127.0.0.1:${String(opts.port).padEnd(5)}│`);
    console.log(`│              /health                 │`);
    console.log(`└──────────────────────────────────────┘`);
  });

  return server;
};
