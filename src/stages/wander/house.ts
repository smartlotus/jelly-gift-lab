// The warm cottage at the end of the mushroom grove.
// Integer-pixel drawing in the plate's palette (cream plaster, terracotta shingles, timber frame, warm windows).
// The static body is baked once, given plaster/shingle texture, a moon-side light, eave and contact shadows,
// moss, and a cool night grade so it sits in the dark painted grove instead of reading as a daylit sticker.
// Only the light sources (windows, porch lamp, chimney glow, light spill) are drawn ungraded every frame,
// and a grassy mound with ferns and the grove's own mushrooms seats the plinth into the ground.

const INK = '#2A1E1A';

export const COTTAGE_W = 152;   // overall footprint incl. eaves
export const COTTAGE_H = 132;

// bake canvas: footprint x 0..152 sits at BX; ground line at BY
const BX = 24, BY = 150, BW = 200, BH = 176;

type G = CanvasRenderingContext2D;
const rnd = (n: number) => { let s = n | 0 || 1; return () => { s = Math.imul(s ^ (s << 13), 1597334677); s = Math.imul(s ^ (s >>> 16), 3812015801); return (s >>> 0) / 4294967296; }; };

function rect(g: G, x: number, y: number, w: number, h: number, c: string) {
  if (w <= 0 || h <= 0) return;
  g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function halo(g: G, cx: number, cy: number, r: number, rgb: string, a0: number) {
  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  for (let i = Math.round(r); i > 0; i -= 3) {
    const t = 1 - i / r;
    g.fillStyle = `rgba(${rgb},${(a0 * t * t).toFixed(3)})`;
    g.fillRect(Math.round(cx - i), Math.round(cy - i), i * 2, i * 2);
  }
  g.restore();
}

/** geometry shared by the baked body and the per-frame lights (relative to footprint left X and ground FY) */
function geo(X: number, FY: number) {
  const cx = X + 76;
  const wallW = 100, wallL = cx - wallW / 2, wallR = cx + wallW / 2;
  const wallTop = FY - 72, apexY = FY - 132, eavesY = wallTop;
  const halfW = 58, eaveW = 74, roofH = eavesY - apexY;
  const dw = 26, dx = cx - dw / 2, dTop = FY - 44;
  const wins: [number, number, number, number][] = [[wallL + 8, FY - 50, 22, 20], [wallR - 30, FY - 50, 22, 20]];
  const chx = cx + 30, chBase = apexY + roofH * 0.72, chTop = apexY + 12;
  return { cx, wallW, wallL, wallR, wallTop, apexY, eavesY, halfW, eaveW, roofH, dw, dx, dTop, wins, chx, chBase, chTop };
}

let baked: HTMLCanvasElement | null = null;

function bake(): HTMLCanvasElement {
  if (baked) return baked;
  const c = document.createElement('canvas'); c.width = BW; c.height = BH;
  const g = c.getContext('2d')!;
  const X = BX, FY = BY;
  const k = geo(X, FY);
  const { cx, wallW, wallL, wallR, wallTop, apexY, eavesY, halfW, eaveW, roofH, dw, dx, dTop } = k;
  const r = rnd(7);

  // ---- walls: plaster with mottled texture ---------------------------------------------------
  rect(g, wallL, wallTop, wallW, FY - wallTop, '#D9BE96');
  for (let y = wallTop; y < FY; y++) for (let x = wallL; x < wallR; x++) {
    const v = r();
    if (v < 0.10) rect(g, x, y, 1, 1, '#CDB088');
    else if (v > 0.95) rect(g, x, y, 1, 1, '#E6CFA8');
  }
  // damp lower band and a few cracked-plaster patches
  for (let y = FY - 26; y < FY - 12; y++) for (let x = wallL; x < wallR; x++) if (((x + y) & 1) === 0 && r() < 0.55) rect(g, x, y, 1, 1, '#C4A47A');
  for (const [px, py] of [[wallL + 44, wallTop + 14], [wallL + 70, wallTop + 46], [wallL + 14, wallTop + 30]] as const) {
    rect(g, px, py, 6, 1, '#C29E74'); rect(g, px + 2, py + 1, 5, 1, '#C29E74'); rect(g, px + 1, py - 1, 3, 1, '#EAD6B2');
  }
  // stone plinth
  rect(g, wallL, FY - 12, wallW, 12, '#7E7468');
  for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
    const sx = wallL + 1 + i * 11 + (row % 2) * 5, sy = FY - 11 + row * 4;
    const w = 9 + Math.round(r() * 2);
    if (sx + w > wallR - 1) continue;
    rect(g, sx, sy, w, 3, ['#9A9081', '#8A8073', '#A49A8A'][(i + row) % 3]!);
    rect(g, sx, sy, w, 1, '#B2A796');
  }
  // timber frame with grain
  const beam = (x: number, y: number, w: number, h: number) => {
    rect(g, x, y, w, h, '#7C5838');
    for (let i = 0; i < Math.max(w, h); i += 3) {
      if (w > h) rect(g, x + i, y + (i % 2), 2, 1, '#6A4A2E'); else rect(g, x + (i % 2), y + i, 1, 2, '#6A4A2E');
    }
    if (w > h) rect(g, x, y, w, 1, '#94704A'); else rect(g, x, y, 1, h, '#94704A');
  };
  beam(wallL, wallTop, 3, FY - wallTop - 12);
  beam(wallR - 3, wallTop, 3, FY - wallTop - 12);
  beam(wallL, wallTop, wallW, 3);
  beam(wallL + 33, wallTop + 3, 3, FY - wallTop - 15);
  beam(wallL, wallTop + 34, wallW, 3);
  // diagonal braces in the upper panels
  for (let i = 0; i < 14; i++) { rect(g, wallL + 4 + i * 2, wallTop + 32 - i * 2, 2, 2, '#7C5838'); rect(g, wallR - 6 - i * 2, wallTop + 32 - i * 2, 2, 2, '#7C5838'); }

  // ---- door (graded with the wall; its lamp glow is drawn per frame) ------------------------
  rect(g, dx - 3, dTop - 4, dw + 6, FY - dTop + 4, '#5E3E2A');
  rect(g, dx, dTop, dw, FY - dTop, '#9A6A46');
  for (let i = 1; i < 4; i++) rect(g, dx + i * 6, dTop + 3, 1, FY - dTop - 3, '#7E5236');
  rect(g, dx + 2, dTop + 12, dw - 4, 2, '#7A4E34'); rect(g, dx + 2, dTop + 30, dw - 4, 2, '#7A4E34');
  rect(g, dx, dTop, dw, 2, '#7A4E34');
  for (let i = 0; i < 5; i++) rect(g, dx + 2 + i, dTop - 3 - i, dw - 4 - i * 2, 1, '#8A5A3C');
  rect(g, dx + dw - 6, dTop + 20, 2, 2, '#E8C878');
  // step
  rect(g, dx - 5, FY, dw + 10, 4, '#7A7064'); rect(g, dx - 5, FY, dw + 10, 1, '#9A9081');
  rect(g, dx - 3, FY + 4, dw + 6, 3, '#6A6055');

  // ---- window frames (glass is lit per frame) -----------------------------------------------
  for (const [wx, wy, ww, wh] of k.wins) {
    rect(g, wx - 3, wy - 3, ww + 6, wh + 6, '#5E3E2A');
    rect(g, wx - 4, wy + wh + 3, ww + 8, 3, '#BC9F76');
    rect(g, wx - 4, wy + wh + 6, ww + 8, 1, 'rgba(42,30,26,.45)');
    // shutters
    rect(g, wx - 9, wy - 2, 5, wh + 4, '#5E7A6A'); rect(g, wx + ww + 4, wy - 2, 5, wh + 4, '#5E7A6A');
    for (let j = 0; j < wh + 4; j += 3) { rect(g, wx - 9, wy - 2 + j, 5, 1, '#4C6858'); rect(g, wx + ww + 4, wy - 2 + j, 5, 1, '#4C6858'); }
    // flower box
    rect(g, wx - 2, wy + wh + 7, ww + 4, 4, '#7C5838');
    for (let i = 0; i < ww + 2; i += 3) rect(g, wx - 1 + i, wy + wh + 5 - (i % 2), 2, 2, i % 6 ? '#D0738C' : '#F6D2DA');
  }

  // ---- roof ---------------------------------------------------------------------------------
  for (let rr = 0; rr < roofH; rr += 5) {
    const row = (rr / 5) | 0;
    const hwid = (rr / roofH) * halfW + 6;
    const y = apexY + rr;
    rect(g, cx - hwid, y, hwid * 2, 5, row % 2 ? '#94473A' : '#A05140');
    // individual tiles: staggered joints, random tone, scalloped bottoms
    for (let sx = cx - hwid + (row % 2) * 3; sx < cx + hwid - 2; sx += 6) {
      const tone = r();
      if (tone < 0.22) rect(g, sx + 1, y + 1, 4, 3, '#8A4034');
      else if (tone > 0.86) rect(g, sx + 1, y + 1, 4, 3, '#B05C48');
      rect(g, sx, y, 1, 4, '#7A3A2E');
      rect(g, sx + 1, y + 4, 4, 1, '#6E3228');
    }
    rect(g, cx - hwid, y, hwid * 2, 1, row % 2 ? '#AC5A46' : '#B66450');
  }
  // eave board + overhang shadow on the wall
  rect(g, cx - eaveW, eavesY - 2, eaveW * 2, 6, '#5E3E2C');
  rect(g, cx - eaveW, eavesY - 2, eaveW * 2, 1, '#7A5238');
  for (let i = 0; i < 7; i++) rect(g, wallL, eavesY + 4 + i, wallW, 1, `rgba(30,18,22,${(0.42 - i * 0.06).toFixed(2)})`);
  // rafter tails under the eave
  for (let x = cx - eaveW + 4; x < cx + eaveW - 2; x += 9) rect(g, x, eavesY + 4, 2, 2, '#4E3226');
  // barge boards along both slopes
  for (let rr = 0; rr < roofH; rr++) {
    const hwid = (rr / roofH) * halfW + 6;
    rect(g, cx - hwid - 2, apexY + rr, 2, 1, '#4E3226');
    rect(g, cx + hwid, apexY + rr, 2, 1, '#4E3226');
  }
  rect(g, cx - 8, apexY - 3, 16, 5, '#6E3228');
  rect(g, cx - 8, apexY - 3, 16, 1, '#B66450');
  // moss along the eave and in the valleys of the left slope
  for (let i = 0; i < 70; i++) {
    const t = r();
    const rr = roofH * (0.55 + t * 0.45);
    const hwid = (rr / roofH) * halfW + 6;
    const side = r() < 0.6 ? -1 : 1;
    const x = cx + side * (hwid - 1 - r() * 14), y = apexY + rr - r() * 3;
    rect(g, x, y, 1 + (r() < 0.3 ? 1 : 0), 1, r() < 0.5 ? '#5E7A44' : '#4A6638');
  }
  // gable vent
  rect(g, cx - 4, apexY + 22, 8, 7, '#5E3E2C'); for (let i = 0; i < 3; i++) rect(g, cx - 3, apexY + 23 + i * 2, 6, 1, '#3A2820');

  // ---- chimney on the right slope -----------------------------------------------------------
  const { chx, chBase, chTop } = k;
  rect(g, chx, chTop, 14, chBase - chTop + 6, '#6E4A38');
  for (let i = 0; i < Math.floor((chBase - chTop) / 5); i++) {
    rect(g, chx + 1, chTop + 3 + i * 5, 12, 4, i % 2 ? '#7E5642' : '#5E3E2E');
    rect(g, chx + 2 + (i % 3) * 3, chTop + 4 + i * 5, 3, 1, '#8E6250');
    rect(g, chx + 1 + ((i * 5) % 9), chTop + 3 + i * 5, 1, 4, '#4E3226');
  }
  rect(g, chx - 2, chTop - 4, 18, 5, '#4E3628');
  rect(g, chx - 2, chTop - 4, 18, 1, '#6E4E3A');

  // ---- outer ink + light ---------------------------------------------------------------------
  g.globalAlpha = 0.45; g.fillStyle = INK;
  g.fillRect(wallL - 1, wallTop, 1, FY - wallTop);
  g.fillRect(wallR, wallTop, 1, FY - wallTop);
  g.globalAlpha = 1;
  // moon from the upper left: the right third of the house falls into shade
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const sh = g.createLinearGradient(cx - 20, 0, wallR + 20, 0);
  sh.addColorStop(0, 'rgba(20,16,40,0)'); sh.addColorStop(1, 'rgba(20,16,40,.34)');
  g.fillStyle = sh; g.fillRect(0, 0, BW, BH);
  // cool night grade over everything baked (the warm lights are drawn on top, ungraded)
  g.fillStyle = 'rgba(30,40,78,.40)'; g.fillRect(0, 0, BW, BH);
  // faint moon rim on the left slope and wall edge
  g.fillStyle = 'rgba(190,210,240,.22)';
  for (let rr = 0; rr < roofH; rr++) { const hwid = (rr / roofH) * halfW + 6; g.fillRect(Math.round(cx - hwid - 2), apexY + rr, 1, 1); }
  g.fillRect(wallL, wallTop + 4, 1, FY - wallTop - 16);
  // ground-contact darkening at the plinth
  const gd = g.createLinearGradient(0, FY - 16, 0, FY);
  gd.addColorStop(0, 'rgba(10,12,16,0)'); gd.addColorStop(1, 'rgba(10,12,16,.45)');
  g.fillStyle = gd; g.fillRect(0, FY - 16, BW, 16);
  g.restore();
  return (baked = c);
}

