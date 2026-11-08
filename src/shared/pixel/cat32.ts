// Refined wander cat: same cream identity (pink ears, sleepy eyes, ω mouth, tail band)
// authored at 32×32 so it stays charming on the painted flower/mushroom plates
// instead of becoming a huge 16² white square. Meadow/shop keep the original 16² sheet.
import { raster, anim, compose, type Anim } from './sprite';
import { CAT_PAL } from './cat';

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

function frame(legs: keyof typeof LEGS, tail: keyof typeof TAIL, bob = 0, shift = 0): string[] {
  return compose(
    32, 32,
    { rows: TAIL[tail], dx: 3, dy: 13 + bob },
    { rows: BODY, dx: 7 + shift, dy: 16 },
    { rows: LEGS[legs], dx: 9 + shift, dy: 28 },
    { rows: HEAD, dx: 15 + shift, dy: 4 + bob },
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
  if (Math.abs(vx) > 8) return sp.walk.frames[Math.floor(t * (6 + Math.abs(vx) / 14)) % sp.walk.frames.length]!;
  return sp.idle.frames[Math.floor(t * sp.idle.fps) % sp.idle.frames.length]!;
}

void raster;
