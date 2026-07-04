import en from './locales/en.json' with { type: 'json' };
import zh from './locales/zh.json' with { type: 'json' };

type Lang = 'en' | 'zh';

const locales: Record<Lang, Record<string, string>> = { en, zh };

/** Detect system language from LANG / LC_ALL env */
const detectLang = (): Lang => {
  const lang = process.env.LANG || process.env.LC_ALL || '';
  if (lang.startsWith('zh')) return 'zh';
  return 'en';
};

const currentLang: Lang = detectLang();

/** Get the current language code */
export const getLang = (): Lang => currentLang;

export type I18nParams = Record<string, string | number>;

/**
 * Translate a key to the localized string.
 *
 * @param key     - Translation key from locale JSON
 * @param params  - Optional interpolation params (e.g. `{ count: 5 }`)
 * @param fallback - Fallback string if key is missing
 * @returns The translated string
 *
 * @example
 * ```ts
 * t('refreshing')
 * t('refresh_ok', { count: nodes.length })
 * t('node_list', { index: 1, type: 'ss', server: 'x.com', port: 443, name: 'US' })
 * ```
 */
export const t = (key: string, params?: I18nParams, fallback?: string): string => {
  const locale = locales[currentLang];
  let msg = locale[key] ?? locales.en[key] ?? fallback ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(`{${k}}`, String(v));
    }
  }

  return msg;
};
