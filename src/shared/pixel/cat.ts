// The hero: a Cat-Mario-style pixel cat designed from lotus's cat doodle (ref_B_cat_book.jpg):
// cream body + soft-black outline, the doodle's sleepy closed eyes, an 'ω' (:3) mouth, pink inner ears, blush,
// an upright tail with a pink band, and its signature reaction: a yellow '!!' popping above the head.
// Big head / small body (Syobon proportions), 16x16, faces right (draw(..., flip) for left), feet on the bottom row.
// Shared by stage 1 (meadow) and stage 2 (shop). API is additive: idle/walk/jump/bang (M0) + fall/land/back/happy/sit/look.
// Frames are composed from layers (head + eyes + mouth + body + legs + tail) so variants stay consistent.
import { anim, raster, compose, outline, type Anim, type Palette, type Layer } from './sprite';

export const CAT_PAL: Palette = { k: '#2E2A2B', w: '#FFF4E4', s: '#EBD5BC', p: '#F4A7B9', b: '#F9B8C6', y: '#FFD45C', r: '#E85A7A' };

const HEAD = [
  '....k.......k...',
  '...kpk.....kpk..',
  '...kppkkkkkppk..',
  '..kwwwwwwwwwwwk.',
  '.kwwwwwwwwwwwwwk',
  '.kwwwwwwwwwwwwwk',
  '.kwbbwwwwwwwwbbk',
  '.kwwwwwwwwwwwwwk',
  '.kwwwwwwwwwwwwwk',
  '..kwwwwwwwwwwwk.',
];
const HEAD_BACK = [
  '....k.......k...',
  '...ksk.....ksk..',
  '...ksskkkkkssk..',
  '..kwwwwwwwwwwwk.',
  '.kwwwwwwwwwwwwwk',
  '.kwwwwwwwwwwwwwk',
  '.kwwwwwwwwwwwwwk',
  '.kswwwwwwwwwwwsk',
  '.ksswwwwwwwwwssk',
  '..kssswwwwwsssk.',
];
// faces (overlaid on HEAD rows 4..8). 'w' erases.
const EYES = {
  sleepy: ['................', '.....kkk...kkk..'],                       // the doodle's content closed eyes
  happy: ['......k.....k...', '.....kwk...kwk..'],                       // ^ ^
  open: ['......k.....k...', '......k.....k...'],                        // dot eyes (surprised '!!')
  blink: ['................', '....kkkk..kkkk..'],
};
const MOUTH = {
  w: ['.......k.k.k....', '........k.k.....'],                          // ω
  open: ['........kkk.....', '........krk.....'],
  o: ['.........k......', '........k.k.....'],
};
const BODY = [
  '...kwwwwwwwwwk..',
  '...kwwwwwwwwwk..',
  '...kswwwwwwwsk..',
  '...ksswwwwwssk..',
];
const LEGS = {
  stand: ['...kwwkkkkkwwk..', '...kkk.....kkk..'],
  // planted left paw forward, right paw lifted off the ground row
  stride: ['.kwwk.kkkk.kww..', '.kkk............'],
  // planted right paw forward, left paw lifted
  stride2: ['..kww.kkkk.kwwk.', '............kkk.'],
  pass: ['..kwwkkkkkwwk...', '...kkk...kkk....'],
  tuck: ['...kswkkkkkwsk..', '....kk.....kk...'],
  dangle: ['..kwk.kkkkk.kwk.', '..kk.........kk.'],
};
const TAIL = {
  up: ['.k..', 'kwk.', 'kpk.', 'kwk.', 'kwwk', '.kk.'],
  bent: ['kk..', 'kwk.', 'kpk.', 'kwk.', 'kwwk', '.kk.'],
  low: ['....', 'k...', 'kk..', 'kpk.', 'kwwk', '.kk.'],
  back: ['.k.', 'kwk', 'kpk', 'kwk', 'kwk'],
};
type Eyes = keyof typeof EYES; type Mouth = keyof typeof MOUTH; type Legs = keyof typeof LEGS; type Tail = keyof typeof TAIL;
function cat(o: { eyes?: Eyes; mouth?: Mouth; legs?: Legs; tail?: Tail; bob?: number; ear?: boolean; shift?: number }): string[] {
  const bob = o.bob ?? 0;
  const sh = o.shift ?? 0;
  const head: Layer[] = [{ rows: HEAD, dy: bob, dx: sh }, { rows: EYES[o.eyes ?? 'sleepy'], dy: 4 + bob, dx: sh }, { rows: MOUTH[o.mouth ?? 'w'], dy: 7 + bob, dx: sh }];
  if (o.ear) head.push({ rows: ['...........k....', '..........kp....'], dy: bob, dx: sh }); // right ear flick
  return compose(16, 16, { rows: TAIL[o.tail ?? 'up'], dy: 8 + Math.min(1, bob), dx: sh }, { rows: BODY, dy: 10, dx: sh }, { rows: LEGS[o.legs ?? 'stand'], dy: 14 }, ...head);
}
const SQUASH = compose(16, 16,
  { rows: TAIL.low, dy: 9 },
  { rows: ['..kwwwwwwwwwwwk.', '..kswwwwwwwwwsk.', '.kkwwkkkkkkkwwkk', '.kkkk.......kkkk'], dy: 12 },
  { rows: HEAD, dy: 2 }, { rows: EYES.blink, dy: 6 }, { rows: MOUTH.w, dy: 9 });
