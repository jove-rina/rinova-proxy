import axios from 'axios';
import { padBase64 } from './utils.js';

/**
 * 拉取 JMS 订阅链接并 Base64 解码
 */
export const fetchSubscription = async (url: string): Promise<string[]> => {
  const resp = await axios.get<string>(url, {
    timeout: 15_000,
    responseType: 'text',
    headers: {
      'User-Agent': 'jms-convert-tool/1.0',
    },
  });

  let raw = resp.data.trim();

  // 个别订阅 URL Encode 了整个返回值
  try {
    if (raw.includes('%')) {
      raw = decodeURIComponent(raw);
    }
  } catch {
    // 非 URL 编码，保持原样
  }

  // 尝试 Base64 解码
  let decoded: string;
  try {
    decoded = Buffer.from(padBase64(raw), 'base64').toString('utf-8');
  } catch {
    decoded = raw; // 降级为纯文本
  }

  // 按行分割，过滤空行和注释
  const lines = decoded
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length === 0) {
    throw new Error('订阅链接返回为空或格式无法识别');
  }

  return lines;
};

/**
 * 去重：同名节点追加 -2, -3 后缀（第一个保留原名）
 */
export const deduplicateNames = (nodes: { name: string }[]): void => {
  const seen = new Map<string, number>();
  for (const node of nodes) {
    const base = node.name.replace(/-\d+$/, '');
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    if (count > 1) {
      node.name = `${base}-${count}`;
    }
  }
};
