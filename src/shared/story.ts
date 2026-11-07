// Quiet in-world lines that stitch the journey together. Not title cards.
import { register, t } from './i18n';
import * as dict from './story-dict';
import './story.css';

register(dict);

let el: HTMLParagraphElement | null = null;
let hideT = 0;
const seen = new Set<string>();

export function mountStory() {
  if (el) return el;
  el = document.createElement('p');
  el.className = 'gift-whisper';
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  return el;
}

export function tell(key: string, hold = 4400, once = true) {
  if (once && seen.has(key)) return;
  if (once) seen.add(key);
  mountStory();
  if (!el) return;
  el.dataset.i18n = key;
  el.textContent = t(key);
  el.classList.add('on');
  clearTimeout(hideT);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  hideT = window.setTimeout(() => el?.classList.remove('on'), reduce ? Math.min(hold, 1800) : hold);
}

export function hush() {
  el?.classList.remove('on');
}
