// The future film (Module B): a fixed, art-directed short about the house they fill together.
// It never reads the player's layout — the montage is the same for an empty save and a cluttered one.
//
// Art direction (rewritten after the painted-plate version read as "figures dissolving into the set"):
//   · sets are soft, low-saturation gouache washes with no outlines and no fine detail
//   · the couple is drawn as flat shapes with a warm ink outline, a rim light and a contact shadow
//   · framing is medium/close instead of tiny figures on a wide plate
//   · a paper grain + vignette sits over everything so it reads as film, not as UI
// The canvas is re-configured to ~1 device pixel per CSS pixel while this plays (see main.ts fit()).

const INK = '#33241F';
interface Palette { hair: string; skin: string; top: string; bottom: string; shoe: string; blush: string }
const HER: Palette = { hair: '#4A3230', skin: '#F9DDC6', top: '#F1DCC2', bottom: '#DD8C99', shoe: '#7C4744', blush: '#EFA6A2' };
const HIM: Palette = { hair: '#3B2C28', skin: '#F2CBAC', top: '#93AEC8', bottom: '#4B5060', shoe: '#39343F', blush: '#E8A98F' };

export const SCENE_IDS = ['walk', 'greet', 'sofa', 'sleep', 'snow', 'dawn'] as const;
export type SceneId = typeof SCENE_IDS[number];
const DURS: Record<SceneId, number> = { walk: 7.0, greet: 5.4, sofa: 6.0, sleep: 5.6, snow: 6.2, dawn: 8.0 };
const FADE = 0.9;

export interface FilmApi {
  update(dt: number): void;
  render(g: CanvasRenderingContext2D, w: number, h: number): void;
  skip(): void;
  replay(): void;
  seek(id: SceneId | 'finale', t?: number): void;
  get scene(): SceneId | 'finale';
  get finaleT(): number;
}

// ---------------------------------------------------------------- primitives

type Pt = [number, number];

function path(g: CanvasRenderingContext2D, pts: Pt[], close = false) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  if (close) g.closePath();
}

/** a limb: ink halo underneath, flat colour on top — the shape that keeps figures off the set */
function limb(g: CanvasRenderingContext2D, pts: Pt[], width: number, colour: string, ink = 3.4) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = INK; g.lineWidth = width + ink; path(g, pts); g.stroke();
  g.strokeStyle = colour; g.lineWidth = width; path(g, pts); g.stroke();
}

function shape(g: CanvasRenderingContext2D, build: () => void, fill: string, ink = 3.4) {
  build();
  g.fillStyle = fill; g.fill();
  if (ink > 0) { g.strokeStyle = INK; g.lineWidth = ink; g.lineJoin = 'round'; g.stroke(); }
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.lineTo(x + w - rr, y); g.quadraticCurveTo(x + w, y, x + w, y + rr);
  g.lineTo(x + w, y + h - rr); g.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  g.lineTo(x + rr, y + h); g.quadraticCurveTo(x, y + h, x, y + h - rr);
  g.lineTo(x, y + rr); g.quadraticCurveTo(x, y, x + rr, y);
  g.closePath();
}

function contactShadow(g: CanvasRenderingContext2D, x: number, y: number, w: number, a = 0.26) {
  const grd = g.createRadialGradient(x, y, 1, x, y, w);
  grd.addColorStop(0, `rgba(46,30,22,${a})`);
  grd.addColorStop(0.55, `rgba(46,30,22,${a * 0.45})`);
  grd.addColorStop(1, 'rgba(46,30,22,0)');
  g.fillStyle = grd;
  g.save(); g.translate(x, y); g.scale(1, 0.34); g.beginPath(); g.arc(0, 0, w, 0, Math.PI * 2); g.fill(); g.restore();
}

