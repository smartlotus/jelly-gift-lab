// More-realistic pixel people, drawn from the private reference photos (never shipped).
// Her: center-parted dark shoulder-length hair, large eyes, black collared zip top, a hint of a silver necklace.
// Him: tousled upward dark hair, dark glasses, light shirt with navy collar, dark trousers; a little taller.
// (x, y) is feet-centre. flip = face left.

export type Who = 'her' | 'him';
export type Pose = 'stand' | 'walk' | 'run' | 'sit' | 'sleep' | 'lean' | 'kneel' | 'hold' | 'holdL' | 'runHold' | 'runHoldL';

const SKIN = '#E6C2AE';
const SKIN_S = '#D4A894';
const INK = '#2A2426';
const HAIR = '#1A1618';
const HAIR_H = '#2E282A';
const SHIRT = '#1A1A1C'; // her black collar top
const HIS = '#F2EFE6';   // his light tee
const NAVY = '#2A3544';
const PANT = '#2C3034';

function px(g: CanvasRenderingContext2D, x: number, y: number, c: string) {
  g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1);
}
function span(g: CanvasRenderingContext2D, x: number, y: number, w: number, c: string) {
  g.fillStyle = c; g.fillRect(x | 0, y | 0, w, 1);
}

function head(g: CanvasRenderingContext2D, who: Who, cx: number, cy: number, expr: 'open' | 'soft' | 'sleep' | 'smile') {
  // oval face
  for (let dy = -5; dy <= 6; dy++) {
    const w = dy < -3 ? 3 : dy > 4 ? 3 : 5;
    for (let dx = -w; dx <= w; dx++) {
      const edge = Math.abs(dx) === w || dy === -5 || dy === 6;
      px(g, cx + dx, cy + dy, edge ? INK : SKIN);
    }
  }
  // ears
  px(g, cx - 6, cy + 1, SKIN); px(g, cx + 6, cy + 1, SKIN);
  px(g, cx - 6, cy + 2, SKIN_S); px(g, cx + 6, cy + 2, SKIN_S);

  if (who === 'her') {
    // hair cap with a clear centre part, then thin shoulder-length curtains that do not cover the face
    for (let dy = -8; dy <= -4; dy++) {
      const w = dy === -8 ? 4 : dy === -7 ? 6 : 7;
      for (let dx = -w; dx <= w; dx++) {
        if (Math.abs(dx) <= 1 && dy >= -7) continue; // part
        px(g, cx + dx, cy + dy, Math.abs(dx) === w || dy === -8 ? INK : HAIR);
      }
    }
    // side locks down to the collar, staying outside the cheeks
    for (let dy = -3; dy <= 8; dy++) {
      for (const s of [-1, 1]) {
        const inset = dy < 3 ? 6 : 5;
        px(g, cx + s * inset, cy + dy, HAIR);
        px(g, cx + s * (inset + 1), cy + dy, dy === 8 ? INK : HAIR_H);
        if (dy > 2) px(g, cx + s * (inset + 2), cy + dy, INK);
      }
    }
    span(g, cx - 1, cy - 7, 3, SKIN);
    px(g, cx, cy - 8, SKIN_S);
  } else {
    // tousled spikes going up and out
    const spikes = [-5, -3, -1, 1, 3, 5];
    for (const s of spikes) {
      const top = cy - 8 - (Math.abs(s) === 1 ? 2 : Math.abs(s) === 3 ? 1 : 0);
      for (let y = top; y <= cy - 3; y++) px(g, cx + s + (y < cy - 6 ? Math.sign(s) : 0), y, y === top ? INK : HAIR);
    }
    for (let dy = -6; dy <= 0; dy++) {
      for (let dx = -6; dx <= 6; dx++) if (Math.abs(dx) > 3 || dy < -3) px(g, cx + dx, cy + dy, Math.abs(dx) === 6 || dy === -6 ? INK : HAIR);
    }
    // dark glasses
    span(g, cx - 5, cy, 11, INK);
    span(g, cx - 4, cy + 1, 3, '#1A1A1C');
    span(g, cx + 1, cy + 1, 3, '#1A1A1C');
    px(g, cx - 3, cy + 1, '#3A3A42'); px(g, cx + 2, cy + 1, '#3A3A42');
  }

  if (expr !== 'sleep') {
    if (who === 'her') {
      // large dark eyes
      px(g, cx - 2, cy, INK); px(g, cx + 2, cy, INK);
      px(g, cx - 2, cy + 1, INK); px(g, cx + 2, cy + 1, INK);
      px(g, cx - 1, cy, '#F6E6DC'); px(g, cx + 3, cy, '#F6E6DC');
    } else if (expr === 'open' || expr === 'smile' || expr === 'soft') {
      // eyes peek under glasses if we didn't already fill them
    }
  } else {
    span(g, cx - 3, cy + 1, 2, INK); span(g, cx + 2, cy + 1, 2, INK);
  }
  // brows / mouth
  if (who === 'her') {
    span(g, cx - 3, cy - 2, 2, INK); span(g, cx + 2, cy - 2, 2, INK);
    if (expr === 'smile') { px(g, cx - 1, cy + 3, INK); px(g, cx, cy + 4, INK); px(g, cx + 1, cy + 3, INK); }
    else if (expr === 'sleep') span(g, cx - 1, cy + 3, 3, SKIN_S);
    else span(g, cx - 1, cy + 3, 3, SKIN_S), px(g, cx, cy + 3, INK);
  } else {
    if (expr === 'smile') { px(g, cx - 1, cy + 3, INK); px(g, cx, cy + 4, INK); px(g, cx + 1, cy + 3, INK); }
    else if (expr !== 'sleep') px(g, cx, cy + 3, INK);
  }
}

