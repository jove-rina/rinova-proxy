#!/usr/bin/env node

import { Command } from 'commander';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { dump, load } from 'js-yaml';
import { convert } from '@rinova/jms-sdk';
import { startServer } from '@rinova/jms-sdk/server';

interface CliOptions {
  url: string;
  output: string;
  rules: 'builtin' | 'external';
}

const __dirname = dirname(fileURLToPath(import.meta.url));

const program = new Command();

program
  .name('jms-cli')
  .description('JMS subscription → Clash config')
  .version('1.2.0')
  .option('-u, --url <url>', 'JMS subscription URL')
  .option('-o, --output <path>', 'output path', '')
  .option('-p, --port <port>', 'serve mode: HTTP port (default 25500)')
  .option('-i, --interval <min>', 'serve mode: refresh interval (minutes)', '60')
  .option('--rules <mode>', 'rule mode: builtin | external', 'builtin')
  .option('--merge <file>', 'merge into existing Clash config', '')
  .parse(process.argv);

const opts = program.opts() as CliOptions & { merge?: string; port?: string; interval?: string };

const maskUrl = (url: string): string => {
  try {
    const u = new URL(url);
    if (u.searchParams.size > 0) u.searchParams.forEach((_, key) => u.searchParams.set(key, '***'));
    return u.href;
  } catch {
    return url.replace(/([?&](?:token|key|pass|id|service)=)[^&]+/gi, '$1***');
  }
};

const BUILTIN_GROUP_MEMBERS = new Set(['🎯 直连', '♻️ 自动选择', '🚀 节点选择', '🌍 国外网站', '🇨🇳 国内网站', '🛑 广告拦截', 'DIRECT', 'REJECT', 'PASS']);

const runConvert = async (url: string, output: string, rules: string, merge?: string): Promise<void> => {
  console.log(`🔗 Fetching subscription: ${maskUrl(url)}`);
  const { yaml, config, nodes } = await convert(url, { rules: rules as 'builtin' | 'external' });
  console.log(`✅ Parsed: ${nodes.length} nodes`);
  nodes.forEach((n, i) => console.log(`   ${i + 1}. [${n.type}] ${n.server}:${n.port} ← ${n.name}`));

  const newNodeNames = new Set(nodes.map((n) => n.name));

  if (merge && existsSync(merge)) {
    const existingRaw = readFileSync(merge, 'utf-8');
    const existing = load(existingRaw) as Record<string, unknown>;
    existing.proxies = nodes as unknown as unknown[];
    if (Array.isArray(existing['proxy-groups'])) {
      for (const group of existing['proxy-groups'] as Record<string, unknown>[]) {
        if (Array.isArray(group.proxies)) {
          group.proxies = (group.proxies as string[]).map((name) => {
            if (BUILTIN_GROUP_MEMBERS.has(name)) return name;
            if (newNodeNames.has(name)) return name;
            console.warn(`  ⚠️  Group "${group.name}" references missing node "${name}", falling back to "${nodes[0]?.name}"`);
            return nodes[0]?.name ?? name;
          });
        }
      }
    }
    const mergedYaml = dump(existing, { indent: 2, lineWidth: -1, noRefs: true });
    writeFileSync(merge, mergedYaml, 'utf-8');
    console.log(`\n📝 Merged into: ${merge}`);
  } else {
    const outputPath = output || join(process.cwd(), 'clash-config.yaml');
    const outDir = dirname(outputPath);
    if (outDir) mkdirSync(outDir, { recursive: true });
    writeFileSync(outputPath, yaml, 'utf-8');
    console.log(`\n✅ Config written: ${outputPath}`);
    console.log(`📊 ${nodes.length} nodes, ${config['proxy-groups'].length} groups`);
  }
};

const main = async (): Promise<void> => {
  if (opts.port) {
    if (!opts.url) { console.error('❌ Serve mode requires -u'); program.help(); process.exit(1); }
    const port = parseInt(opts.port, 10) || 25500;
    const srv = await startServer({ url: opts.url, port, intervalMin: parseInt(opts.interval || '60', 10), ruleMode: opts.rules as 'builtin' | 'external' });
    const shutdown = (): void => { console.log('\n🛑 Shutting down...'); srv.close(); process.exit(0); };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } else if (opts.url) {
    await runConvert(opts.url!, opts.output, opts.rules, opts.merge);
  } else {
    program.help();
  }
};

main().catch((err) => {
  console.error(`❌ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
