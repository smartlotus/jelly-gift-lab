// The pig companion, in the same painted pixel idiom as the wander cat (public/art/fauna/pig-0..3.png).
// Falls back to the original 16² procedural sheet (pig.ts, drawn at 2×) if the painted frames are missing,
// so a stale build or a stripped public/art never leaves the woods without a companion.
import { art } from '../../art/loader';
import { pigSprites, type PigSprites } from './pig';

/** two pixels of transparent breathing room baked into every painted frame */
export const PIG_PAD = 2;

let fallback: PigSprites | null = null;

export interface PigPaint { frames: HTMLCanvasElement[]; pad: number; scaled: boolean }

let cache: PigPaint | null = null;

export function pigPaint(): PigPaint {
  if (cache) return cache;
  const walk = art.fauna.pig?.walk ?? [];
  if (walk.length >= 2) return (cache = { frames: walk, pad: PIG_PAD, scaled: false });
  fallback ??= pigSprites();
  return (cache = { frames: fallback.walk.frames, pad: 0, scaled: true });
}

/** walk cycle when moving, first frame when standing; `t` is seconds, `vx` world px/s. */
export function pigPaintFrame(p: PigPaint, vx: number, t: number): { img: HTMLCanvasElement; scale: number } {
  const n = p.frames.length;
  if (!n) return { img: pigPaint().frames[0]!, scale: 2 };
  const moving = Math.abs(vx) > 6;
  const i = moving ? Math.floor(t * (6 + Math.abs(vx) / 12)) % n : 0;
  return { img: p.frames[i]!, scale: p.scaled ? 2 : 1 };
}

/** call after art loading in case a stage preloaded a different kit */
export function resetPigPaint() { cache = null; }