function torso(g: CanvasRenderingContext2D, who: Who, cx: number, y0: number, h: number) {
  if (who === 'her') {
    // black collared zip top
    for (let y = 0; y < h; y++) span(g, cx - 5, y0 + y, 11, y === 0 || y === h - 1 ? INK : SHIRT);
    // collar
    px(g, cx - 2, y0, SKIN); px(g, cx + 2, y0, SKIN);
    px(g, cx - 3, y0 + 1, INK); px(g, cx + 3, y0 + 1, INK);
    px(g, cx, y0 + 1, '#4A4A50'); // zip
    px(g, cx, y0 + 2, '#3A3A40');
    // necklace
    px(g, cx - 1, y0 + 3, '#D0D4D8'); px(g, cx + 1, y0 + 3, '#D0D4D8'); px(g, cx, y0 + 4, '#C8CCD0');
  } else {
    for (let y = 0; y < h; y++) span(g, cx - 5, y0 + y, 11, y === 0 || y === h - 1 ? INK : HIS);
    // navy collar / sleeve trim
    span(g, cx - 3, y0, 7, NAVY);
    px(g, cx - 5, y0 + 1, NAVY); px(g, cx + 5, y0 + 1, NAVY);
    px(g, cx - 5, y0 + 2, NAVY); px(g, cx + 5, y0 + 2, NAVY);
  }
}

function arm(g: CanvasRenderingContext2D, who: Who, x: number, y: number, dx: number, dy: number, len: number) {
  const col = who === 'her' ? SHIRT : HIS;
  for (let i = 0; i <= len; i++) {
    const t = i / len;
    px(g, x + dx * t, y + dy * t, i === 0 || i === len ? INK : (i > len * 0.7 ? SKIN : col));
    px(g, x + dx * t + (Math.abs(dx) < Math.abs(dy) ? 1 : 0), y + dy * t + (Math.abs(dx) >= Math.abs(dy) ? 1 : 0), i > len * 0.7 ? SKIN : col);
  }
  px(g, x + dx, y + dy, SKIN);
}

function legs(g: CanvasRenderingContext2D, who: Who, cx: number, y0: number, gait: number, run: boolean) {
  const col = who === 'her' ? '#2A2428' : PANT;
  const stride = run ? 8 : 6;
  const lift = run ? 4 : 3;
  const len = run ? 9 : 10;
  for (const side of [-1, 1]) {
    const ang = gait + (side < 0 ? 0 : Math.PI);
    const fwd = Math.sin(ang) * stride;
    const up = Math.max(0, -Math.cos(ang)) * lift;
    const hipX = cx + side * 2;
    const footX = cx + fwd;
    const footY = y0 + len - up;
    for (let i = 0; i <= len; i++) {
      const tt = i / len;
      const x = hipX + (footX - hipX) * tt;
      const y = y0 + (footY - y0) * tt;
      span(g, x, y, 3, i === 0 || i === len ? INK : col);
    }
    span(g, footX - 1, footY, 4, INK);
  }
}

export function personH(who: Who, pose: Pose): number {
  if (pose === 'sleep') return 10;
  if (pose === 'sit' || pose === 'kneel') return 20;
  return who === 'him' ? 36 : 34;
}

