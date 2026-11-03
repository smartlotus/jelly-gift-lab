// Generic i18n for the journey pages (same rules + same storage key as the jelly page's src/i18n/i18n.ts, so a language
// chosen anywhere sticks everywhere): ?lang= > localStorage['jelly.lang'] > navigator.language.
// Elements opt in with data-i18n (textContent) / data-i18n-aria (aria-label).
import { en as sharedEn, zh as sharedZh } from './dict';
export type Lang = 'en' | 'zh';
const STORE = 'jelly.lang';
const norm = (v: string | null | undefined): Lang | null => (v ? (/^zh/i.test(v) ? 'zh' : /^en/i.test(v) ? 'en' : null) : null);
function initial(): Lang {
  const q = norm(new URLSearchParams(location.search).get('lang')); if (q) return q;
  try { const s = norm(localStorage.getItem(STORE)); if (s) return s; } catch { /* private mode */ }
  return norm(navigator.language) ?? 'en';
}
export let lang: Lang = initial();
const table: Record<Lang, Record<string, string>> = { en: { ...sharedEn }, zh: { ...sharedZh } };
const subs: ((l: Lang) => void)[] = [];

/** register a stage dictionary (call once at boot, before apply()) */
export function register(d: { en: Record<string, string>; zh: Record<string, string> }) {
  Object.assign(table.en, d.en); Object.assign(table.zh, d.zh);
}
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = table[lang][key] ?? table.en[key] ?? key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}
export function apply(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n!); });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria!)); });
  const html = document.documentElement; html.lang = lang === 'zh' ? 'zh-CN' : 'en'; html.dataset.lang = lang;
  const tk = document.querySelector<HTMLMetaElement>('meta[name="gift-title"]')?.content; if (tk) document.title = t(tk);
}
export function onLang(fn: (l: Lang) => void) { subs.push(fn); }
export function setLang(l: Lang) {
  try { localStorage.setItem(STORE, l); } catch { /* ignore */ }
  const p = new URLSearchParams(location.search);
  if (p.has('lang')) { p.set('lang', l); history.replaceState(null, '', `?${p}`); }
  if (l === lang) return;
  lang = l; apply(); subs.forEach(f => f(l));
}
