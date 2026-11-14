// Gravity sensor for the jelly page: phone tilt -> world gravity direction (low-pass), shake -> impulses (high-pass).
// Reads DeviceOrientation (beta/gamma: the well-defined way to get "down" in device coords) and DeviceMotion.acceleration
// (gravity-free; falls back to accelerationIncludingGravity minus its own low-pass). Everything is clamped: the jelly can
// slide, slosh and bump against the screen edges, never explode.
const G = 39.2;          // sim gravity, units/s^2 (1 unit = 25 cm)
const M2U = 4;           // m/s^2 -> units/s^2

export class Tilt {
  on = false;
  /** screen-frame down vector (x right, y up, z out of the screen), low-passed */
  down = [0, -1, 0];
  private depth0 = NaN;   // slowly adapting neutral for the forward/back tilt (how she happens to hold the phone)
  /** screen-frame shake acceleration (units/s^2, pseudo-force = −device acceleration), high-passed + smoothed */
  shake = [0, 0, 0];
  private aLow = [0, 0, 0]; private aRaw = [0, 0, 0]; private gotMotion = false;
  private rawDown = [0, -1, 0]; lastEvent = 0;
  /** in-plane gravity direction on the screen (x right, y up), unit; test hook */
  inPlane = [0, -1];
  /** true while gravity points up the screen (the sim then gets a ceiling at the top of the view) */
  get upward() { return this.on && this.inPlane[1] > 0.2; }

  private onOri = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    const b = e.beta * Math.PI / 180, g = e.gamma * Math.PI / 180;
    const d = [Math.sin(g) * Math.cos(b), -Math.sin(b), -Math.cos(b) * Math.cos(g)]; // device-frame down
    this.rawDown = this.toScreen(d); this.lastEvent = performance.now();
  };
  private onMotion = (e: DeviceMotionEvent) => {
    const a = e.acceleration, ag = e.accelerationIncludingGravity;
    let v: number[] | null = null;
    if (a && a.x != null && a.y != null && a.z != null) v = [a.x, a.y, a.z];
    else if (ag && ag.x != null && ag.y != null && ag.z != null) v = [ag.x, ag.y, ag.z]; // high-passed below
    if (!v) return;
    this.aRaw = this.toScreen(v); this.gotMotion = true; this.lastEvent = performance.now();
  };
  private toScreen(v: number[]) {
    const ang = ((screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0) as number) * Math.PI / 180;
    const c = Math.cos(ang), s = Math.sin(ang);
    return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
  }
  start() { if (this.on) return; this.on = true; this.depth0 = NaN; this.lastEvent = 0; addEventListener('deviceorientation', this.onOri); addEventListener('devicemotion', this.onMotion); }
  stop() { this.on = false; removeEventListener('deviceorientation', this.onOri); removeEventListener('devicemotion', this.onMotion); this.shake = [0, 0, 0]; this.down = [0, -1, 0]; }

  /** per frame: the extra world acceleration (on top of the sim's −G·ŷ) given the camera's right / back vectors on the floor */
  update(dt: number, right: number[], back: number[], out: Float32Array) {
    if (!this.on || !this.lastEvent) { out.fill(0); return; }
    if (isNaN(this.depth0)) { this.down = this.rawDown.slice(); this.depth0 = this.down[2]; } // start from her grip, no jump
    const kd = 1 - Math.exp(-dt / 0.12); // tilt low-pass ~120 ms
    for (let i = 0; i < 3; i++) this.down[i] += (this.rawDown[i] - this.down[i]) * kd;
    // forward/back: relative to a neutral that follows her grip over ~4 s, so holding the phone at 40° isn't a slope
    this.depth0 += (this.down[2] - this.depth0) * (1 - Math.exp(-dt / 4));
    // 2026-11-14 fix: the in-plane direction of "down" now uses BOTH screen components. Before, only down[0] (screen-right)
    // and the forward/back depth were read and the vertical share was always "less of the floor's G", so turning the phone
    // so its top points down could never pull the jelly UP. ex/ey = unit in-plane down; near-flat phones (little in-plane
    // gravity, direction unreliable) blend back to the plain floor so lying on a table never makes it float.
    const px = this.down[0], py = this.down[1], pl = Math.hypot(px, py);
    const w = Math.min(1, Math.max(0, (pl - 0.12) / 0.33));
    let ex = pl > 1e-6 ? px / pl * w : 0, ey = pl > 1e-6 ? py / pl * w - (1 - w) : -1; const el = Math.hypot(ex, ey) || 1; ex /= el; ey /= el;
    this.inPlane[0] = ex; this.inPlane[1] = ey;
    let hx = ex * Math.min(1, pl) * 1.5, hz = -(this.down[2] - this.depth0) * 1.2; // screen-right / into-the-screen components (in G)
    const hl = Math.hypot(hx, hz), HMAX = 0.9; if (hl > HMAX) { hx *= HMAX / hl; hz *= HMAX / hl; }
    // shake: high-pass (remove slow bias / gravity), dead zone, smooth a little, pseudo-force opposite to the phone's motion
    const kl = 1 - Math.exp(-dt / 0.35), ks = 1 - Math.exp(-dt / 0.03), sh = [0, 0, 0];
    if (this.gotMotion) for (let i = 0; i < 3; i++) {
      this.aLow[i] += (this.aRaw[i] - this.aLow[i]) * kl;
      let hp = this.aRaw[i] - this.aLow[i]; const m = Math.abs(hp); hp = m < 0.6 ? 0 : Math.sign(hp) * (m - 0.6);
      sh[i] = -hp * M2U * 0.7;
    }
    for (let i = 0; i < 3; i++) this.shake[i] += (sh[i] - this.shake[i]) * ks;
    let [sx, sy, sz] = this.shake; const sl = Math.hypot(sx, sy, sz), SMAX = 2.2 * G; if (sl > SMAX) { sx *= SMAX / sl; sy *= SMAX / sl; sz *= SMAX / sl; }
    sy = Math.min(sy, 1.1 * G); // never fling it off the floor for long
    // world: lateral along camera-right, depth along −back (into the screen), up = +y; "toward the user" = +back
    const fwd = [-back[0], -back[2]];
    out[0] = G * (hx * right[0] + hz * fwd[0]) + sx * right[0] + sz * back[0];
    // vertical: upright (ey = −1) → the floor's G as before; sideways (ey ≈ 0) → little; top pointing down (ey = +1) → up
    const vert = ey * Math.sqrt(Math.max(0, 1 - Math.min(1, hx * hx + hz * hz) * 0.6));
    out[1] = sy + G * (1 + vert); // the sim already applies −G·ŷ
    out[2] = G * (hx * right[2] + hz * fwd[1]) + sx * right[2] + sz * back[2];
  }
}

/** is there plausibly a motion sensor here? (desktop: no) */
export const hasSensors = () => typeof DeviceOrientationEvent !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/** iOS 13+: must be asked on a user tap. Resolves true when granted (or no permission API). */
export async function askPermission(): Promise<boolean> {
  type P = { requestPermission?: () => Promise<'granted' | 'denied'> };
  try {
    const M = (window as unknown as { DeviceMotionEvent?: P }).DeviceMotionEvent, O = (window as unknown as { DeviceOrientationEvent?: P }).DeviceOrientationEvent;
    const r = await Promise.all([M?.requestPermission?.() ?? 'granted', O?.requestPermission?.() ?? 'granted']);
    return r.every(x => x === 'granted');
  } catch { return false; }
}
export const needsPermission = () => typeof (window as unknown as { DeviceMotionEvent?: { requestPermission?: unknown } }).DeviceMotionEvent?.requestPermission === 'function';
