// Attractive semi-realistic pixel couple drawn from authored pose sheets.
// Individual stand/walk frames for greet + transform; pair frames for walk/sit/sleep/lean/run.
import { art } from '../../art/loader';
import { blitFeet } from '../../art/blit';

export type Who = 'her' | 'him';
export type Pose = 'stand' | 'walk' | 'run' | 'sit' | 'sleep' | 'lean' | 'kneel' | 'hold' | 'holdL' | 'runHold' | 'runHoldL';
export type PairPose = 'walk' | 'run' | 'sit' | 'sleep' | 'lean' | 'hold' | 'stand';

export function personH(who: Who, pose: Pose): number {
  if (pose === 'sleep') return 48;
  if (pose === 'sit' || pose === 'kneel') return 78;
  return who === 'him' ? 104 : 100;
}

function soloSprite(who: Who, pose: Pose): HTMLCanvasElement | undefined {
  const moving = pose === 'walk' || pose === 'hold' || pose === 'holdL' || pose === 'run' || pose === 'runHold' || pose === 'runHoldL';
  const key = who === 'her' ? (moving ? 'her-walk' : 'her-stand') : (moving ? 'him-walk' : 'him-stand');
  return art.people[key];
}

export function drawPerson(g: CanvasRenderingContext2D, who: Who, pose: Pose, x: number, y: number, flip = false, _t = 0) {
  const img = soloSprite(who, pose);
  if (!img) return;
  blitFeet(g, img, x, y, flip, personH(who, pose));
}

export function drawPair(g: CanvasRenderingContext2D, pose: PairPose, x: number, y: number, t: number, flip = false, targetH = 112) {
  let img: HTMLCanvasElement | undefined;
  if (pose === 'walk') img = art.people[`walk${Math.floor(Math.max(0, t) * 7) % 4}`];
  else if (pose === 'run') img = art.people[`run${Math.floor(Math.max(0, t) * 9) % 4}`];
  else if (pose === 'stand' || pose === 'hold') img = art.people.hold ?? art.people.walk0;
  else img = art.people[pose];
  if (!img) {
    // last resort: two solo sprites
    drawPerson(g, 'him', 'stand', x - 16, y, flip, t);
    drawPerson(g, 'her', 'stand', x + 16, y, flip, t);
    return;
  }
  blitFeet(g, img, x, y, flip, targetH);
}

export { critterFrame } from '../../shared/pixel/fauna';
