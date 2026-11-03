// Crisp integer-scaled pixel screen. The canvas backing store is the LOGICAL resolution (e.g. ~320x180); CSS upscales it
// by an integer number of DEVICE pixels with image-rendering: pixelated, so every art pixel is an exact NxN block.
// scale = largest integer such that the view still shows at least minW x minH logical px. View width/height then grow to
// fill the host (portrait phones see less width, more sky). maxH caps the height (camera fills the rest with the backdrop).
export interface ScreenOpts { host: HTMLElement; minW?: number; minH?: number; maxW?: number; maxH?: number }
export class PixelScreen {
  readonly canvas = document.createElement('canvas');
  readonly ctx: CanvasRenderingContext2D;
  w = 320; h = 180; scale = 1; dpr = 1;
  private subs: (() => void)[] = [];
  constructor(private o: ScreenOpts) {
    o.host.classList.add('pixel-host'); o.host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    new ResizeObserver(() => this.resize()).observe(o.host); this.resize();
  }
  onResize(f: () => void) { this.subs.push(f); }
  /** change sizing options at runtime (e.g. portrait vs landscape minimums) and re-fit */
  configure(o: Partial<Omit<ScreenOpts, 'host'>>) { Object.assign(this.o, o); this.w = -1; this.resize(); }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3), r = this.o.host.getBoundingClientRect();
    const dw = Math.max(1, Math.round(r.width * dpr)), dh = Math.max(1, Math.round(r.height * dpr));
    const minW = this.o.minW ?? 256, minH = this.o.minH ?? 144;
    const s = Math.max(1, Math.floor(Math.min(dw / minW, dh / minH)));
    const w = Math.min(Math.ceil(dw / s), this.o.maxW ?? 1e9), h = Math.min(Math.ceil(dh / s), this.o.maxH ?? 1e9);
    if (w === this.w && h === this.h && s === this.scale && dpr === this.dpr) return;
    Object.assign(this, { w, h, scale: s, dpr });
    this.canvas.width = w; this.canvas.height = h;
    this.canvas.style.width = `${(w * s) / dpr}px`; this.canvas.style.height = `${(h * s) / dpr}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.subs.forEach(f => f());
  }
  /** css px (client) -> logical px */
  toLogical(cx: number, cy: number) { const r = this.canvas.getBoundingClientRect(); return { x: ((cx - r.left) / r.width) * this.w, y: ((cy - r.top) / r.height) * this.h }; }
  /** logical px -> css px (client), e.g. to place a DOM label or a three.js viewport over a world object */
  toClient(x: number, y: number) { const r = this.canvas.getBoundingClientRect(); return { x: r.left + (x / this.w) * r.width, y: r.top + (y / this.h) * r.height }; }
}
