// The hidden thing of each stage: its picture and where it waits on screen (fractions of the viewport, portrait / landscape).
// Positions sit in calm parts of each scene, clear of that stage's own controls (checked at 390×844, 844×390, 1280×720).
import type { StageId } from '../stage-list';
import { pxSvg } from './fx';

export interface ItemSpec {
  /** inline SVG / HTML of the thing (sized by CSS to --gs-item px) */
  art: (asset: (p: string) => string) => string;
  /** CSS px of the drawn thing (the tap target is always ≥ 48 px) */
  size: number;
  /** [x, y] as fractions of the viewport */
  portrait: [number, number];
  landscape: [number, number];
  /** spark colour on the way to it */
  glow: string;
}

const heart = pxSvg([
  '.oo.oo.',
  'ohlohho',
  'ohhhhgo',
  'ohhhhgo',
  '.ohhgo.',
  '..ogo..',
  '...o...',
], { o: '#9A6200', h: '#FFD45C', l: '#FFF6C8', g: '#F2A900' });
const bell = pxSvg([
  '....oo....',
  '...oyyo...',
  '..oyllyo..',
  '..oylyyo..',
  '.oyyyyyyo.',
  '.oyyyyyyo.',
  'oyyyyyyygo',
  'oooooooooo',
  '....oro...',
  '.....o....',
], { o: '#5A3A12', y: '#F2C14E', l: '#FFF1B8', g: '#C98E1E', r: '#E85A7A' });
const battery = pxSvg([
  '...oo...',
  '.oooooo.',
  '.owwwwo.',
  '.owggwo.',
  '.owggwo.',
  '.ogggwo.',
  '.ogggwo.',
  '.ogggwo.',
  '.ogggwo.',
  '.oooooo.',
], { o: '#101010', w: '#E8E8E0', g: '#7CFF8A' });
const cherry = `<svg viewBox="0 0 40 44" aria-hidden="true"><defs><radialGradient id="gsch" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="#ff8aa6"/><stop offset=".55" stop-color="#e0284f"/><stop offset="1" stop-color="#8f0f2c"/></radialGradient></defs>
  <path d="M21 4c-1 9-4 15-9 21" fill="none" stroke="#5c7a3a" stroke-width="2.2" stroke-linecap="round"/><path d="M21 4c6 1 10 4 12 8-5 1-9-1-12-8z" fill="#7fb24f"/>
  <circle cx="13" cy="31" r="10" fill="url(#gsch)"/><ellipse cx="9.5" cy="27" rx="3" ry="2" fill="#fff" opacity=".7"/></svg>`;
const shell = pxSvg([
  '....oooo....',
  '..oopsppoo..',
  '.opspspsppo.',
  'opspspspspso',
  'opspspspspso',
  'opspspspspso',
  '.opspspspso.',
  '..ooppppoo..',
  '...owwwwo...',
  '....oooo....',
], { o: '#7A3B4C', p: '#FFC7D3', s: '#F08AA4', w: '#FFE7C9' });
const star = `<svg viewBox="0 0 40 40" aria-hidden="true"><defs><radialGradient id="gsst"><stop offset="0" stop-color="#fff7d6"/><stop offset=".5" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs>
  <circle cx="20" cy="20" r="18" fill="url(#gsst)"/><path d="M20 4l2.6 12.4L35 20l-12.4 2.6L20 36l-2.6-13.4L5 20l12.4-3.6z" fill="#fff4cf"/></svg>`;
const pad = pxSvg([
  '..oooooooooo..',
  '.owwwwwwwwwwo.',
  'owwkwwwwwwpwwo',
  'owkkkwwwwpwpwo',
  'owwkwwwwwwpwwo',
  'owwwwwoowwwwwo',
  '.owwwo..owwwo.',
  '..ooo....ooo..',
], { o: '#2E2A2B', w: '#FFF4E4', k: '#2E2A2B', p: '#EE8FA6' });
const butterfly = `<svg class="gs-bfly" viewBox="0 0 44 36" aria-hidden="true">
  <g class="gs-wl"><path d="M21 18C16 6 6 2 3 6s2 12 10 13c-7 2-9 9-5 11s11-3 13-12z" fill="#fbf4ff" stroke="#8b4fc0" stroke-width="2"/><path d="M8 9c3 0 7 3 9 7" stroke="#c79be6" stroke-width="1.4" fill="none"/></g>
  <g class="gs-wr"><path d="M23 18C28 6 38 2 41 6s-2 12-10 13c7 2 9 9 5 11s-11-3-13-12z" fill="#fbf4ff" stroke="#8b4fc0" stroke-width="2"/><path d="M36 9c-3 0-7 3-9 7" stroke="#c79be6" stroke-width="1.4" fill="none"/></g>
  <path d="M22 11v17" stroke="#3b2a3e" stroke-width="2.4" stroke-linecap="round"/><path d="M22 11l-3-5M22 11l3-5" stroke="#3b2a3e" stroke-width="1.2" stroke-linecap="round"/></svg>`;
const key = pxSvg([
  '.ooo..........',
  'oyyyo.........',
  'oylyoooooooooo',
  'oyyyyyyyyyyyyo',
  'oyyyoooooyoyoo',
  '.ooo.....o.o..',
], { o: '#5A3A12', y: '#E7B84A', l: '#FFF1B8' });

export const ITEMS: Record<Exclude<StageId, 'ar'>, ItemSpec> = {
  meadow: { art: () => heart, size: 28, portrait: [0.2, 0.31], landscape: [0.12, 0.3], glow: '#FFE07A' },
  shop: { art: () => bell, size: 26, portrait: [0.9, 0.205], landscape: [0.7, 0.3], glow: '#FFE7A0' },
  night: { art: () => battery, size: 22, portrait: [0.12, 0.64], landscape: [0.17, 0.48], glow: '#9CFFAA' },
  jelly: { art: () => cherry, size: 30, portrait: [0.86, 0.6], landscape: [0.8, 0.62], glow: '#FF9DB4' },
  sea: { art: () => shell, size: 28, portrait: [0.86, 0.93], landscape: [0.9, 0.88], glow: '#FFD3DE' },
  sky: { art: () => star, size: 26, portrait: [0.78, 0.4], landscape: [0.72, 0.3], glow: '#FFE2A0' },
  coop: { art: () => pad, size: 30, portrait: [0.86, 0.7], landscape: [0.9, 0.6], glow: '#FFC7D3' },
  flower: { art: () => butterfly, size: 32, portrait: [0.8, 0.44], landscape: [0.84, 0.36], glow: '#E7C8FF' },
  mushroom: { art: a => `<img src="${a('art/mushrooms/ms09.png')}" alt="" draggable="false"/>`, size: 34, portrait: [0.88, 0.62], landscape: [0.9, 0.62], glow: '#FFB8E6' },
  home: { art: () => key, size: 30, portrait: [0.1, 0.76], landscape: [0.06, 0.8], glow: '#FFE2A0' },
};
