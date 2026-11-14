// Quiet in-world lines that stitch the journey together. Not title cards.
import { register, t } from './i18n';
import * as dict from './story-dict';
import './story.css';
import { settleSoon, settleAll } from './layout';

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
  settleSoon(30); setTimeout(settleAll, 1400); // step clear of this stage's controls (layout.ts), again once it has slid in
  // Stage hints (walk keys, "keep going") sit near the same bottom edge; let them step aside while a line is spoken.
  document.body.classList.add('gift-telling');
  clearTimeout(hideT);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  hideT = window.setTimeout(() => hush(), reduce ? Math.min(hold, 1800) : hold);
}

export function hush() {
  el?.classList.remove('on');
  document.body.classList.remove('gift-telling');
}
