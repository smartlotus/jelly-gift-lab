// Shared woodland creatures for the flower / mushroom strolls and the home montage.
// Same language as cat.ts / pig.ts: soft-black outline, blush, sleepy-cute faces, string-art frames.
import { raster, anim, outline, compose, type Palette, type Anim } from './sprite';

const K = '#2E2A2B';
export const FAUNA_PAL: Palette = {
  k: K,
  // deer
  d: '#C48A5A', e: '#E2B07A', n: '#6B3A28', w: '#F6E6C8',
  // lamb
  l: '#F4EFE6', m: '#D8D0C4', p: '#F4A7B9',
  // border collie
  b: '#1E1C1D', s: '#F4F0EA', a: '#C9C2B6',
  // kittens (grey / orange / calico bits)
  g: '#C4B6A8', o: '#E09A4A', c: '#F3D7B3', t: '#5A3A28',
  // owl
  u: '#8A5A32', y: '#E8C878', h: '#F0E6C0', r: '#E85A7A',
  q: '#FFD45C', // sparkle
};

const P = FAUNA_PAL;

export type CritterKind = 'deer' | 'lamb' | 'collie' | 'kitten' | 'owl' | 'calico' | 'greykit';

function R(rows: string[], pal: Palette = P) { return raster(outline(rows), pal); }

// ---------- deer (side, faces right) ----------
const DEER_STAND = [
  '..........kk....',
  '.........kdnk...',
  '........kdwwdk..',
  '......kkkdeedk..',
  '.....kdddddddk..',
  'kkkkkdddddddk...',
  '.kdddddddddk....',
  '..kkddddddk.....',
  '...kdk..kdk.....',
  '...kk....kk.....',
];
const DEER_WALK1 = [
  '..........kk....',
  '.........kdnk...',
  '........kdwwdk..',
  '......kkkdeedk..',
  '.....kdddddddk..',
  'kkkkkdddddddk...',
  '.kdddddddddk....',
  '..kkddddddk.....',
  '..kdk....kdk....',
  '..kk......kk....',
];
const DEER_WALK2 = [
  '..........kk....',
  '.........kdnk...',
  '........kdwwdk..',
  '......kkkdeedk..',
  '.....kdddddddk..',
  'kkkkkdddddddk...',
  '.kdddddddddk....',
  '..kkddddddk.....',
  '...kdk.kdk......',
  '...kk...kk......',
];
const DEER_LOOK = [
  '..........kk....',
  '.........kdnk...',
  '........kdwwdk..',
  '......kkkdeeek..',
  '.....kdddddddk..',
  'kkkkkdddddddk...',
  '.kdddddddddk....',
  '..kkddddddk.....',
  '...kdk..kdk.....',
  '...kk....kk.....',
];

// ---------- lamb ----------
const LAMB_STAND = [
  '..............',
  '....kkkkkk....',
  '...kllllllk...',
  '..kllwwllllk..',
  '..kllllllllk..',
  '...kllllllk...',
  '...kmk..kmk...',
  '...kk....kk...',
];
const LAMB_HOP = [
  '..............',
  '....kkkkkk....',
  '...kllllllk...',
  '..kllwwllllk..',
  '..kllllllllk..',
  '..kmkllllkmk..',
  '..kk......kk..',
  '..............',
];
const LAMB_WALK = [
  '..............',
  '....kkkkkk....',
  '...kllllllk...',
  '..kllwwllllk..',
  '..kllllllllk..',
  '...kllllllk...',
  '..kmk....kmk..',
  '..kk......kk..',
];

// ---------- border collie puppy ----------
const COLLIE_STAND = [
  '................',
  '...kk...........',
  '..kbsk..........',
  '.kbbsskkkkkk....',
  'kbbssssssssbk...',
  'kbsssssssssbk...',
  '.kkbssssssbk....',
  '...kbk..kbk.....',
  '...kk....kk.....',
];
const COLLIE_RUN1 = [
  '................',
  '...kk...........',
  '..kbsk..........',
  '.kbbsskkkkkk....',
  'kbbssssssssbk...',
  'kbsssssssssbk...',
  '.kkbssssssbk....',
  '..kbk....kbk....',
  '..kk......kk....',
];
const COLLIE_RUN2 = [
  '................',
  '...kk...........',
  '..kbsk..........',
  '.kbbsskkkkkk....',
  'kbbssssssssbk...',
  'kbsssssssssbk...',
  '.kkbssssssbk....',
  '...kbk.kbk......',
  '...kk...kk......',
];
const COLLIE_SIT = [
  '................',
  '...kk...........',
  '..kbsk..........',
  '.kbbsskkk.......',
  'kbbsssssbkk.....',
  'kbssssssbbbk....',
  '.kkbssssbbk.....',
  '...kkkkkkk......',
];

// ---------- grey kitten (not the hero cat — smaller, open eyes) ----------
const KIT_STAND = [
  '...k...k....',
  '..kgk.kgk...',
  '.kgggggggk..',
  'kggwwggwwgk.',
  'kgggggggggk.',
  '.kgggggggk..',
  '..kgk.kgk...',
  '..kk...kk...',
];
const KIT_WALK1 = [
  '...k...k....',
  '..kgk.kgk...',
  '.kgggggggk..',
  'kggwwggwwgk.',
  'kgggggggggk.',
  '.kgggggggk..',
  '.kgk...kgk..',
  '.kk.....kk..',
];
const KIT_WALK2 = [
  '...k...k....',
  '..kgk.kgk...',
  '.kgggggggk..',
  'kggwwggwwgk.',
  'kgggggggggk.',
  '.kgggggggk..',
  '..kgk.kgk...',
  '...kk.kk....',
];
const KIT_SIT = [
  '...k...k....',
  '..kgk.kgk...',
  '.kgggggggk..',
  'kggwwggwwgk.',
  'kgggggggggk.',
  'kggkggggkgk.',
  '.kkkgggkkk..',
  '.....kkk....',
];

