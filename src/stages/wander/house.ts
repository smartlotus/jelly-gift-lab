// The warm cottage at the end of the mushroom grove.
// Integer-pixel drawing in the plate's palette (cream plaster, terracotta shingles, timber frame,
// warm windows). Geometry: a real gable whose eaves sit exactly on the wall top, a chimney on the
// right slope, a porch lamp and a light spill on the path.

const INK = '#2A1E1A';

function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  if (w <= 0 || h <= 0) return;
  g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function dither(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: string, b: string, k: number) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    g.fillStyle = (((i & 1) + 2 * (j & 1)) / 4) < k ? b : a;
    g.fillRect(Math.round(x + i), Math.round(y + j), 1, 1);
  }
}

function halo(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, rgb: string, a0: number) {
  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  for (let i = Math.round(r); i > 0; i -= 3) {
    const t = 1 - i / r;
    g.fillStyle = `rgba(${rgb},${(a0 * t * t).toFixed(3)})`;
    g.fillRect(Math.round(cx - i), Math.round(cy - i), i * 2, i * 2);
  }
  g.restore();
}

export const COTTAGE_W = 152;   // overall footprint incl. eaves
export const COTTAGE_H = 132;

/** x = left edge of the footprint, floor = ground line */
export function drawCottage(g: CanvasRenderingContext2D, x0: number, floor: number, t: number) {
  const X = Math.round(x0), FY = Math.round(floor);
  const cx = X + 76;
  const wallW = 100, wallL = cx - wallW / 2, wallR = cx + wallW / 2;
  const wallTop = FY - 72;
  const apexY = FY - 132, eavesY = wallTop;
  const halfW = 58, eaveW = 74;         // roof half width at the eaves (overhang)

  // soft elliptical contact shadow, kept tight under the walls (no dark bar across the path)
  for (let r = 0; r < 8; r++) {
    const w = wallW + 26 - r * 7, a = 0.26 - r * 0.031;
    rect(g, cx - w / 2, FY - 3 + r, w, 1, `rgba(8,14,12,${a.toFixed(3)})`);
  }

  // ---- walls -------------------------------------------------------------------------------
  rect(g, wallL, wallTop, wallW, FY - wallTop, '#D9BE96');
  dither(g, wallL, wallTop + 40, wallW, 22, '#D9BE96', '#C7A87C', 0.5);
  rect(g, wallL, wallTop, wallW, 4, '#E8D0A9');
  // stone plinth
  rect(g, wallL, FY - 12, wallW, 12, '#8A8073');
  for (let i = 0; i < 8; i++) {
    const sx = wallL + 4 + i * 12, sy = FY - 9 + (i % 3) * 3;
    rect(g, sx, sy, 9, 3, i % 2 ? '#9A9081' : '#796F63');
  }
  // timber frame
  rect(g, wallL, wallTop, 3, FY - wallTop, '#7C5838');
  rect(g, wallR - 3, wallTop, 3, FY - wallTop, '#7C5838');
  rect(g, wallL, wallTop, wallW, 3, '#7C5838');
  rect(g, wallL + 33, wallTop + 3, 3, FY - wallTop - 3, '#8A6440');
  rect(g, wallL, wallTop + 34, wallW, 3, '#8A6440');
  // outer ink line
  g.globalAlpha = 0.45; g.fillStyle = INK;
  g.fillRect(wallL - 1, wallTop, 1, FY - wallTop);
  g.fillRect(wallR, wallTop, 1, FY - wallTop);
  g.globalAlpha = 1;

  // ---- door --------------------------------------------------------------------------------
  const dw = 26, dx = cx - dw / 2, dTop = FY - 44;
  rect(g, dx - 3, dTop - 4, dw + 6, FY - dTop + 4, '#6A4830');
  rect(g, dx, dTop, dw, FY - dTop, '#9A6A46');
  for (let i = 1; i < 4; i++) rect(g, dx + i * 6, dTop + 3, 1, FY - dTop - 3, '#8A5A3C');
  rect(g, dx, dTop, dw, 2, '#7A4E34');
  for (let i = 0; i < 5; i++) rect(g, dx + 2 + i, dTop - 3 - i, dw - 4 - i * 2, 1, '#8A5A3C');
  rect(g, dx + dw - 6, dTop + 20, 2, 2, '#E8C878');
  rect(g, dx - 5, FY, dw + 10, 4, '#7A7064');
  rect(g, dx - 3, FY + 4, dw + 6, 3, '#6A6055');

  // ---- windows -----------------------------------------------------------------------------
  const win = (wx: number, wy: number, ww: number, wh: number) => {
    const flick = 0.86 + 0.14 * Math.sin(t * 1.6 + wx * 0.05);
    halo(g, wx + ww / 2, wy + wh / 2, ww * 1.35, '255,196,110', 0.26 * flick);
    rect(g, wx - 3, wy - 3, ww + 6, wh + 6, '#6A4830');
    rect(g, wx, wy, ww, wh, `rgba(${Math.round(226 * flick)},${Math.round(168 * flick)},${Math.round(96 * flick)},1)`);
    rect(g, wx + 1, wy + 1, ww - 2, 5, `rgba(${Math.round(252 * flick)},${Math.round(214 * flick)},${Math.round(150 * flick)},1)`);
    // curtain edges + a hint of the room below the sill line
    rect(g, wx + 1, wy + 6, 4, wh - 10, 'rgba(226,150,120,.55)');
    rect(g, wx + ww - 5, wy + 6, 4, wh - 10, 'rgba(226,150,120,.55)');
    rect(g, wx + 1, wy + wh - 4, ww - 2, 3, '#B86A42');
    rect(g, wx + 3, wy + 6, 1, 2, 'rgba(255,246,214,.8)');
    rect(g, wx + (ww >> 1) - 1, wy, 2, wh, '#7C5838');
    rect(g, wx, wy + (wh >> 1) - 1, ww, 2, '#7C5838');
    rect(g, wx - 4, wy + wh + 3, ww + 8, 3, '#BC9F76');
    g.globalAlpha = 0.35; g.fillStyle = INK; g.fillRect(wx - 4, wy + wh + 6, ww + 8, 1); g.globalAlpha = 1;
  };
  win(wallL + 8, FY - 50, 22, 20);
  win(wallR - 30, FY - 50, 22, 20);

  // ---- porch lamp ----------------------------------------------------------------------------
  const lamp = 0.8 + 0.2 * Math.sin(t * 2.2);
  halo(g, dx + dw / 2, dTop - 14, 20, '255,186,104', 0.3 * lamp);
  rect(g, dx + dw / 2 - 2, dTop - 19, 4, 6, '#3A2A22');
  rect(g, dx + dw / 2 - 1, dTop - 18, 2, 4, `rgba(255,214,140,${(0.7 + 0.3 * lamp).toFixed(2)})`);

  // ---- roof ----------------------------------------------------------------------------------
  const roofH = eavesY - apexY;
  // shingle rows inside the gable triangle
  for (let r = 0; r < roofH; r += 5) {
    const k = (r + 5) / roofH;
    const hwid = (r / roofH) * halfW + 6;
    const y = apexY + r;
    rect(g, cx - hwid, y, hwid * 2, 5, ((r / 5) | 0) % 2 ? '#94473A' : '#A05140');
    // scalloped shingle bottoms
    for (let sx = cx - hwid; sx < cx + hwid - 3; sx += 7) {
      rect(g, sx, y + 4, 4, 1, ((r / 5) | 0) % 2 ? '#6E3228' : '#7A3A2E');
    }
    rect(g, cx - hwid, y, hwid * 2, 1, ((r / 5) | 0) % 2 ? '#AC5A46' : '#B66450');
  }
  // eave board over the wall top (the overhang)
  rect(g, cx - eaveW, eavesY - 2, eaveW * 2, 6, '#5E3E2C');
  rect(g, cx - eaveW, eavesY - 2, eaveW * 2, 1, '#7A5238');
  // barge board along both slopes
  for (let r = 0; r < roofH; r++) {
    const hwid = (r / roofH) * halfW + 6;
    rect(g, cx - hwid - 2, apexY + r, 2, 1, '#4E3226');
    rect(g, cx + hwid, apexY + r, 2, 1, '#4E3226');
  }
  // ridge
  rect(g, cx - 8, apexY - 3, 16, 5, '#6E3228');
  rect(g, cx - 8, apexY - 3, 16, 1, '#B66450');

  // ---- chimney on the right slope ------------------------------------------------------------
  const chx = cx + 30, chBase = apexY + roofH * 0.72, chTop = apexY + 12;
  rect(g, chx, chTop, 14, chBase - chTop + 6, '#6E4A38');
  for (let i = 0; i < Math.floor((chBase - chTop) / 5); i++) {
    rect(g, chx + 1, chTop + 3 + i * 5, 12, 4, i % 2 ? '#7E5642' : '#5E3E2E');
    rect(g, chx + 2 + (i % 3) * 3, chTop + 4 + i * 5, 3, 1, '#8E6250');
  }
  rect(g, chx - 2, chTop - 4, 18, 5, '#4E3628');
  rect(g, chx - 2, chTop - 4, 18, 1, '#6E4E3A');
  rect(g, chx + 5, chTop - 3, 4, 2, 'rgba(255,170,96,.45)');
  // smoke
  g.fillStyle = 'rgba(200,210,214,.10)';
  for (let i = 0; i < 9; i++) {
    const sy = chTop - 10 - i * 8;
    const sx = chx + 7 + Math.sin(t * 0.8 + i * 0.7) * (2 + i * 0.7);
    g.fillRect(Math.round(sx), Math.round(sy), 3 + (i >> 2), 2);
  }

  // ---- plants + light spill -------------------------------------------------------------------
  const clumps = [[6, 0], [11, 1], [15, 2], [24, 0], [104, 1], [112, 0], [119, 2], [128, 1], [136, 0]];
  for (const [oxp, kind] of clumps) {
    const px = X + oxp, h = 5 + (kind === 1 ? 4 : kind === 2 ? 2 : 1);
    rect(g, px, FY - h, 2, h, '#3E6A44');
    rect(g, px - 3, FY - h - 2, 3, 2, ['#3E6A44', '#4A7A4E', '#356038'][kind]);
    rect(g, px + 1, FY - h - 1, 3, 2, '#4A7A4E');
    rect(g, px - 2, FY - h - 4, 4, 3, ['#C8607A', '#D0738C', '#EFB2BE'][kind]);
    rect(g, px - 1, FY - h - 5, 2, 1, '#F6D2DA');
  }
  g.fillStyle = `rgba(255,190,110,${(0.10 + 0.05 * lamp).toFixed(3)})`;
  g.beginPath();
  g.moveTo(dx - 8, FY + 2); g.lineTo(dx + dw + 8, FY + 2); g.lineTo(dx + dw + 22, FY + 16); g.lineTo(dx - 22, FY + 16);
  g.fill();
}
