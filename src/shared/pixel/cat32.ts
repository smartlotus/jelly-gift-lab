// Refined wander cat: same cream identity (pink ears, sleepy eyes, ω mouth, tail band)
// authored at 32×32 so it stays charming on the painted flower/mushroom plates
// instead of becoming a huge 16² white square. Meadow/shop keep the original 16² sheet.
import { raster, anim, compose, type Anim } from './sprite';
import { CAT_PAL } from './cat';
import { art } from '../../art/loader';

const HEAD = [
  '..kk.....',
  '.kpk.kk..',
  'kppkkpk..',
  'kwwwwwk..',
  'kwwbbwwk.',
  'kwwwkwwk.',
  'kwwkwkwk.',
  '.kwwwwwk.',
  '..kwwwk..',
];

const BODY = [
  '.kkkkkkkkkkkk.',
  'kwwwwwwwwwwwk',
  'kswwwwwwwwwsk',
  'ksswwwwwwwssk',
  '.kwwwwwwwwwk.',
];

const TAIL = {
  up: ['k..', 'kwk', 'kpk', 'kwk', 'kww', '.kk'],
  bent: ['kk.', 'kwk', 'kpk', 'kwk', 'kww', '.kk'],
};

const LEGS = {
  stand: ['.kwwk..kwwk.', '.kkk....kkk.'],
  stride: ['kwwk....kwwk', 'kkk.......kk'],
  pass: ['..kwwkkwwk..', '..kkk..kkk..'],
  stride2: ['.kwwk..kwwk.', 'kk........kk'],
};

const TORSO = [
  '.kkkkkkkkkkkk.',
  'kwwwwwwwwwwwk',
  'kwwwwwwwwwwwk',
  'kswwwwwwwwwsk',
  'ksswwwwwwwssk',
  'kwwwwwwwwwwwk',
  '.kwwwwwwwwwk.',
  '..kkkkkkkkk..',
];

function frame(legs: keyof typeof LEGS, tail: keyof typeof TAIL, bob = 0, shift = 0): string[] {
  // Overlap head/torso/legs so a missing art sheet never draws a dismembered cat.
  return compose(
    32, 32,
    { rows: TAIL[tail], dx: 2, dy: 14 + bob },
    { rows: TORSO, dx: 6 + shift, dy: 12 },
    { rows: LEGS[legs], dx: 8 + shift, dy: 21 },
    { rows: HEAD, dx: 14 + shift, dy: 5 + bob },
  );
}

export interface Cat32 {
  idle: Anim;
  walk: Anim;
}

let cache: Cat32 | null = null;

export function cat32Sprites(): Cat32 {
  if (cache) return cache;
  const idleFrames = [
    frame('stand', 'up', 0, 0),
    frame('stand', 'up', 0, 0),
    frame('stand', 'bent', 0, 0),
    frame('stand', 'up', 0, 0),
    frame('stand', 'up', 0, 0),
    frame('stand', 'bent', 1, 0),
  ];
  const walkFrames = [
    frame('stride', 'up', 0, -1),
    frame('pass', 'bent', 1, 0),
    frame('stride2', 'up', 0, 1),
    frame('pass', 'bent', 1, 0),
  ];
  return (cache = {
    idle: anim(idleFrames, CAT_PAL, 4),
    walk: anim(walkFrames, CAT_PAL, 9),
  });
}

export function cat32Frame(sp: Cat32, vx: number, t: number): HTMLCanvasElement {
  const walk = art.fauna.cat?.walk;
  if (walk?.length) {
    if (Math.abs(vx) > 6) return walk[Math.floor(t * 8) % walk.length]!;
    return walk[0]!;
  }
  if (Math.abs(vx) > 8) return sp.walk.frames[Math.floor(t * (6 + Math.abs(vx) / 14)) % sp.walk.frames.length]!;
  return sp.idle.frames[Math.floor(t * sp.idle.fps) % sp.idle.frames.length]!;
}

void raster;
