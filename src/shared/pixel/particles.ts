// Pooled sprite particles (hearts, sparkles, puffs). World- or screen-space - the caller decides by the offset it draws with.
// Positions are rounded at draw time (crisp pixels); no rotation/scaling (pixel discipline).
export interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number;
  img: HTMLCanvasElement; g: number; drag: number; sway: number; ph: number; blinkOut: boolean;
}
export class Particles {
  list: Particle[] = [];
  constructor(public cap = 1200) {}
  add(img: HTMLCanvasElement, x: number, y: number, vx: number, vy: number, o: Partial<Pick<Particle, 'g' | 'drag' | 'sway' | 'life' | 'blinkOut'>> = {}) {
    if (this.list.length >= this.cap) this.list.shift();
    const life = o.life ?? 1;
    const p: Particle = { x, y, vx, vy, life, max: life, img, g: o.g ?? 0, drag: o.drag ?? 0, sway: o.sway ?? 0, ph: Math.random() * 6.28, blinkOut: o.blinkOut ?? true };
    this.list.push(p); return p;
  }
  update(dt: number) {
    let n = 0;
    for (const p of this.list) {
      p.life -= dt; if (p.life <= 0) continue;
      p.vy += p.g * dt; const k = 1 - p.drag * dt; p.vx *= k; p.vy *= k;
      p.x += (p.vx + Math.sin(p.ph + p.life * 5) * p.sway) * dt; p.y += p.vy * dt;
      this.list[n++] = p;
    }
    this.list.length = n;
  }
  /** draw with a pixel offset (e.g. -camera). Particles in their last 0.35 s blink out (no alpha = stays pixel-clean). */
  draw(g: CanvasRenderingContext2D, ox = 0, oy = 0, vw = 1e9, vh = 1e9) {
    for (const p of this.list) {
      if (p.blinkOut && p.life < 0.35 && Math.floor(p.life * 20) % 2) continue;
      const x = Math.round(p.x + ox - p.img.width / 2), y = Math.round(p.y + oy - p.img.height / 2);
      if (x > vw || y > vh || x < -p.img.width || y < -p.img.height) continue;
      g.drawImage(p.img, x, y);
    }
  }
  clear() { this.list.length = 0; }
}