const SIT = compose(16, 16,
  { rows: ['..kwwwwwwwwwwk..', '.kswwwwwwwwwwsk.', '.ksswkwwwkwwssk.', '.kkkkkkkkkkkkkk.'], dy: 12 },
  { rows: ['.k', 'kp', 'kw'], dy: 11, dx: 14 },
  { rows: HEAD, dy: 2 }, { rows: EYES.sleepy, dy: 6 }, { rows: MOUTH.w, dy: 9 });
const BACK = (legs: Legs) => compose(16, 16, { rows: BODY, dy: 10 }, { rows: LEGS[legs], dy: 14 }, { rows: HEAD_BACK }, { rows: TAIL.back, dx: 7, dy: 9 });

/** every frame as raw string art (also read by tools/pixel/sheet.ts) */
export const CAT_FRAMES = {
  idle: [cat({}), cat({ tail: 'bent' }), cat({ tail: 'bent', ear: true }), cat({ eyes: 'blink' })],
  walk: [cat({ legs: 'stride', shift: -1 }), cat({ legs: 'pass', bob: 2, tail: 'bent' }), cat({ legs: 'stride2', shift: 1 }), cat({ legs: 'pass', bob: 2, tail: 'bent' })],
  jump: [cat({ legs: 'tuck', eyes: 'happy', mouth: 'o', tail: 'bent' })],
  fall: [cat({ legs: 'dangle', eyes: 'open', mouth: 'o', tail: 'up' })],
  land: [SQUASH],
  back: [BACK('stand'), BACK('pass')],
  happy: [cat({ eyes: 'happy', mouth: 'open' }), cat({ eyes: 'happy', mouth: 'open', legs: 'tuck', tail: 'bent' })],
  look: [cat({ eyes: 'open', mouth: 'o' })],
  sit: [SIT, compose(16, 16, { rows: SIT }, { rows: EYES.open, dy: 6 })],
  bang: [outline(['y.y', 'y.y', 'y.y', '...', 'y.y'])],
  heart: [outline(['rr.rr', 'rrrrr', '.rrr.', '..r..'])],
};

export interface CatSprites {
  idle: Anim; walk: Anim; jump: HTMLCanvasElement; bang: HTMLCanvasElement;
  fall: HTMLCanvasElement; land: HTMLCanvasElement; back: Anim; happy: Anim; look: HTMLCanvasElement; sit: HTMLCanvasElement; sitAlert: HTMLCanvasElement; heart: HTMLCanvasElement;
}
let cache: CatSprites | null = null;
export function catSprites(): CatSprites {
  if (cache) return cache;
  const F = CAT_FRAMES, r = (f: string[]) => raster(f, CAT_PAL);
  // idle: mostly still, a tail swish + ear flick + a slow blink, ~2.5 s cycle
  const idle = anim([F.idle[0], F.idle[0], F.idle[0], F.idle[1], F.idle[1], F.idle[0], F.idle[0], F.idle[3], F.idle[0], F.idle[2]], CAT_PAL, 4);
  return (cache = {
    idle, walk: anim(F.walk, CAT_PAL, 10), jump: r(F.jump[0]), fall: r(F.fall[0]), land: r(F.land[0]),
    back: anim(F.back, CAT_PAL, 6), happy: anim(F.happy, CAT_PAL, 6), look: r(F.look[0]), sit: r(F.sit[0]), sitAlert: r(F.sit[1]),
    bang: raster(F.bang[0], CAT_PAL), heart: raster(F.heart[0], CAT_PAL),
  });
}

/** pick the right frame for a platformer body. `land` = seconds since landing (squash for ~80 ms). */
export function catFrame(sp: CatSprites, b: { vx: number; vy: number; ground: boolean }, t: number, land = 1): HTMLCanvasElement {
  if (!b.ground) return b.vy < 40 ? sp.jump : sp.fall;
  if (land < 0.08) return sp.land;
  if (Math.abs(b.vx) > 8) return sp.walk.frames[Math.floor(t * (6 + Math.abs(b.vx) / 14)) % sp.walk.frames.length];
  return sp.idle.frames[Math.floor(t * sp.idle.fps) % sp.idle.frames.length];
}