function softLight(g: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) {
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, `rgba(${rgb},${a})`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grd;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

let grainCanvas: HTMLCanvasElement | null = null;
function grain(g: CanvasRenderingContext2D, w: number, h: number, amount = 0.05) {
  if (!grainCanvas) {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const cg = c.getContext('2d')!;
    const img = cg.createImageData(96, 96);
    let s = 1337;
    for (let i = 0; i < img.data.length; i += 4) {
      s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
      const v = 120 + ((s >> 8) % 110);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    cg.putImageData(img, 0, 0);
    grainCanvas = c;
  }
  const prev = g.globalCompositeOperation;
  g.globalCompositeOperation = 'overlay';
  g.globalAlpha = amount;
  const pat = g.createPattern(grainCanvas, 'repeat');
  if (pat) { g.fillStyle = pat; g.fillRect(0, 0, w, h); }
  g.globalAlpha = 1;
  g.globalCompositeOperation = prev;
}

function vignette(g: CanvasRenderingContext2D, w: number, h: number, a = 0.30) {
  const grd = g.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.32, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
  grd.addColorStop(0, 'rgba(24,16,12,0)');
  grd.addColorStop(1, `rgba(24,16,12,${a})`);
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
}

function sky(g: CanvasRenderingContext2D, w: number, h: number, stops: [number, string][]) {
  const grd = g.createLinearGradient(0, 0, 0, h);
  for (const [k, c] of stops) grd.addColorStop(k, c);
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
}

function dust(g: CanvasRenderingContext2D, w: number, h: number, t: number, n = 26, rgb = '255,236,200') {
  for (let i = 0; i < n; i++) {
    const x = ((i * 137.5 + t * (5 + (i % 4) * 3)) % (w + 40)) - 20;
    const y = (h * 0.15 + ((i * 71) % (h * 0.7)) + Math.sin(t * 0.4 + i) * 12) % h;
    const r = 1.2 + (i % 3) * 1.1;
    g.fillStyle = `rgba(${rgb},${0.10 + ((i % 4) / 4) * 0.16})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
}

// ---------------------------------------------------------------- the couple

export type Who = 'her' | 'him';
type Pose = 'stand' | 'walk' | 'sit' | 'lean';

interface ActorOpts {
  scale: number;          // pixels per unit height (1 unit ≈ a person)
  seat?: number;          // sit pose: hip height above the feet, in units
  flip?: boolean;
  t?: number;
  pose?: Pose;
  mug?: boolean;
  armUp?: number;         // 0 = arm down, 1 = hand raised above the shoulder (reaching/hanging)
  eyes?: 'open' | 'closed';
  lean?: number;          // forward tilt 0..1 (affects walk/lean)
  rim?: string;           // rim-light colour, e.g. 'rgba(255,190,120,.55)'
  dark?: boolean;         // backlit silhouette (snow / sunrise): no face, one dark tone
}

/**
 * Flat, ink-outlined couple. All coordinates are in units of body height; the caller supplies the
 * pixel scale, so the same figure works in a wide shot and in a close-up.
 */
const lastHand: Pt = [0.08, -0.44];
function actor(g: CanvasRenderingContext2D, who: Who, x: number, feetY: number, o: ActorOpts) {
  const S = o.scale;
  const base = who === 'her' ? HER : HIM;
  const P: Palette = o.dark
    ? { hair: '#2A2430', skin: '#332C36', top: '#3A3440', bottom: '#2E2832', shoe: '#241F28', blush: '#00000000' }
    : base;
  const pose: Pose = o.pose ?? 'stand';
  const t = o.t ?? 0;
  const walk = pose === 'walk';
  const phase = Math.sin(t * 7.4);
  const sit = pose === 'sit';
  const leanPose = pose === 'lean';
  const seatH = o.seat ?? 0.30;

  g.save();
  g.translate(x, feetY);
  g.scale(o.flip ? -S : S, S);
  g.lineJoin = 'round';
  g.lineCap = 'round';

  const ink = 3.4 / S;              // constant on-screen hairline regardless of scale
  const hipY = sit ? -seatH : -0.46;
  const shoulderY = hipY - 0.34;
  const neckY = shoulderY - 0.045;
  const headR = 0.083;
  const headY = neckY - headR * 0.92;
  const tilt = leanPose ? 0.10 : 0;
  const bob = walk ? Math.abs(Math.cos(t * 7.4)) * 0.012 : 0;

  // legs + pelvis ------------------------------------------------------------------------------
  const legW = 0.070, calfW = 0.056;
  const step = walk ? phase * 0.115 : 0;
  const lift = walk ? Math.max(0, Math.cos(t * 7.4)) * 0.040 : 0;
  const kneeY = hipY * 0.55;
  const skin = P.skin;
  if (sit) {
    // seated: thigh forward from the hip, shin down to a foot resting on the floor
    limb(g, [[-0.045, hipY + 0.03], [0.10, hipY + 0.05], [0.17, hipY + 0.07]], legW, P === HER ? skin : P.bottom, ink);
    limb(g, [[0.045, hipY + 0.03], [0.155, hipY + 0.05], [0.175, -0.055]], legW, P === HER ? skin : P.bottom, ink);
    shape(g, () => roundRect(g, 0.155, -0.065, 0.105, 0.055, 0.026), P.shoe, ink);
    shape(g, () => roundRect(g, 0.215, -0.060, 0.095, 0.050, 0.024), P.shoe, ink);
  } else {
    // back leg
    limb(g, [[-0.042, hipY + bob], [-0.048 - step * 0.35, kneeY]], legW, P === HER ? skin : P.bottom, ink);
    limb(g, [[-0.048 - step * 0.35, kneeY], [-0.052 - step, -0.055]], calfW, P === HER ? skin : P.bottom, ink);
    shape(g, () => roundRect(g, -0.100 - step, -0.062, 0.11, 0.058, 0.026), P.shoe, ink);
    // front leg
    limb(g, [[0.042, hipY + bob], [0.050 + step * 0.45, kneeY - lift]], legW, P === HER ? skin : P.bottom, ink);
    limb(g, [[0.050 + step * 0.45, kneeY - lift], [0.046 + step, -0.055 + lift * 0.5]], calfW, P === HER ? skin : P.bottom, ink);
    shape(g, () => roundRect(g, -0.006 + step, -0.062 + lift * 0.5, 0.11, 0.058, 0.026), P.shoe, ink);
  }
  // her dress falls to the ankle; his coat to the knee — this is what stops the legs reading as sticks
  if (P === HER) {
    shape(g, () => {
      g.beginPath();
      g.moveTo(-0.086, hipY - 0.03);
      g.lineTo(0.086, hipY - 0.03);
      g.quadraticCurveTo(0.124, hipY + 0.22, 0.132, -0.055);
      g.lineTo(-0.132, -0.055);
      g.quadraticCurveTo(-0.124, hipY + 0.22, -0.086, hipY - 0.03);
      g.closePath();
    }, P.bottom, ink);
  } else {
    shape(g, () => roundRect(g, -0.080, hipY - 0.03, 0.160, 0.085, 0.028), P.bottom, ink);
  }

  // far arm ----------------------------------------------------------------------------------
  const armW = 0.052;
  const farHand: Pt = sit ? [0.10, hipY + 0.06] : [-0.075, hipY + 0.04];
  limb(g, [[-0.060, shoulderY + 0.03], [-0.078, shoulderY + 0.17], farHand], armW, P.top, ink);

  // torso ------------------------------------------------------------------------------------
  const torsoTop = shoulderY - 0.015;
  shape(g, () => {
    g.beginPath();
    g.moveTo(-0.086, torsoTop + tilt * 0.10);
    g.quadraticCurveTo(-0.116, hipY - 0.10, -0.086, hipY + 0.12);
    g.lineTo(0.086, hipY + 0.12);
    g.quadraticCurveTo(0.116, hipY - 0.10, 0.086, torsoTop + tilt * 0.10);
    g.quadraticCurveTo(0, torsoTop - 0.030, -0.086, torsoTop + tilt * 0.10);
    g.closePath();
  }, P.top, ink);
  // collar
  g.strokeStyle = 'rgba(58,40,32,.35)'; g.lineWidth = ink * 0.7;
  g.beginPath(); g.arc(0.005, torsoTop + 0.012, 0.036, 0.15, Math.PI - 0.15); g.stroke();

  // near arm ---------------------------------------------------------------------------------
  if (o.mug) {
    limb(g, [[0.070, shoulderY + 0.035], [0.088, shoulderY + 0.15], [0.058, shoulderY + 0.235]], armW, P.top, ink);
    const mx = 0.030, my = shoulderY + 0.212;
    shape(g, () => roundRect(g, mx, my, 0.075, 0.075, 0.014), '#F6EDE0', ink * 0.9);
    g.strokeStyle = INK; g.lineWidth = ink * 0.75;
    g.beginPath(); g.arc(mx + 0.084, my + 0.036, 0.027, -Math.PI / 2, Math.PI / 2); g.stroke();
    g.fillStyle = 'rgba(255,224,180,.55)';
    g.beginPath(); g.ellipse(mx + 0.037, my + 0.010, 0.030, 0.008, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,248,235,.5)'; g.lineWidth = ink * 0.7;
    for (let i = 0; i < 3; i++) {
      const sx = mx + 0.016 + i * 0.020, sy = my - 0.016;
      g.beginPath();
      g.moveTo(sx, sy);
      g.quadraticCurveTo(sx + 0.018, sy - 0.028 - Math.sin(t * 1.6 + i) * 0.008, sx, sy - 0.056 - i * 0.006);
      g.stroke();
    }
  } else {
    const swing = walk ? -phase * 0.055 : 0;
    const up = Math.max(0, Math.min(1, o.armUp ?? 0));
    const down: Pt = sit ? [0.115, hipY + 0.05]
      : leanPose ? [0.105, hipY - 0.04]
      : [0.080 + swing, hipY + 0.02];
    const raised: Pt = [0.072, shoulderY - 0.24];
    const nearHand: Pt = [down[0] + (raised[0] - down[0]) * up, down[1] + (raised[1] - down[1]) * up];
    lastHand[0] = nearHand[0]; lastHand[1] = nearHand[1];
    const elbow: Pt = [0.098, shoulderY + 0.16 - up * 0.19];
    limb(g, [[0.070, shoulderY + 0.030], elbow, nearHand], armW, P.top, ink);
    // hand
    shape(g, () => { g.beginPath(); g.arc(nearHand[0], nearHand[1], armW * 0.62, 0, Math.PI * 2); }, P.skin, ink * 0.8);
  }

  // neck
  shape(g, () => roundRect(g, -0.024, neckY - 0.045, 0.048, 0.055, 0.014), P.skin, 0);

  // head -------------------------------------------------------------------------------------
  shape(g, () => {
    g.beginPath();
    g.ellipse(0.005, headY, headR * 0.94, headR, 0, 0, Math.PI * 2);
  }, P.skin, ink);

  // hair: a cap that leaves the face open (longer for her)
  shape(g, () => {
    g.beginPath();
    g.moveTo(0.005 - headR * 1.02, headY + 0.01);
    g.quadraticCurveTo(0.005 - headR * 1.22, headY - headR * 1.18, 0.005 + headR * 0.16, headY - headR * 1.16);
    g.quadraticCurveTo(0.005 + headR * 1.22, headY - headR * 1.10, 0.005 + headR * 1.02, headY + 0.02);
    g.quadraticCurveTo(0.005 + headR * 0.74, headY - headR * 0.42, 0.005 - headR * 0.10, headY - headR * 0.52);
    g.quadraticCurveTo(0.005 - headR * 0.72, headY - headR * 0.44, 0.005 - headR * 1.02, headY + 0.01);
    g.closePath();
  }, P.hair, ink);
  if (who === 'her') {
    shape(g, () => {
      g.beginPath();
      g.moveTo(0.005 - headR * 0.95, headY - headR * 0.25);
      g.quadraticCurveTo(0.005 - headR * 1.55, headY + headR * 0.75, 0.005 - headR * 1.05, headY + headR * 1.55);
      g.quadraticCurveTo(0.005 - headR * 0.55, headY + headR * 0.95, 0.005 - headR * 0.72, headY - headR * 0.1);
      g.closePath();
    }, P.hair, ink);
  }

  // face -------------------------------------------------------------------------------------
  if (o.dark) { g.restore(); return [x + lastHand[0] * S, feetY + lastHand[1] * S]; }
  const closed = o.eyes === 'closed' || sit;
  g.strokeStyle = INK; g.lineWidth = ink * 0.85;
  const eyeY = headY + headR * 0.10;
  if (closed) {
    for (const ex of [-0.012, 0.030]) {
      g.beginPath(); g.arc(ex, eyeY, 0.012, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
    }
  } else {
    g.fillStyle = INK;
    for (const ex of [-0.014, 0.030]) {
      g.beginPath(); g.ellipse(ex, eyeY, 0.0085, 0.0105, 0, 0, Math.PI * 2); g.fill();
    }
  }
  // blush + mouth
  g.fillStyle = P.blush; g.globalAlpha = 0.35;
  for (const ex of [-0.030, 0.048]) { g.beginPath(); g.ellipse(ex, eyeY + 0.020, 0.016, 0.009, 0, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
  g.strokeStyle = INK; g.lineWidth = ink * 0.8;
  g.beginPath();
  if (closed) g.arc(0.008, eyeY + 0.028, 0.016, 0.25, Math.PI - 0.25);
  else g.arc(0.008, eyeY + 0.020, 0.013, 0.30, Math.PI - 0.30);
  g.stroke();

  // rim light along the lit side
  if (o.rim) {
    g.strokeStyle = o.rim; g.lineWidth = ink * 0.9;
    g.beginPath();
    g.moveTo(0.005 + headR * 0.95, headY - headR * 0.35);
    g.quadraticCurveTo(0.005 + headR * 1.05, headY + headR * 0.55, 0.005 + headR * 0.55, headY + headR * 0.92);
    g.stroke();
    g.beginPath();
    g.moveTo(0.086, torsoTop + 0.03);
    g.quadraticCurveTo(0.112, hipY + 0.10, 0.078, hipY + 0.04);
    g.stroke();
  }

  const hand: Pt = [x + (o.flip ? -1 : 1) * (lastHand[0]) * S, feetY + lastHand[1] * S];
  g.restore();
  return hand;
}

/** the small companions, drawn in the same idiom so they share the couple's key line */
function pet(g: CanvasRenderingContext2D, kind: 'cat' | 'dog', x: number, feetY: number, s: number, t: number, flip = false, lying = false, dark = false) {
  g.save();
  g.translate(x, feetY);
  g.scale(flip ? -s : s, s);
  const ink = 3.2 / s;
  const body = dark ? '#2E2832' : kind === 'cat' ? '#E3C6A8' : '#C9A87C';
  const patch = dark ? '#3A3440' : kind === 'cat' ? '#C4795A' : '#8A6A48';
  if (lying) {
    shape(g, () => { g.beginPath(); g.ellipse(0, -0.10, 0.30, 0.11, 0, 0, Math.PI * 2); }, body, ink);
    shape(g, () => { g.beginPath(); g.ellipse(0.28, -0.13, 0.10, 0.085, 0, 0, Math.PI * 2); }, body, ink);
    shape(g, () => { g.beginPath(); g.moveTo(0.24, -0.21); g.lineTo(0.26, -0.28); g.lineTo(0.31, -0.21); g.closePath(); }, patch, ink);
    g.strokeStyle = INK; g.lineWidth = ink * 0.8;
    g.beginPath(); g.arc(0.30, -0.13, 0.010, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  } else {
    const breathe = Math.sin(t * 1.6) * 0.006;
    shape(g, () => { g.beginPath(); g.ellipse(0, -0.13 + breathe, 0.19, 0.12, 0, 0, Math.PI * 2); }, body, ink);
    shape(g, () => { g.beginPath(); g.ellipse(0.17, -0.24 + breathe, 0.115, 0.10, 0, 0, Math.PI * 2); }, body, ink);
    shape(g, () => { g.beginPath(); g.moveTo(0.12, -0.31); g.lineTo(0.14, -0.39); g.lineTo(0.20, -0.31); g.closePath(); }, patch, ink);
    shape(g, () => { g.beginPath(); g.moveTo(0.22, -0.31); g.lineTo(0.24, -0.39); g.lineTo(0.29, -0.30); g.closePath(); }, patch, ink);
    g.strokeStyle = INK; g.lineWidth = ink * 0.8;
    g.beginPath(); g.arc(0.20, -0.25 + breathe, 0.011, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.beginPath(); g.arc(0.26, -0.25 + breathe, 0.011, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    // tail
    g.strokeStyle = body; g.lineWidth = 0.045;
    g.beginPath();
    g.moveTo(-0.18, -0.16);
    g.quadraticCurveTo(-0.34, -0.20 + Math.sin(t * 2.2) * 0.03, -0.30, -0.34);
    g.stroke();
    g.strokeStyle = INK; g.lineWidth = ink * 0.7;
    g.beginPath();
    g.moveTo(-0.18, -0.16);
    g.quadraticCurveTo(-0.34, -0.20 + Math.sin(t * 2.2) * 0.03, -0.30, -0.34);
    g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- sets

/** interior wall + floor + skirting, in the muted wash the figures sit against */
function interior(g: CanvasRenderingContext2D, w: number, h: number, wallTop: string, wallBot: string, floorY: number, floor: string, floorDark: string) {
  sky(g, w, h, [[0, wallTop], [1, wallBot]]);
  g.fillStyle = floor;
  g.fillRect(0, floorY, w, h - floorY);
  g.fillStyle = floorDark;
  g.fillRect(0, floorY, w, Math.max(2, h * 0.006));
  // floorboards, very low contrast
  g.strokeStyle = 'rgba(60,40,28,.06)';
  g.lineWidth = Math.max(1, h * 0.0035);
  for (let i = 1; i < 9; i++) {
    const y = floorY + (h - floorY) * (i / 9);
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
  }
  // skirting
  g.fillStyle = 'rgba(255,248,238,.5)';
  g.fillRect(0, floorY - h * 0.02, w, h * 0.02);
}

function window_(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, glass: string, frame = '#E8DAC4') {
  g.fillStyle = frame;
  roundRect(g, x - w * 0.05, y - h * 0.04, w * 1.10, h * 1.08, w * 0.03); g.fill();
  g.fillStyle = glass;
  roundRect(g, x, y, w, h, w * 0.02); g.fill();
  g.strokeStyle = frame; g.lineWidth = Math.max(2, w * 0.035);
  g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();
  g.beginPath(); g.moveTo(x, y + h * 0.52); g.lineTo(x + w, y + h * 0.52); g.stroke();
}

// ---------------------------------------------------------------- scenes

function drawWalk(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const floorY = h * 0.74;
  interior(g, w, h, '#EADCC6', '#DCC9AC', floorY, '#C79E6E', '#B0854F');
  // afternoon light from the window, right
  window_(g, w * 0.72, h * 0.20, w * 0.22, h * 0.34, '#F6DFB8');
  g.save();
  roundRect(g, w * 0.72, h * 0.20, w * 0.22, h * 0.34, w * 0.004); g.clip();
  sky(g, w, h, [[0, '#BDD6E6'], [1, '#EFE3C6']]);
  g.fillStyle = 'rgba(150,172,150,.55)';
  g.beginPath();
  g.moveTo(w * 0.70, h * 0.44);
  for (let i = 0; i <= 8; i++) g.lineTo(w * 0.70 + (i / 8) * w * 0.26, h * (0.42 + Math.sin(i * 1.7) * 0.012));
  g.lineTo(w * 0.96, h * 0.60); g.lineTo(w * 0.70, h * 0.60); g.closePath(); g.fill();
  g.fillStyle = 'rgba(120,150,120,.6)';
  for (let i = 0; i < 3; i++) {
    const tx = w * (0.74 + i * 0.06), ty = h * 0.455;
    g.beginPath(); g.arc(tx, ty, h * 0.028, 0, Math.PI * 2); g.fill();
    g.fillRect(tx - w * 0.002, ty, w * 0.004, h * 0.03);
  }
  g.restore();
  softLight(g, w * 0.83, h * 0.34, w * 0.34, '255,206,140', 0.30);
  // light patch on the floor
  g.save();
  g.globalAlpha = 0.25; g.fillStyle = '#FFE2A8';
  g.beginPath();
  g.moveTo(w * 0.66, floorY); g.lineTo(w * 0.86, floorY); g.lineTo(w * 0.94, h); g.lineTo(w * 0.70, h);
  g.closePath(); g.fill();
  g.restore();
  // moving boxes, right of centre
  const bx = w * 0.60, by = floorY;
  for (const [i, bw, bh] of [[0, 0.13, 0.11], [1, 0.11, 0.09], [2, 0.10, 0.075]] as const) {
    const x = bx + i * w * 0.028, yy = by - bh * h - i * h * 0.015;
    g.fillStyle = i === 1 ? '#C9A276' : '#BD9366';
    roundRect(g, x, yy, bw * w, bh * h, h * 0.008); g.fill();
    g.strokeStyle = 'rgba(70,46,26,.35)'; g.lineWidth = Math.max(1, h * 0.003);
    g.beginPath(); g.moveTo(x, yy + bh * h * 0.35); g.lineTo(x + bw * w, yy + bh * h * 0.35); g.stroke();
  }
  // a leaning frame + a plant, so the empty room reads as "just moved in"
  g.fillStyle = '#D9C4A6';
  roundRect(g, w * 0.14, floorY - h * 0.13, w * 0.05, h * 0.13, h * 0.006); g.fill();
  g.fillStyle = '#9FB4A0';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.45;
    g.beginPath();
    g.ellipse(w * 0.90 + Math.cos(a) * h * 0.045, floorY - h * 0.10 + Math.sin(a) * h * 0.06, h * 0.020, h * 0.045, a, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#B98A63';
  roundRect(g, w * 0.88, floorY - h * 0.075, w * 0.045, h * 0.075, h * 0.010); g.fill();

  // the couple walks in from the left, then stops and looks around
  const walkT = 3.6;
  const k = Math.min(1, t / walkT);
  const ease = 1 - Math.pow(1 - k, 2.2);
  const port = h > w;
  const x0 = -w * 0.14, x1 = w * 0.30;
  const x = x0 + (x1 - x0) * ease;
  const moving = t < walkT;
  const S = port ? Math.min(w, h) * 0.42 : h * 0.40;
  const pose: Pose = moving ? 'walk' : 'stand';
  contactShadow(g, x - S * 0.06, floorY + h * 0.012, S * 0.26);
  contactShadow(g, x + S * 0.20, floorY + h * 0.012, S * 0.24);
  actor(g, 'him', x - S * 0.06, floorY, { scale: S, pose, t, rim: 'rgba(255,214,158,.5)' });
  actor(g, 'her', x + S * 0.20, floorY, { scale: S * 0.94, pose, t: t + 0.18, rim: 'rgba(255,214,158,.5)' });
  pet(g, 'cat', x + S * 0.60, floorY, S * 0.46, t, false);
  dust(g, w, h, t, 18);
}

function drawGreet(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  interior(g, w, h, '#EBDCC4', '#DCC7A8', h * 0.92, '#C79E6E', '#B0854F');
  // the shelf runs behind them; they are cropped at the waist by the frame edge
  const shelfY = h * 0.50, shelfX = -w * 0.02, shelfW = w * 1.04;
  g.fillStyle = '#B98A5E';
  roundRect(g, shelfX, shelfY, shelfW, h * 0.030, h * 0.006); g.fill();
  g.fillStyle = 'rgba(70,44,24,.30)';
  g.fillRect(shelfX, shelfY + h * 0.030, shelfW, h * 0.016);
  // things already on the shelf
  const cols = ['#B98A8A', '#8FA2B4', '#C9B27E', '#9FB0A0'];
  for (let i = 0; i < 6; i++) {
    const bw = w * (0.020 + (i % 3) * 0.005), bh = h * (0.085 + (i % 2) * 0.014);
    g.fillStyle = cols[i % cols.length]!;
    roundRect(g, w * 0.06 + i * w * 0.028, shelfY - bh, bw, bh, h * 0.005); g.fill();
  }
  g.fillStyle = '#E8D6BC';
  roundRect(g, w * 0.30, shelfY - h * 0.105, w * 0.07, h * 0.105, h * 0.007); g.fill();
  g.fillStyle = '#9FB4C2';
  roundRect(g, w * 0.316, shelfY - h * 0.090, w * 0.050, h * 0.075, h * 0.004); g.fill();
  // a little plant + a mug further along
  g.fillStyle = '#C08F5E';
  roundRect(g, w * 0.80, shelfY - h * 0.060, w * 0.040, h * 0.060, h * 0.010); g.fill();
  g.fillStyle = '#8FAE86';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.5;
    g.beginPath();
    g.ellipse(w * 0.82 + Math.cos(a) * h * 0.030, shelfY - h * 0.075 + Math.sin(a) * h * 0.045, h * 0.014, h * 0.032, a, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#D8CBB6';
  roundRect(g, w * 0.10, shelfY - h * 0.048, w * 0.030, h * 0.048, h * 0.008); g.fill();

  // him (left) holding the box of things, her (right) reaching up to place a small frame
  const port = h > w;
  const S = port ? Math.min(w, h) * 0.55 : h * 0.62;
  const feet = h * 1.04;
  const himX = port ? w * 0.28 : w * 0.30, herX = port ? w * 0.68 : w * 0.62;
  const himHand = actor(g, 'him', himX, feet, { scale: S, pose: 'stand', t, armUp: 0.34, rim: 'rgba(255,226,180,.45)' });
  // the box he is holding
  const bxx = himHand[0] - S * 0.04, byy = himHand[1] - S * 0.10;
  g.fillStyle = '#C79A6A';
  roundRect(g, bxx, byy, S * 0.26, S * 0.19, S * 0.012); g.fill();
  g.strokeStyle = INK; g.lineWidth = S * 0.010; g.stroke();
  g.fillStyle = '#E6D3B4';
  roundRect(g, bxx + S * 0.02, byy - S * 0.02, S * 0.09, S * 0.09, S * 0.008); g.fill();

  const herHand = actor(g, 'her', herX, feet, { scale: S * 0.95, pose: 'stand', t: t + 0.2, armUp: 1, rim: 'rgba(255,226,180,.45)' });
  // the frame in her raised hand
  const fx = herHand[0] - S * 0.06, fy = herHand[1] - S * 0.20;
  g.fillStyle = '#E4D0B4'; roundRect(g, fx, fy, S * 0.20, S * 0.16, S * 0.012); g.fill();
  g.strokeStyle = INK; g.lineWidth = S * 0.012; g.strokeRect(fx, fy, S * 0.20, S * 0.16);
  g.fillStyle = '#A8BEC6'; roundRect(g, fx + S * 0.022, fy + S * 0.020, S * 0.156, S * 0.12, S * 0.006); g.fill();
  softLight(g, fx + S * 0.10, fy + S * 0.08, S * 0.26, '255,226,180', 0.20);
  dust(g, w, h, t, 14);
}

function drawSofa(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const floorY = h * 0.82;
  interior(g, w, h, '#3A4456', '#2C3442', floorY, '#4A4038', '#3A322C');
  // night window
  window_(g, w * 0.06, h * 0.18, w * 0.20, h * 0.32, '#1E2A3E', '#2A2C34');
  g.fillStyle = 'rgba(190,214,240,.75)';
  g.beginPath(); g.arc(w * 0.13, h * 0.26, h * 0.022, 0, Math.PI * 2); g.fill();
  // lamp + pool of warm light
  const lampX = w * 0.86, lampY = h * 0.42;
  softLight(g, lampX, lampY, w * 0.30, '255,196,120', 0.42);
  g.strokeStyle = '#5A4A40'; g.lineWidth = h * 0.008;
  g.beginPath(); g.moveTo(lampX, floorY); g.lineTo(lampX, lampY); g.stroke();
  g.fillStyle = '#F3D9A8';
  g.beginPath(); g.moveTo(lampX - h * 0.055, lampY); g.lineTo(lampX + h * 0.055, lampY); g.lineTo(lampX + h * 0.032, lampY - h * 0.070); g.lineTo(lampX - h * 0.032, lampY - h * 0.070); g.closePath(); g.fill();
  // sofa: backrest + arms behind the sitters (the seat edge is drawn after them)
  const port = h > w, u = Math.min(w, h);
  const sw = port ? w * 0.86 : w * 0.50;
  const sx = port ? (w - sw) / 2 : w * 0.16;
  const seatY = floorY - h * 0.13;
  g.fillStyle = '#6A6376';
  roundRect(g, sx + sw * 0.02, seatY - h * 0.20, sw * 0.96, h * 0.24, h * 0.02); g.fill();
  g.fillStyle = '#5C5566';
  roundRect(g, sx, seatY, sw, h * 0.135, h * 0.02); g.fill();
  g.fillStyle = 'rgba(255,240,214,.05)';
  roundRect(g, sx + w * 0.02, seatY + h * 0.008, sw - w * 0.04, h * 0.012, h * 0.006); g.fill();
  g.fillStyle = '#736C80';
  roundRect(g, sx - w * 0.02, seatY - h * 0.12, w * 0.055, h * 0.25, h * 0.02); g.fill();
  roundRect(g, sx + sw - w * 0.03, seatY - h * 0.12, w * 0.055, h * 0.25, h * 0.02); g.fill();
  // rug
  g.fillStyle = 'rgba(150,110,90,.35)';
  g.beginPath(); g.ellipse(w * 0.44, floorY + h * 0.055, w * 0.30, h * 0.055, 0, 0, Math.PI * 2); g.fill();

  const S = port ? u * 0.52 : h * 0.50;
  const seatH = (floorY - seatY) / S;
  const mid = w * 0.5, spread = port ? S * 0.46 : w * 0.065;
  contactShadow(g, mid, floorY + h * 0.02, S * 0.55, 0.2);
  actor(g, 'him', mid - spread, floorY, { scale: S, pose: 'sit', seat: seatH, t, eyes: 'open', mug: true, rim: 'rgba(255,198,128,.65)' });
  actor(g, 'her', mid + spread, floorY, { scale: S * 0.94, pose: 'sit', seat: seatH, t: t + 0.3, eyes: 'open', rim: 'rgba(255,198,128,.65)' });
  pet(g, 'dog', port ? mid + spread * 1.5 : mid + w * 0.22, floorY + h * 0.02, S * 0.38, t, true, true);
  pet(g, 'cat', mid + spread * 0.4, seatY + h * 0.012, S * 0.28, t, false, false);
  dust(g, w, h, t, 10, '255,214,170');
  // a warm gradient at the bottom so the floor melts into the dark
  const grd = g.createLinearGradient(0, floorY, 0, h);
  grd.addColorStop(0, 'rgba(20,16,20,0)');
  grd.addColorStop(1, 'rgba(20,16,20,.55)');
  g.fillStyle = grd; g.fillRect(0, floorY, w, h - floorY);
}

function drawSleep(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const floorY = h * 0.82;
  interior(g, w, h, '#2E3648', '#242A38', floorY, '#3E3830', '#302A24');
  window_(g, w * 0.62, h * 0.16, w * 0.24, h * 0.34, '#26344A', '#282A32');
  // moon
  softLight(g, w * 0.74, h * 0.26, w * 0.26, '170,200,240', 0.30);
  g.fillStyle = 'rgba(226,236,250,.9)';
  g.beginPath(); g.arc(w * 0.74, h * 0.26, h * 0.030, 0, Math.PI * 2); g.fill();
  // moonlight patch on the floor
  g.save(); g.globalAlpha = 0.16; g.fillStyle = '#B9CCE8';
  g.beginPath();
  g.moveTo(w * 0.58, floorY); g.lineTo(w * 0.78, floorY); g.lineTo(w * 0.88, h); g.lineTo(w * 0.52, h);
  g.closePath(); g.fill(); g.restore();
  // sofa, same one, lamp off
  const port = h > w, u = Math.min(w, h);
  const sw = port ? w * 0.86 : w * 0.50;
  const sx = port ? (w - sw) / 2 : w * 0.10;
  const seatY = floorY - h * 0.13;
  g.fillStyle = '#525964'; roundRect(g, sx + sw * 0.02, seatY - h * 0.20, sw * 0.96, h * 0.24, h * 0.02); g.fill();
  g.fillStyle = '#464C58'; roundRect(g, sx, seatY, sw, h * 0.135, h * 0.02); g.fill();
  // two mugs on the floor
  for (const mx of [w * 0.66, w * 0.70]) {
    g.fillStyle = '#D8CBB6'; roundRect(g, mx, floorY - h * 0.030, w * 0.022, h * 0.030, h * 0.006); g.fill();
  }
  const S = port ? u * 0.52 : h * 0.50;
  const seatH = (floorY - seatY) / S;
  const mid = w * 0.5 - (port ? 0 : w * 0.06), spread = port ? S * 0.42 : w * 0.055;
  contactShadow(g, mid, floorY + h * 0.02, S * 0.55, 0.18);
  actor(g, 'him', mid - spread, floorY, { scale: S, pose: 'sit', seat: seatH, t, eyes: 'closed', rim: 'rgba(180,205,240,.5)' });
  // her head tips onto his shoulder
  g.save();
  g.translate(mid + spread, floorY);
  g.rotate(-0.13);
  actor(g, 'her', 0, 0, { scale: S * 0.94, pose: 'sit', seat: seatH, t: t + 0.4, eyes: 'closed', rim: 'rgba(180,205,240,.5)' });
  g.restore();
  pet(g, 'cat', mid + spread * 1.9, floorY + h * 0.02, S * 0.28, t * 0.6, false, true);

  // drifting zzz
  g.fillStyle = 'rgba(236,242,255,.5)';
  for (let i = 0; i < 3; i++) {
    const k = ((t * 0.25 + i * 0.33) % 1);
    g.globalAlpha = 0.5 * (1 - k);
    const zx = w * 0.44 + k * w * 0.06, zy = seatY - h * 0.20 - k * h * 0.12;
    g.font = `${Math.round(h * (0.03 + k * 0.012))}px Georgia, serif`;
    g.fillText('z', zx, zy);
  }
  g.globalAlpha = 1;
  dust(g, w, h, t, 8, '200,220,255');
}

function drawSnow(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // the room we are looking out from: a dark frame around a bright window
  g.fillStyle = '#2A2E38';
  g.fillRect(0, 0, w, h);
  const wx = w * 0.10, wy = h * 0.14, ww = w * 0.80, wh = h * 0.62;
  // outside: pale winter afternoon
  sky(g, w, h, [[0, '#CFE0EE'], [0.55, '#DCE8F2'], [1, '#EAF1F6']]);
  g.fillStyle = '#EAF1F6'; g.fillRect(0, 0, w, h);
  const grd = g.createLinearGradient(0, wy, 0, wy + wh);
  grd.addColorStop(0, '#C6D9EA');
  grd.addColorStop(0.62, '#DCE8F2');
  grd.addColorStop(1, '#F2F6FA');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, wy + wh);
  // distant hills + trees, very low contrast
  g.fillStyle = 'rgba(150,172,192,.55)';
  g.beginPath();
  g.moveTo(0, wy + wh * 0.62);
  for (let x = 0; x <= w; x += w / 12) g.lineTo(x, wy + wh * (0.58 + Math.sin(x * 0.004) * 0.06));
  g.lineTo(w, wy + wh); g.lineTo(0, wy + wh); g.closePath(); g.fill();
  g.fillStyle = 'rgba(120,146,168,.6)';
  for (let i = 0; i < 7; i++) {
    const tx = w * (0.08 + i * 0.13), ty = wy + wh * 0.66;
    g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + w * 0.018, ty + wh * 0.16); g.lineTo(tx - w * 0.018, ty + wh * 0.16); g.closePath(); g.fill();
    g.beginPath(); g.arc(tx, ty + wh * 0.02, wh * 0.05, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#F7FAFC';
  g.fillRect(0, wy + wh * 0.80, w, wh * 0.20);
  // snow
  for (let i = 0; i < 90; i++) {
    const sx = ((i * 61.7 + t * (11 + (i % 6) * 4)) % (w + 20)) - 10;
    const sy = ((i * 37.3 + t * (26 + (i % 5) * 6)) % (wh + 20)) - 10 + wy;
    const r = 1.4 + (i % 4) * 0.9;
    g.fillStyle = `rgba(255,255,255,${0.55 + (i % 3) * 0.15})`;
    g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.fill();
  }
  // window frame over the outside
  g.fillStyle = '#22262E';
  g.fillRect(0, 0, w, wy);
  g.fillRect(0, wy + wh, w, h - wy - wh);
  g.fillRect(0, 0, wx, h);
  g.fillRect(wx + ww, 0, w - wx - ww, h);
  g.fillStyle = '#2C313A';
  g.fillRect(wx + ww / 2 - w * 0.010, wy, w * 0.020, wh);
  g.fillRect(wx, wy + wh * 0.5 - h * 0.008, ww, h * 0.016);
  // sill
  g.fillStyle = '#3A4048';
  g.fillRect(wx - w * 0.02, wy + wh, ww + w * 0.04, h * 0.035);
  g.fillStyle = 'rgba(255,255,255,.10)';
  g.fillRect(wx - w * 0.02, wy + wh, ww + w * 0.04, h * 0.006);

  // the two of them, backs to us: dark silhouettes against the snow, so they never wash out
  const port = h > w;
  const S = port ? Math.min(w, h) * 0.62 : h * 0.66;
  const feet = h * 1.06;
  actor(g, 'him', port ? w * 0.36 : w * 0.335, feet, { scale: S, pose: 'stand', t, mug: true, dark: true, rim: 'rgba(226,240,255,.9)' });
  actor(g, 'her', port ? w * 0.66 : w * 0.545, feet, { scale: S * 0.94, pose: 'stand', t, mug: true, dark: true, rim: 'rgba(226,240,255,.9)' });
  if (!port) pet(g, 'cat', w * 0.66, h * 0.995, S * 0.26, t, false);
  // foreground: the room we watch from, cutting them at the chest
  g.fillStyle = '#161920';
  g.fillRect(0, h * 0.90, w, h * 0.10);
  g.fillStyle = '#22262E';
  g.fillRect(0, h * 0.885, w, h * 0.018);
  g.fillStyle = 'rgba(255,255,255,.07)';
  g.fillRect(0, h * 0.885, w, h * 0.004);
  // jambs
  g.fillStyle = '#161920';
  g.fillRect(0, 0, w * 0.055, h);
  g.fillRect(w * 0.945, 0, w * 0.055, h);
  dust(g, w, h, t, 8, '255,255,255');
}

function drawDawn(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const k = Math.min(1, t / 7.0);
  const rise = Math.pow(k, 0.6);
  // sky warms as the sun climbs
  sky(g, w, h, [
    [0, mix('#2E3A5C', '#8FB6D8', rise)],
    [0.42, mix('#5A5A78', '#F2B98A', rise)],
    [0.72, mix('#8A7A86', '#FBD9A8', rise)],
    [1, mix('#A89A9E', '#FDECD2', rise)],
  ]);
  const horizon = h * 0.70;
  const sunY = horizon - rise * h * 0.14 + h * 0.10;
  softLight(g, w * 0.52, sunY, w * 0.55, '255,206,140', 0.45);
  g.fillStyle = mix('#E8A878', '#FFF0C8', rise);
  g.beginPath(); g.arc(w * 0.52, sunY, h * 0.055 + rise * h * 0.012, 0, Math.PI * 2); g.fill();
  // distant roofline
  g.fillStyle = mix('#3E4458', '#7A6A72', rise);
  g.beginPath();
  g.moveTo(0, horizon);
  let bx = 0;
  let k2 = 0;
  while (bx < w) {
    const bw = w * (0.055 + ((k2 * 37) % 7) * 0.012);
    const bh = h * (0.03 + ((k2 * 13) % 5) * 0.022);
    g.lineTo(bx, horizon - bh);
    g.lineTo(bx + bw, horizon - bh);
    // rooftop water tanks / chimneys
    if (k2 % 3 === 0) { g.lineTo(bx + bw * 0.55, horizon - bh); g.lineTo(bx + bw * 0.55, horizon - bh - h * 0.022); g.lineTo(bx + bw * 0.75, horizon - bh - h * 0.022); g.lineTo(bx + bw * 0.75, horizon - bh); }
    bx += bw;
    k2++;
  }
  g.lineTo(w, horizon); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
  // balcony floor + railing
  g.fillStyle = mix('#5A5560', '#B08E7A', rise);
  g.fillRect(0, h * 0.84, w, h * 0.16);
  const railY = h * 0.70;
  // the couple leans on the rail, facing the sunrise — silhouetted against the light
  const port = h > w;
  const S = port ? Math.min(w, h) * 0.56 : h * 0.52;
  const himX = port ? w * 0.34 : w * 0.34, herX = port ? w * 0.66 : w * 0.58;
  contactShadow(g, himX, h * 0.855, S * 0.26, 0.30);
  contactShadow(g, herX, h * 0.855, S * 0.25, 0.30);
  actor(g, 'him', himX, h * 0.855, { scale: S, pose: 'lean', t, mug: true, dark: true, rim: 'rgba(255,214,150,.95)' });
  actor(g, 'her', herX, h * 0.855, { scale: S * 0.94, pose: 'lean', t: t + 0.4, dark: true, rim: 'rgba(255,214,150,.95)' });
  if (!port) pet(g, 'cat', w * 0.755, h * 0.855, S * 0.26, t, false, false, true);
  // railing drawn IN FRONT so they are behind it, on the balcony
  g.strokeStyle = mix('#2E2E38', '#6A4E46', rise);
  g.lineWidth = h * 0.014;
  g.beginPath(); g.moveTo(0, railY); g.lineTo(w, railY); g.stroke();
  g.lineWidth = h * 0.008;
  for (let i = 0; i <= 14; i++) {
    const x = (i / 14) * w;
    g.beginPath(); g.moveTo(x, railY); g.lineTo(x, h * 0.87); g.stroke();
  }
  g.fillStyle = mix('#3A3640', '#7A584E', rise);
  g.fillRect(0, h * 0.865, w, h * 0.02);
  dust(g, w, h, t, 20, '255,226,180');
}

function mix(a: string, b: string, k: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (off: number) => Math.round(((pa >> off) & 255) * (1 - k) + ((pb >> off) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// ---------------------------------------------------------------- player

export function createFilm(): FilmApi {
  let idx = 0, t = 0, finaleT = 0;
  const buf = document.createElement('canvas');

  const drawScene = (id: SceneId, g: CanvasRenderingContext2D, w: number, h: number, tt: number) => {
    if (id === 'walk') drawWalk(g, w, h, tt);
    else if (id === 'greet') drawGreet(g, w, h, tt);
    else if (id === 'sofa') drawSofa(g, w, h, tt);
    else if (id === 'sleep') drawSleep(g, w, h, tt);
    else if (id === 'snow') drawSnow(g, w, h, tt);
    else drawDawn(g, w, h, tt);
    vignette(g, w, h, 0.28);
    grain(g, w, h, 0.045);
  };

  const api: FilmApi = {
    update(dt) {
      if (idx >= SCENE_IDS.length) { finaleT += dt; return; }
      t += dt;
      if (t >= DURS[SCENE_IDS[idx]!]) { t = 0; idx++; }
    },
    render(g, w, h) {
      g.save();
      if (idx >= SCENE_IDS.length) {
        drawScene('dawn', g, w, h, 8.0);
        g.fillStyle = `rgba(24,16,12,${Math.min(0.26, finaleT * 0.07)})`;
        g.fillRect(0, 0, w, h);
        g.restore();
        return;
      }
      const id = SCENE_IDS[idx]!;
      drawScene(id, g, w, h, t);
      if (t < FADE && idx > 0) {
        if (buf.width !== w || buf.height !== h) { buf.width = w; buf.height = h; }
        const bg = buf.getContext('2d')!;
        drawScene(SCENE_IDS[idx - 1]!, bg, w, h, DURS[SCENE_IDS[idx - 1]!]);
        g.globalAlpha = 1 - t / FADE;
        g.drawImage(buf, 0, 0);
        g.globalAlpha = 1;
      }
      g.restore();
    },
    skip() {
      if (idx >= SCENE_IDS.length) return;
      t = 0; idx++;
    },
    replay() { idx = 0; t = 0; finaleT = 0; },
    seek(id, tt = 0) {
      if (id === 'finale') { idx = SCENE_IDS.length; finaleT = tt; t = 0; }
      else {
        const i = SCENE_IDS.indexOf(id);
        if (i >= 0) { idx = i; t = tt; finaleT = 0; }
      }
    },
    get scene() { return idx >= SCENE_IDS.length ? 'finale' : SCENE_IDS[idx]!; },
    get finaleT() { return finaleT; },
  };
  return api;
}
