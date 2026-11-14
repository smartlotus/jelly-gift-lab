// Small glyphs for the 惊喜 / 跳过 buttons, one pair per stage (the dock's skin is in surprise.css).
import type { StageId } from '../stage-list';
import { pxSvg } from './fx';

const qBlock = pxSvg(['oooooooo', 'oyyyyyyo', 'oyykkyyo', 'oyyyykyo', 'oyyykyyo', 'oyyyyyyo', 'oyyykyyo', 'oooooooo'], { o: '#7A4A12', y: '#FFC93C', k: '#7A4A12' });
const pxArrow = pxSvg(['..k....', '..kk...', 'kkkkk..', 'kkkkkk.', 'kkkkk..', '..kk...', '..k....'], { k: 'currentColor' });
const pxHeart = pxSvg(['.kk.kk.', 'kkkkkkk', 'kkkkkkk', '.kkkkk.', '..kkk..', '...k...'], { k: 'currentColor' });
const line = (d: string, w = 1.4) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const chev = line('<path d="M9 6l6 6-6 6"/>', 1.6);
const arrow = line('<path d="M5 12h13M13 6l6 6-6 6"/>', 1.3);

export const ICONS: Record<Exclude<StageId, 'ar'>, { s: string; k: string }> = {
  meadow: { s: qBlock, k: pxArrow },
  shop: { s: line('<rect x="4" y="10" width="16" height="10" rx="1"/><path d="M3 7h18v3H3zM12 7v13M12 7c-2-4-6-4-6-1.5S10 7 12 7zM12 7c2-4 6-4 6-1.5S14 7 12 7z"/>'), k: arrow },
  night: { s: '<i class="gs-rec" aria-hidden="true"></i>', k: line('<path d="M4 6l7 6-7 6zM12 6l7 6-7 6z" fill="currentColor" stroke="none"/>') },
  jelly: { s: line('<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>', 1.1), k: arrow },
  sea: { s: line('<circle cx="10" cy="13" r="6"/><circle cx="17.5" cy="6.5" r="2.5"/><path d="M7.5 11a3 3 0 012.5-1.5"/>', 1.3), k: chev },
  sky: { s: line('<path d="M12 3l1.7 7.3L21 12l-7.3 1.7L12 21l-1.7-7.3L3 12l7.3-1.7z"/>', 1.1), k: chev },
  coop: { s: pxHeart, k: pxArrow },
  flower: { s: line('<path d="M12 21c-5-3-7-7-7-11a7 7 0 0114 0c0 4-2 8-7 11z"/><path d="M12 21V9"/>', 1.3), k: chev },
  mushroom: { s: line('<path d="M3.6 12.2C3.6 7.1 7.4 3.4 12 3.4s8.4 3.7 8.4 8.8c0 .5-.4.8-.9.8H4.5c-.5 0-.9-.3-.9-.8Z"/><path d="M9.2 13v4.6c0 1.7 1.2 2.9 2.8 2.9s2.8-1.2 2.8-2.9V13"/>', 1.2), k: chev },
  home: { s: line('<path d="M4 11l8-7 8 7v9H4z"/><rect x="10" y="13" width="4" height="4"/>', 1.3), k: chev },
};
/** the collection entry glyph: a tiny pouch */
export const POUCH = line('<path d="M7 8h10l2 11a1 1 0 01-1 1H6a1 1 0 01-1-1z"/><path d="M9 8V6a3 3 0 016 0v2"/>', 1.4);