export function drawPerson(g: CanvasRenderingContext2D, who: Who, pose: Pose, x: number, y: number, flip = false, t = 0) {
  g.save();
  g.translate(x | 0, y | 0);
  if (flip) { g.scale(-1, 1); }
  const isRun = pose === 'run' || pose === 'runHold' || pose === 'runHoldL';
  const moving = pose === 'walk' || pose === 'hold' || pose === 'holdL' || isRun;
  const gait = t * (isRun ? 11 : 8);
  const bob = moving ? Math.round(Math.abs(Math.sin(gait)) * (isRun ? 2 : 1)) : 0;
  if (bob) g.translate(0, -bob);
  const cx = 0;
  const expr = pose === 'sleep' ? 'sleep' : pose === 'lean' || pose === 'sit' ? 'soft' : moving ? 'smile' : 'open';

  if (pose === 'sleep') {
    const shirt = who === 'her' ? SHIRT : HIS;
    const col = who === 'her' ? '#2A2428' : PANT;
    head(g, who, -14, -3, 'sleep');
    for (let i = -6; i <= 20; i++) {
      span(g, i, -2, 1, shirt);
      span(g, i, -1, 1, shirt);
      span(g, i, 0, 1, shirt);
      span(g, i, 1, 1, i > 10 ? col : shirt);
      span(g, i, 2, 1, col);
      span(g, i, 3, 1, col);
    }
    span(g, 19, 3, 5, INK);
    span(g, -4, 4, 8, SKIN);
    g.restore();
    return;
  }

  if (pose === 'lean') {
    const dir = who === 'him' ? 1 : -1;
    const headY = who === 'him' ? -27 : -25;
    const torsoY = headY + 8;
    head(g, who, cx + dir * 5, headY + 2, 'soft');
    torso(g, who, cx + dir * 3, torsoY + 2, 12);
    arm(g, who, cx + dir * 5, torsoY + 4, dir * 8, 4, 8);
    arm(g, who, cx - dir * 5, torsoY + 3, -dir * 1, 7, 7);
    const col = who === 'her' ? '#2A2428' : PANT;
    for (let i = 0; i < 11; i++) {
      span(g, cx + dir * 1 + (i < 6 ? -dir : dir), torsoY + 12 + i, 3, i === 0 || i === 10 ? INK : col);
    }
    span(g, cx + dir * 3 - 1, torsoY + 22, 4, INK);
    span(g, cx - dir * 2 - 1, torsoY + 22, 4, INK);
    g.restore();
    return;
  }

  const headY = pose === 'sit' ? -18 : pose === 'kneel' ? -20 : (who === 'him' ? -28 : -26);
  const torsoY = headY + 8;
  const torsoH = pose === 'sit' ? 9 : pose === 'kneel' ? 11 : 12;

  if (pose === 'sit') {
    const col = who === 'her' ? '#2A2428' : PANT;
    // hips on the seat, thighs forward as a solid lap, shins down
    span(g, cx - 5, -8, 11, col);
    span(g, cx - 4, -7, 10, col);
    for (let i = 0; i < 9; i++) span(g, cx + 1 + i, -6, 3, col);
    span(g, cx + 8, -5, 3, col);
    span(g, cx + 8, -3, 3, INK);
    torso(g, who, cx, torsoY, torsoH);
    head(g, who, cx, headY, expr);
    arm(g, who, cx - 5, torsoY + 3, -2, 5, 6);
    arm(g, who, cx + 5, torsoY + 3, 2, 5, 6);
  } else if (pose === 'kneel') {
    const col = who === 'her' ? '#2A2428' : PANT;
    // shins along the floor, knees up, torso sitting on the heels
    span(g, cx - 9, -2, 12, col);
    span(g, cx - 10, -1, 14, col);
    span(g, cx - 10, 0, 4, INK);
    span(g, cx - 3, -6, 7, col);
    span(g, cx - 4, -5, 8, col);
    torso(g, who, cx, torsoY, torsoH);
    head(g, who, cx, headY, expr);
    arm(g, who, cx - 5, torsoY + 3, -4, 5, 7);
    arm(g, who, cx + 5, torsoY + 3, 5, 4, 7);
  } else {
    torso(g, who, cx, torsoY, torsoH);
    head(g, who, cx, headY, expr);
    const swing = moving ? Math.sin(gait) * (isRun ? 5 : 4) : 0;
    if (pose === 'hold' || pose === 'runHold') {
      arm(g, who, cx + 5, torsoY + 2, 9, 1, 8);
      arm(g, who, cx - 5, torsoY + 2, -3, 6 + (moving ? -swing * 0.25 : 0), 7);
    } else if (pose === 'holdL' || pose === 'runHoldL') {
      arm(g, who, cx - 5, torsoY + 2, -9, 1, 8);
      arm(g, who, cx + 5, torsoY + 2, 3, 6 + (moving ? swing * 0.25 : 0), 7);
    } else {
      arm(g, who, cx - 5, torsoY + 2, -3, 6 + (moving ? -swing : 0) * 0.55, 8);
      arm(g, who, cx + 5, torsoY + 2, 3, 6 + (moving ? swing : 0) * 0.55, 8);
    }
    legs(g, who, cx, torsoY + torsoH, moving ? gait : 0, isRun);
  }
  g.restore();
}

// pets reused from fauna — thin wrappers so montage can pick frames
export { critterFrame } from '../../shared/pixel/fauna';