function fern(g: G, x: number, y: number, h: number, flip: number, c1: string, c2: string) {
  for (let i = 0; i < h; i++) {
    const px = x + flip * Math.round((i * i) / (h * 2.2));
    rect(g, px, y - i, 1, 1, c1);
    if (i > 1 && i % 2 === 0) { rect(g, px - 2, y - i + 1, 2, 1, c2); rect(g, px + 1, y - i + 1, 2, 1, c2); }
  }
}

/** x0 = left edge of the footprint, floor = ground line */
export function drawCottage(g: G, x0: number, floor: number, t: number) {
  const X = Math.round(x0), FY = Math.round(floor);
  const k = geo(X, FY);
  const { cx, wallW, dx, dw, dTop } = k;

  // soft elliptical contact shadow, kept tight under the walls
  for (let r = 0; r < 8; r++) {
    const w = wallW + 40 - r * 8, a = 0.30 - r * 0.035;
    rect(g, cx - w / 2, FY - 3 + r, w, 1, `rgba(6,10,10,${a.toFixed(3)})`);
  }

  g.drawImage(bake(), X - BX, FY - BY);

  // ---- light: windows ------------------------------------------------------------------------
  for (const [wx, wy, ww, wh] of k.wins) {
    const flick = 0.88 + 0.12 * Math.sin(t * 1.6 + wx * 0.05) + 0.03 * Math.sin(t * 7.3 + wx);
    halo(g, wx + ww / 2, wy + wh / 2, ww * 1.5, '255,190,104', 0.30 * flick);
    rect(g, wx, wy, ww, wh, `rgb(${Math.round(232 * flick)},${Math.round(170 * flick)},${Math.round(92 * flick)})`);
    rect(g, wx + 1, wy + 1, ww - 2, 5, `rgb(${Math.round(255 * flick)},${Math.round(220 * flick)},${Math.round(150 * flick)})`);
    // room inside: a lamp shade and the back of a chair against the warm glass
    rect(g, wx + ww - 9, wy + 7, 5, 3, '#F6E0A8'); rect(g, wx + ww - 7, wy + 10, 1, 5, '#7A4E34');
    rect(g, wx + 4, wy + wh - 9, 6, 6, 'rgba(120,60,40,.55)');
    rect(g, wx + 1, wy + 6, 3, wh - 9, 'rgba(226,140,116,.6)');
    rect(g, wx + ww - 4, wy + 6, 3, wh - 9, 'rgba(226,140,116,.6)');
    rect(g, wx + (ww >> 1) - 1, wy, 2, wh, '#4E3226');
    rect(g, wx, wy + (wh >> 1) - 1, ww, 2, '#4E3226');
    // warm spill on the sill and plaster below
    g.fillStyle = `rgba(255,186,110,${(0.16 * flick).toFixed(3)})`;
    g.fillRect(wx - 3, wy + wh + 3, ww + 6, 10);
  }
  // ---- light: porch lamp + chimney + door spill ----------------------------------------------
  const lamp = 0.82 + 0.18 * Math.sin(t * 2.2);
  halo(g, dx + dw / 2, dTop - 14, 26, '255,186,104', 0.34 * lamp);
  rect(g, dx + dw / 2 - 2, dTop - 19, 4, 6, '#2E2420');
  rect(g, dx + dw / 2 - 1, dTop - 18, 2, 4, `rgba(255,220,150,${(0.75 + 0.25 * lamp).toFixed(2)})`);
  g.fillStyle = `rgba(255,190,120,${(0.10 * lamp).toFixed(3)})`; g.fillRect(dx, dTop, dw, FY - dTop);
  rect(g, k.chx + 5, k.chTop - 3, 4, 2, 'rgba(255,170,96,.55)');
  g.fillStyle = 'rgba(190,200,214,.12)';
  for (let i = 0; i < 10; i++) {
    const sy = k.chTop - 10 - i * 8;
    const sx = k.chx + 7 + Math.sin(t * 0.8 + i * 0.7) * (2 + i * 0.8);
    g.fillRect(Math.round(sx), Math.round(sy), 3 + (i >> 2), 2);
  }
  g.fillStyle = `rgba(255,190,110,${(0.12 + 0.05 * lamp).toFixed(3)})`;
  g.beginPath();
  g.moveTo(dx - 8, FY + 2); g.lineTo(dx + dw + 8, FY + 2); g.lineTo(dx + dw + 26, FY + 18); g.lineTo(dx - 26, FY + 18);
  g.fill();

  // ---- ground: grassy mound, ferns and the grove's mushrooms in front of the plinth ---------
  const mound = (x: number, w: number) => {
    for (let i = 0; i < w; i++) {
      const hh = Math.round(3 + 3 * Math.sin((i / w) * Math.PI));
      rect(g, X + x + i, FY - hh + 1, 1, hh + 2, i % 3 ? '#2E4632' : '#26402C');
      if (i % 2 === 0) rect(g, X + x + i, FY - hh - (i % 4 ? 1 : 2), 1, 1 + (i % 4 ? 0 : 1), '#3E6244');
    }
  };
  mound(-6, 40); mound(104, 56);
  const ferns: [number, number, number][] = [[2, 13, -1], [9, 10, 1], [18, 8, -1], [118, 12, 1], [128, 15, -1], [140, 10, 1], [146, 13, 1]];
  for (const [ox, h, f] of ferns) fern(g, X + ox, FY + 1, h, f, '#3E6A44', '#2E5236');
  const caps: [number, number, string][] = [[14, 4, '#C8607A'], [24, 3, '#D88AA0'], [114, 5, '#C8607A'], [134, 3, '#E0A2B4']];
  for (const [ox, rr, col] of caps) {
    rect(g, X + ox, FY - rr - 1, 2, rr + 1, '#E8DCC8');
    rect(g, X + ox - rr + 1, FY - rr - 3, rr * 2, 2, col);
    rect(g, X + ox - rr + 2, FY - rr - 4, rr * 2 - 2, 1, col);
    rect(g, X + ox - 1, FY - rr - 3, 1, 1, '#F6E6EE');
  }
  // fireflies by the door
  for (let i = 0; i < 4; i++) {
    const a = 0.4 + 0.6 * Math.max(0, Math.sin(t * 1.7 + i * 2.1));
    rect(g, X + 40 + i * 22 + Math.sin(t * 0.6 + i) * 6, FY - 20 - i * 7 + Math.cos(t * 0.9 + i) * 4, 1, 1, `rgba(255,236,160,${a.toFixed(2)})`);
  }
}
