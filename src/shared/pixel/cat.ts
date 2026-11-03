// The hero: a Cat-Mario-style pixel cat designed from lotus's cat doodle (ref_B_cat_book.jpg):
// cream body, soft-black outline, closed happy eyes (the doodle's sleepy ^ ^), ':3' mouth, pink inner ears + tail band,
// a '!!' pop above the head is its signature reaction (from the doodle). Shared by stage 1 (meadow) and stage 2 (shop).
// FIRST PASS PLACEHOLDER ART (16x16) - workstream A owns refining it (see docs/GIFT_PLAN.md §5.1 sprite list).
import { anim, raster, type Anim, type Palette } from './sprite';
export const CAT_PAL: Palette = { k: '#2E2A2B', w: '#FFF4E4', s: '#EBD9C3', p: '#F4A7B9', b: '#F7B6C2' };
const HEAD = [
  '................',
  '..k.......k.....',
  '.kpk.....kpk....',
  '.kppkkkkkppk....',
  'kwwwwwwwwwwwk...',
  'kwwwwwwwwwwwk...',
  'kwkkwwwwwkkwk...',
  'kwwwwwwwwwwwk...',
  'kbwwwkwkwwwbk...',
  'kwwwwwkwwwwwk.k.',
  '.kwwwwwwwwwk.kpk',
];
const BODY_A = ['.kwwwwwwwwwkkk..', '.kwswwwwwwswk...', '.kwsswwwwsswk...', '..kkk.kk.kkk....', '................'];
const BODY_B = ['.kwwwwwwwwwkkk..', '.kwswwwwwwswk...', '.kkswwwwwwskk...', '...kk....kk.....', '................'];
const BODY_J = ['.kwwwwwwwwwkkk..', 'kwwswwwwwwswwk..', '.kk.kwwwwk.kk...', '.....kkkk.......', '................'];
export interface CatSprites { idle: Anim; walk: Anim; jump: HTMLCanvasElement; bang: HTMLCanvasElement }
export function catSprites(): CatSprites {
  const f = (b: string[]) => [...HEAD, ...b];
  return {
    idle: anim([f(BODY_A)], CAT_PAL, 2),
    walk: anim([f(BODY_A), f(BODY_B)], CAT_PAL, 8),
    jump: raster(f(BODY_J), CAT_PAL),
    bang: raster(['.y.y.', '.y.y.', '.y.y.', '.....', '.y.y.'], { y: '#FFD45C' }),
  };
}
