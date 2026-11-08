// Integer-scaled sprite helpers. Always draw with imageSmoothingEnabled = false.
export function blitFeet(
  g: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  x: number, y: number,
  flip = false, targetH?: number, alpha = 1,
) {
  const h = img.height, w = img.width;
  if (!h || !w) return;
  const sc = targetH ? targetH / h : 1;
  g.save();
  g.imageSmoothingEnabled = false;
  g.globalAlpha = alpha;
  g.translate(Math.round(x), Math.round(y));
  g.scale(flip ? -sc : sc, sc);
  g.drawImage(img, -w / 2, -h);
  g.restore();
}

export function stamp(
  g: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  x: number, feetY: number, sc: number, alpha = 1,
) {
  const dw = Math.max(1, Math.round(img.width * sc));
  const dh = Math.max(1, Math.round(img.height * sc));
  g.save();
  g.imageSmoothingEnabled = false;
  g.globalAlpha = alpha;
  g.drawImage(img, 0, 0, img.width, img.height, Math.round(x - dw / 2), Math.round(feetY - dh), dw, dh);
  g.restore();
}

export function coverPlate(
  g: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  w: number, h: number,
  mode: 'cover' | 'cover-bottom' = 'cover',
) {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  const x = (w - dw) / 2;
  const y = mode === 'cover-bottom' ? h - dh : (h - dh) / 2;
  g.imageSmoothingEnabled = false;
  g.drawImage(img, x, y, dw, dh);
  return { x, y, s, dw, dh };
}

export function alignPlateFloor(
  g: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  w: number, floor: number, plateFloorT = 0.575,
) {
  const pf = img.height * plateFloorT;
  const s = Math.max(w / img.width, floor / Math.max(1, pf));
  const dw = img.width * s, dh = img.height * s;
  const x = (w - dw) / 2;
  const y = floor - pf * s;
  g.imageSmoothingEnabled = false;
  g.drawImage(img, x, y, dw, dh);
  return { x, y, s, dw, dh };
}
