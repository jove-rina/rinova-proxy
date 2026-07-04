import http from 'node:http';
import { fetchSubscription, deduplicateNames } from './fetch.js';
import { parseLines } from './parser.js';
import { buildConfig, toYaml } from './builder.js';
import { t } from './i18n.js';

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
      console.log(`  ⏭️  ${t('refresh_skip')}`);
      return { skipped: true };
    }
    refreshing = true;
    try {
      console.log(`[${new Date().toLocaleTimeString()}] 🔄 ${t('refreshing')}`);
      const lines = await fetchSubscription(opts.url);
      const nodes = parseLines(lines);
      deduplicateNames(nodes);
      const config = buildConfig(nodes, opts.ruleMode);
      const yaml = toYaml(config);
      cache = { yaml, nodeCount: nodes.length, updatedAt: Date.now() };
      refreshError = null;
      console.log(`  ✅ ${t('refresh_ok', { count: nodes.length })}`);
      return { skipped: false };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      refreshError = msg;
      if (cache) {
        console.warn(`  ⚠️  ${t('refresh_fail', { msg })}`);
        return { skipped: false };
      } else {
        console.error(`  ❌ ${t('first_fetch_fail', { msg })}`);
        throw err;
      }
    } finally {
      refreshing = false;
    }
  };

  console.log(`🔗 ${t('refreshing')}`);
  await refresh();
  console.log(`📡 ${t('http_start', { interval: opts.intervalMin })}\n`);

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
      const msg = t('port_in_use', { port: opts.port });
      server.close();
      throw new Error(msg);
    }
    throw err;
  });

  server.listen(opts.port, '127.0.0.1', () => {
    const base = `http://127.0.0.1:${opts.port}`;
    const C = {
      rst: '\x1b[0m', b: '\x1b[1m', d: '\x1b[2m',
      // Gradient for title: green → cyan → blue
      g1: '\x1b[38;5;82m',  g2: '\x1b[38;5;83m',  g3: '\x1b[38;5;84m',
      c1: '\x1b[38;5;87m',  c2: '\x1b[38;5;117m', c3: '\x1b[38;5;153m',
      // Neon border
      n1: '\x1b[38;5;51m',  n2: '\x1b[38;5;45m',
      // Accents
      y: '\x1b[38;5;228m', w: '\x1b[38;5;255m', dim: '\x1b[38;5;245m',
    };
    // Glowing title: each letter group a different shade
    const title = `${C.b}${C.g1}R${C.g2}I${C.g3}N${C.c1}O${C.c2}V${C.c3}A${C.rst}${C.d}  ${t('server_title')}${C.rst}`;
    console.log(`\n${C.n2}╔══════════════════════════════════════════════════╗${C.rst}`);
    console.log(`${C.n2}║${C.rst}  ${title}            ${C.n2}║${C.rst}`);
    console.log(`${C.n2}║${C.rst}                                              ${C.n2}║${C.rst}`);
    console.log(`${C.n2}║${C.rst}  ${C.y}▸ ${C.rst}${C.b}${C.w}${base}/clash.yaml${C.rst}          ${C.n2}║${C.rst}`);
    console.log(`${C.n2}║${C.rst}  ${C.y}▸ ${C.rst}${C.d}${C.dim}${t('server_banner_clash')}${C.rst}                            ${C.n2}║${C.rst}`);
    console.log(`${C.n2}║${C.rst}                                              ${C.n2}║${C.rst}`);
    console.log(`${C.n2}║${C.rst}  ${C.y}▸ ${C.rst}${C.b}${C.w}${base}/health${C.rst}              ${C.n2}║${C.rst}`);
    console.log(`${C.n2}║${C.rst}  ${C.y}▸ ${C.rst}${C.d}${C.dim}${t('server_banner_health')}${C.rst}                            ${C.n2}║${C.rst}`);
    console.log(`${C.n2}╚══════════════════════════════════════════════════╝${C.rst}\n`);
  });

  return server;
};
