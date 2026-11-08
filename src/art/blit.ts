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

export interface GroundPlate {
  img: CanvasImageSource & { width: number; height: number };
  pathT: number;
}

const fadeCache = new WeakMap<object, HTMLCanvasElement>();

function withLeftFade(img: CanvasImageSource & { width: number; height: number }, fadePx: number) {
  const hit = fadeCache.get(img);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const cg = c.getContext('2d')!;
  cg.imageSmoothingEnabled = false;
  cg.drawImage(img, 0, 0);
  const fade = Math.max(8, Math.min(img.width >> 2, fadePx));
  const grd = cg.createLinearGradient(0, 0, fade, 0);
  grd.addColorStop(0, 'rgba(0,0,0,1)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  cg.globalCompositeOperation = 'destination-out';
  cg.fillStyle = grd;
  cg.fillRect(0, 0, fade, c.height);
  fadeCache.set(img, c);
  return c;
}

/** Tile complete grounded landscape plates so their painted path sits on `floor`. */
export function blitGroundTiles(
  g: CanvasRenderingContext2D,
  plates: GroundPlate[],
  camX: number,
  floor: number,
  w: number,
  cover = 1,
) {
  if (!plates.length) return;
  const ref = plates[0]!;
  const s = (floor / Math.max(8, ref.pathT * ref.img.height)) * cover;
  const rawW = Math.max(8, Math.round(ref.img.width * s));
  const overlap = Math.min(140, Math.max(48, (rawW * 0.10) | 0));
  const tileW = Math.max(8, rawW - overlap);
  const start = Math.floor(camX / tileW) - 1;
  const end = start + Math.ceil(w / tileW) + 2;
  g.imageSmoothingEnabled = false;
  for (let i = start; i <= end; i++) {
    const plate = plates[((i % plates.length) + plates.length) % plates.length]!;
    const si = (floor / Math.max(8, plate.pathT * plate.img.height)) * cover;
    const dw = Math.round(plate.img.width * si);
    const dh = Math.round(plate.img.height * si);
    const y = Math.round(floor - plate.pathT * dh);
    const x = Math.round(i * tileW - camX);
    const fadeSrc = Math.max(8, Math.round(overlap / si));
    const src = withLeftFade(plate.img, fadeSrc);
    g.drawImage(src, x, y, dw, dh);
  }
}
