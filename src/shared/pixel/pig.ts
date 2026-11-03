// The pig (lotus): a pixel pig made to stand next to cat.ts - same 16x16 frame, same soft-black outline, same sleepy closed
// eyes and blush, big head / small body. Pink body, rounded floppy ears, a snout with two nostrils, a curly tail.
// Frames and API mirror the cat (pigSprites() / pigFrame()) so any platformer body can use either.
import { anim, raster, compose, outline, type Anim, type Palette, type Layer } from './sprite';

export const PIG_PAL: Palette = { k: '#2E2A2B', w: '#FBD3DB', s: '#F2B3C2', p: '#E98DA5', b: '#F7A3B6', y: '#FFD45C', r: '#E85A7A', n: '#C9667F' };

const HEAD = [
  '...kk.......kk..',
  '..kppk.....kppk.',
  '..kpppkkkkkpppk.',
  '..kwwwwwwwwwwwk.',
  '.kwwwwwwwwwwwwwk',
  '.kwwwwwwwwwwwwwk',
  '.kwbbwwpppppwbbk',
  '.kwwwwpnpppnpwwk',
  '.kwwwwwpppppwwwk',
  '..kwwwwwwwwwwwk.',
];
const HEAD_BACK = [
  '...kk.......kk..',
  '..kppk.....kppk.',
  '..kpppkkkkkpppk.',
  '..kwwwwwwwwwwwk.',
  '.kwwwwwwwwwwwwwk',
  '.kwwwwwwwwwwwwwk',
  '.kwwwwwwwwwwwwwk',
  '.kswwwwwwwwwwwsk',
  '.ksswwwwwwwwwssk',
  '..kssswwwwwsssk.',
];
const EYES = {
  sleepy: ['................', '.....kkk...kkk..'],
  happy: ['......k.....k...', '.....kwk...kwk..'],
  open: ['......k.....k...', '......k.....k...'],
  blink: ['................', '....kkkk..kkkk..'],
};
const BODY = ['...kwwwwwwwwwk..', '...kwwwwwwwwwk..', '...kswwwwwwwsk..', '...ksswwwwwssk..'];
const LEGS = {
  stand: ['...kwwkkkkkwwk..', '...knk.....knk..'],
  stride: ['..kwwkkkkkkkwwk.', '..knk.......knk.'],
  stride2: ['...kwwkkkkkkwwk.', '...knk......knk.'],
  pass: ['....kwwkkkwwk...', '....knk...knk...'],
  tuck: ['...kswkkkkkwsk..', '....kk.....kk...'],
  dangle: ['..kwk.kkkkk.kwk.', '..kk.........kk.'],
};
const TAIL = {
  curl: ['.kk.', 'kppk', 'k.pk', '.kpk', '..k.'],
  curl2: ['....', '.kk.', 'kppk', 'kkpk', '..k.'],
};
type Eyes = keyof typeof EYES; type Legs = keyof typeof LEGS; type Tail = keyof typeof TAIL;
function pig(o: { eyes?: Eyes; legs?: Legs; tail?: Tail; bob?: number }): string[] {
  const bob = o.bob ?? 0;
  const head: Layer[] = [{ rows: HEAD, dy: bob }, { rows: EYES[o.eyes ?? 'sleepy'], dy: 4 + bob }];
  return compose(16, 16, { rows: TAIL[o.tail ?? 'curl'], dy: 9 + Math.min(1, bob) }, { rows: BODY, dy: 10 }, { rows: LEGS[o.legs ?? 'stand'], dy: 14 }, ...head);
}
const SQUASH = compose(16, 16, { rows: TAIL.curl2, dy: 10 },
  { rows: ['..kwwwwwwwwwwwk.', '..kswwwwwwwwwsk.', '.kkwwkkkkkkkwwkk', '.knkk.......kknk'], dy: 12 },
  { rows: HEAD, dy: 2 }, { rows: EYES.blink, dy: 6 });
const BACK = (legs: Legs) => compose(16, 16, { rows: BODY, dy: 10 }, { rows: LEGS[legs], dy: 14 }, { rows: HEAD_BACK }, { rows: TAIL.curl, dx: 6, dy: 10 });

export const PIG_FRAMES = {
  idle: [pig({}), pig({ tail: 'curl2' }), pig({ eyes: 'blink' })],
  walk: [pig({ legs: 'stride' }), pig({ legs: 'pass', bob: 1, tail: 'curl2' }), pig({ legs: 'stride2' }), pig({ legs: 'pass', bob: 1, tail: 'curl2' })],
  jump: [pig({ legs: 'tuck', eyes: 'happy', tail: 'curl2' })],
  fall: [pig({ legs: 'dangle', eyes: 'open' })],
  land: [SQUASH],
  back: [BACK('stand'), BACK('pass')],
  happy: [pig({ eyes: 'happy' }), pig({ eyes: 'happy', legs: 'tuck', tail: 'curl2' })],
  q: [outline(['yy.yy.', '..y..y', '.y..y.', '......', '.y..y.'])], // its '??' (from the doodle)
};
export interface PigSprites { idle: Anim; walk: Anim; jump: HTMLCanvasElement; fall: HTMLCanvasElement; land: HTMLCanvasElement; back: Anim; happy: Anim; q: HTMLCanvasElement }
let cache: PigSprites | null = null;
export function pigSprites(): PigSprites {
  if (cache) return cache;
  const F = PIG_FRAMES, r = (f: string[]) => raster(f, PIG_PAL);
  const idle = anim([F.idle[0], F.idle[0], F.idle[0], F.idle[1], F.idle[1], F.idle[0], F.idle[0], F.idle[2]], PIG_PAL, 4);
  return (cache = { idle, walk: anim(F.walk, PIG_PAL, 10), jump: r(F.jump[0]), fall: r(F.fall[0]), land: r(F.land[0]), back: anim(F.back, PIG_PAL, 6), happy: anim(F.happy, PIG_PAL, 6), q: raster(F.q[0], PIG_PAL) });
}
/** same frame picker as catFrame() */
export function pigFrame(sp: PigSprites, b: { vx: number; vy: number; ground: boolean }, t: number, land = 1): HTMLCanvasElement {
  if (!b.ground) return b.vy < 40 ? sp.jump : sp.fall;
  if (land < 0.08) return sp.land;
  if (Math.abs(b.vx) > 8) return sp.walk.frames[Math.floor(t * (6 + Math.abs(b.vx) / 14)) % sp.walk.frames.length];
  return sp.idle.frames[Math.floor(t * sp.idle.fps) % sp.idle.frames.length];
}
