// Side-scroller camera: follows a target with look-ahead in the facing direction, smooth, clamped to the world,
// rendered at integer offsets (no shimmering pixels).
export class Camera {
  x = 0; y = 0; private lx = 0;
  constructor(public worldW: number, public worldH: number) {}
  follow(tx: number, ty: number, face: number, vw: number, vh: number, dt: number) {
    this.lx += (face * 28 - this.lx) * Math.min(1, dt * 2.5);
    const gx = tx + this.lx - vw / 2, gy = ty - vh * 0.58;
    this.x += (gx - this.x) * Math.min(1, dt * 6); this.y += (gy - this.y) * Math.min(1, dt * 4);
    this.x = Math.max(0, Math.min(this.worldW - vw, this.x));
    this.y = vh >= this.worldH ? this.worldH - vh : Math.max(0, Math.min(this.worldH - vh, this.y)); // tall views: pin ground to bottom
  }
  snap(tx: number, ty: number, vw: number, vh: number) { this.lx = 0; this.x = tx - vw / 2; this.y = ty - vh * 0.58; this.follow(tx, ty, 0, vw, vh, 1); }
  get ix() { return Math.round(this.x); } get iy() { return Math.round(this.y); }
}
