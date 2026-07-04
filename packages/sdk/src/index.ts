import { fetchSubscription, deduplicateNames } from './fetch.js';
import { parseLines } from './parser.js';
import { buildConfig, toYaml } from './builder.js';
import type { ProxyNode, ClashConfig } from './types.js';
import { t } from './i18n.js';

// Re-export types for convenience
export type { ProxyNode, ProxyType, ProxyGroup, ClashConfig } from './types.js';

// Re-export useful standalone functions
export { parseURI, parseLines } from './parser.js';
export { buildConfig, toYaml } from './builder.js';
export { fetchSubscription, deduplicateNames } from './fetch.js';
export { startServer } from './server.js';
export { t } from './i18n.js';
export { getLang } from './i18n.js';
export type { I18nParams } from './i18n.js';

// ============================================================
//  High-level API
// ============================================================

export interface ConvertOptions {
  /** Rule mode: 'builtin' (default) or 'external' (ACL4SSR RuleSet) */
  rules?: 'builtin' | 'external';
  /** Deduplicate node names (default: true) */
  deduplicate?: boolean;
}

export interface ConvertResult {
  /** The full Clash configuration object */
  config: ClashConfig;
  /** Clash configuration serialized as YAML string */
  yaml: string;
  /** Parsed proxy nodes */
  nodes: ProxyNode[];
}

/**
 * Fetch a JMS subscription URL and convert it to a Clash configuration.
 */
export const convert = async (url: string, opts?: ConvertOptions): Promise<ConvertResult> => {
  const rules = opts?.rules ?? 'builtin';
  const shouldDedup = opts?.deduplicate ?? true;

  const lines = await fetchSubscription(url);
  const nodes = parseLines(lines);

  if (nodes.length === 0) {
    throw new Error(t('err_no_nodes_subscription'));
  }

  if (shouldDedup) {
    deduplicateNames(nodes);
  }

  const config = buildConfig(nodes, rules);
  const yaml = toYaml(config);

  return { config, yaml, nodes };
};

/**
 * Convert pre-parsed URI lines to a Clash configuration without network requests.
 */
export const convertFromLines = (lines: string[], opts?: ConvertOptions): ConvertResult => {
  const rules = opts?.rules ?? 'builtin';
  const shouldDedup = opts?.deduplicate ?? true;

  const nodes = parseLines(lines);

  if (nodes.length === 0) {
    throw new Error(t('err_no_nodes_input'));
  }

  if (shouldDedup) {
    deduplicateNames(nodes);
  }

  const config = buildConfig(nodes, rules);
  const yaml = toYaml(config);

  return { config, yaml, nodes };
};