// ---------- orange tabby sitting / walking ( pal swap via o ) ----------
const TAB_STAND = [
  '...k...k....',
  '..kok.kok...',
  '.koooooook..',
  'koowwooookk.',
  'koooooooook.',
  '.koooooook..',
  '..kok.kok...',
  '..kk...kk...',
];
const TAB_WALK1 = [
  '...k...k....',
  '..kok.kok...',
  '.koooooook..',
  'koowwooookk.',
  'koooooooook.',
  '.koooooook..',
  '.kok...kok..',
  '.kk.....kk..',
];

// ---------- calico (home pet) ----------
const CAL_STAND = [
  '...k...k....',
  '..kok.kgk...',
  '.kooccccok..',
  'koowwccwwok.',
  'kocccccccok.',
  '.koccoockk..',
  '..kok.kgk...',
  '..kk...kk...',
];
const CAL_RUN1 = [
  '...k...k....',
  '..kok.kgk...',
  '.kooccccok..',
  'koowwccwwok.',
  'kocccccccok.',
  '.koccoockk..',
  '.kok...kgk..',
  '.kk.....kk..',
];
const CAL_SIT = [
  '...k...k....',
  '..kok.kgk...',
  '.kooccccok..',
  'koowwccwwok.',
  'kocccccccok.',
  'kockcccckgk.',
  '.kkkccckkk..',
  '.....kkk....',
];

// ---------- owl ----------
const OWL_PERCH = [
  '...kkkk...',
  '..kuuuuk..',
  '.kuywwyuk.',
  '.kuwkkkwuk',
  '.kuuuyuuuk',
  '..kuuuuuk.',
  '...kukkuk.',
  '....kkkk..',
];
const OWL_BLINK = [
  '...kkkk...',
  '..kuuuuk..',
  '.kuywwyuk.',
  '.kukkkkkuk',
  '.kuuuyuuuk',
  '..kuuuuuk.',
  '...kukkuk.',
  '....kkkk..',
];
const OWL_FLY1 = [
  'kk........kk',
  '.kuukkkkuuk.',
  '..kuywwyuk..',
  '..kuwkkkwuk.',
  '..kuuuyuuuk.',
  '...kuuuuk...',
  '....kukk....',
  '.....kk.....',
];
const OWL_FLY2 = [
  '............',
  'kkkuuuuukkk.',
  '..kuywwyuk..',
  '..kuwkkkwuk.',
  '..kuuuyuuuk.',
  '...kuuuuk...',
  '....kukk....',
  '.....kk.....',
];

export interface CritterSheet {
  stand: HTMLCanvasElement;
  walk: Anim;
  extra: HTMLCanvasElement;
  fly?: Anim;
}

let cache: Partial<Record<CritterKind, CritterSheet>> = {};

export function critterSheet(kind: CritterKind): CritterSheet {
  const hit = cache[kind]; if (hit) return hit;
  let sheet: CritterSheet;
  if (kind === 'deer') {
    sheet = { stand: R(DEER_STAND), walk: anim([outline(DEER_WALK1), outline(DEER_STAND), outline(DEER_WALK2), outline(DEER_STAND)], P, 6), extra: R(DEER_LOOK) };
  } else if (kind === 'lamb') {
    sheet = { stand: R(LAMB_STAND), walk: anim([outline(LAMB_WALK), outline(LAMB_STAND), outline(LAMB_HOP), outline(LAMB_STAND)], P, 7), extra: R(LAMB_HOP) };
  } else if (kind === 'collie') {
    sheet = { stand: R(COLLIE_STAND), walk: anim([outline(COLLIE_RUN1), outline(COLLIE_STAND), outline(COLLIE_RUN2), outline(COLLIE_STAND)], P, 9), extra: R(COLLIE_SIT) };
  } else if (kind === 'kitten' || kind === 'greykit') {
    sheet = { stand: R(KIT_STAND), walk: anim([outline(KIT_WALK1), outline(KIT_STAND), outline(KIT_WALK2), outline(KIT_STAND)], P, 8), extra: R(KIT_SIT) };
  } else if (kind === 'calico') {
    sheet = { stand: R(CAL_STAND), walk: anim([outline(CAL_RUN1), outline(CAL_STAND), outline(CAL_RUN1), outline(CAL_STAND)], P, 8), extra: R(CAL_SIT) };
  } else {
    // owl
    sheet = {
      stand: R(OWL_PERCH),
      walk: anim([outline(OWL_FLY1), outline(OWL_FLY2)], P, 7),
      extra: R(OWL_BLINK),
      fly: anim([outline(OWL_FLY1), outline(OWL_FLY2)], P, 7),
    };
  }
  cache[kind] = sheet;
  return sheet;
}

export function critterFrame(kind: CritterKind, mode: 'stand' | 'walk' | 'extra' | 'fly', t: number): HTMLCanvasElement {
  const s = critterSheet(kind);
  if (mode === 'walk') return s.walk.frames[Math.floor(t * s.walk.fps) % s.walk.frames.length];
  if (mode === 'fly' && s.fly) return s.fly.frames[Math.floor(t * s.fly.fps) % s.fly.frames.length];
  if (mode === 'extra') return s.extra;
  return s.stand;
}

// used so TypeScript keeps compose imported if we extend frames later
void compose;
