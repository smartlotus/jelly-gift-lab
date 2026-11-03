// Tiny i18n: ?lang= > localStorage > navigator.language. Elements opt in with
// data-i18n (textContent) / data-i18n-aria (aria-label); dynamic UI re-renders via onLang().
import { DICT, type Key, type Lang } from './dict';
export type { Key, Lang };

const STORE = 'jelly.lang';
const norm = (v: string | null | undefined): Lang | null => (v ? (/^zh/i.test(v) ? 'zh' : /^en/i.test(v) ? 'en' : null) : null);
function initial(): Lang {
  const q = norm(new URLSearchParams(location.search).get('lang'));
  if (q) return q;
  try { const s = norm(localStorage.getItem(STORE)); if (s) return s; } catch { /* private mode */ }
  return norm(navigator.language) ?? 'en';
}
export let lang: Lang = initial();
const subs: ((l: Lang) => void)[] = [];

export function t(key: Key, vars?: Record<string, string | number>): string {
  let s = DICT[lang][key] ?? DICT.en[key] ?? key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}
export function apply(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n as Key); });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria as Key)); });
  const html = document.documentElement;
  html.lang = lang === 'zh' ? 'zh-CN' : 'en'; html.dataset.lang = lang;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.desc'));
}
export function onLang(fn: (l: Lang) => void) { subs.push(fn); }
export function setLang(l: Lang, persist = true) {
  if (persist) try { localStorage.setItem(STORE, l); } catch { /* ignore */ }
  const p = new URLSearchParams(location.search);
  if (p.has('lang')) { p.set('lang', l); history.replaceState(null, '', `?${p}`); }
  if (l === lang) return;
  lang = l; apply(); subs.forEach(f => f(l));
}
