/**
 * Base64 padding 补齐
 */
export const padBase64 = (s: string): string =>
  s.padEnd(s.length + ((4 - (s.length % 4)) % 4), '=');

/**
 * URL 解码，兼容 null/undefined
 */
export const safeDecodeURI = (s: string | undefined | null): string => {
  if (!s) return '';
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};
