// More-realistic pixel people, drawn from the private reference photos (never shipped).
// Her: center-parted dark shoulder-length hair, large eyes, black collared zip top, a hint of a silver necklace.
// Him: tousled upward dark hair, dark glasses, light shirt with navy collar, dark trousers; a little taller.
// (x, y) is feet-centre. flip = face left.

export type Who = 'her' | 'him';
export type Pose = 'stand' | 'walk' | 'run' | 'sit' | 'sleep' | 'lean' | 'kneel' | 'hold' | 'holdL';

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
  const a = Math.sin(gait) * (run ? 5 : 3);
  for (const side of [-1, 1]) {
    const swing = side * a;
    const x0 = cx + side * 2;
    for (let i = 0; i < 10; i++) {
      const x = x0 + swing * (i / 10);
      const y = y0 + i;
      span(g, x, y, 3, i === 0 || i === 9 ? INK : col);
    }
    // shoes
    span(g, x0 + swing - 1, y0 + 10, 4, INK);
  }
}

export function personH(who: Who, pose: Pose): number {
  if (pose === 'sleep') return 14;
  if (pose === 'sit' || pose === 'kneel') return 26;
  return who === 'him' ? 36 : 34;
}

export function drawPerson(g: CanvasRenderingContext2D, who: Who, pose: Pose, x: number, y: number, flip = false, t = 0) {
  g.save();
  g.translate(x | 0, y | 0);
  if (flip) { g.scale(-1, 1); }
  const gait = t * (pose === 'run' ? 10 : 7);
  const cx = 0;
  const expr = pose === 'sleep' ? 'sleep' : pose === 'lean' || pose === 'sit' ? 'soft' : pose === 'run' || pose === 'walk' ? 'smile' : 'open';

  if (pose === 'sleep') {
    // recumbent, head to the left
    for (let i = -10; i <= 12; i++) span(g, i, -4, 1, who === 'her' ? SHIRT : HIS);
    head(g, who, -10, -6, 'sleep');
    span(g, -4, -2, 16, who === 'her' ? '#F4EEF2' : HIS);
    g.restore();
    return;
  }

  const headY = pose === 'sit' ? -22 : pose === 'kneel' ? -24 : (who === 'him' ? -28 : -26);
  const torsoY = headY + 8;
  const torsoH = pose === 'sit' || pose === 'kneel' ? 10 : 12;

  if (pose === 'sit') {
    // seated legs forward
    const col = who === 'her' ? '#2A2428' : PANT;
    for (let i = 0; i < 8; i++) span(g, cx - 2 + i, -8, 3, col);
    span(g, cx + 5, -8, 4, INK);
    span(g, cx - 4, -8, 3, INK);
    torso(g, who, cx, torsoY, torsoH);
    head(g, who, cx, headY, expr);
    arm(g, who, cx - 5, torsoY + 2, -2, 5, 7);
    arm(g, who, cx + 5, torsoY + 2, 2, 5, 7);
  } else if (pose === 'kneel') {
    const col = who === 'her' ? '#2A2428' : PANT;
    span(g, cx - 6, -4, 8, col); span(g, cx - 7, -3, 4, INK);
    torso(g, who, cx, torsoY, torsoH);
    head(g, who, cx, headY, expr);
    arm(g, who, cx - 5, torsoY + 2, -3, 4, 6);
    arm(g, who, cx + 5, torsoY + 2, 4, 3, 6);
  } else {
    torso(g, who, cx, torsoY, torsoH);
    head(g, who, cx, headY, expr);
    const moving = pose === 'walk' || pose === 'run';
    const amp = pose === 'run' ? 6 : pose === 'hold' ? 0 : pose === 'lean' ? 1 : 4;
    const swing = moving ? Math.sin(gait) * amp : (pose === 'hold' ? 7 : pose === 'lean' ? 3 : 0);
    if (pose === 'hold') {
      arm(g, who, cx + 5, torsoY + 2, 8, 1, 8);
      arm(g, who, cx - 5, torsoY + 2, -2, 6, 7);
    } else if (pose === 'holdL') {
      arm(g, who, cx - 5, torsoY + 2, -8, 1, 8);
      arm(g, who, cx + 5, torsoY + 2, 2, 6, 7);
    } else if (pose === 'lean') {
      arm(g, who, cx + 5, torsoY + 2, 5, 3, 7);
      arm(g, who, cx - 5, torsoY + 2, -3, 5, 7);
    } else {
      arm(g, who, cx - 5, torsoY + 2, -2, 6 + (moving ? -swing : 0) * 0.3, 8);
      arm(g, who, cx + 5, torsoY + 2, 2, 6 + (moving ? swing : 0) * 0.3, 8);
    }
    if (pose === 'walk' || pose === 'run' || pose === 'stand' || pose === 'hold' || pose === 'holdL' || pose === 'lean') {
      legs(g, who, cx, torsoY + torsoH, moving ? gait : 0, pose === 'run');
    }
  }
  g.restore();
}

// pets reused from fauna — thin wrappers so montage can pick frames
export { critterFrame } from '../../shared/pixel/fauna';
