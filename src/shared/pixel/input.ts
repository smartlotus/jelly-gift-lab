// Unified input: keyboard + on-screen touch buttons (touch.ts) + gamepad. Game code only sees actions.
// Call input.update() once per fixed step BEFORE reading; pressed() = held, hit() = went down this step.
export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'act';
const KEYS: Record<string, Action> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump', KeyK: 'jump', KeyX: 'act', KeyE: 'act', KeyJ: 'act', Enter: 'act',
};
class Input {
  private held = new Set<Action>(); private virt = new Map<Action, number>(); private prev = new Set<Action>(); private now = new Set<Action>();
  enabled = true;
  constructor() {
    window.addEventListener('keydown', e => { const a = KEYS[e.code]; if (a) { this.held.add(a); e.preventDefault(); } });
    window.addEventListener('keyup', e => { const a = KEYS[e.code]; if (a) this.held.delete(a); });
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); });
  }
  /** touch buttons call these (counted, so two fingers on one button are fine) */
  down(a: Action) { this.virt.set(a, (this.virt.get(a) ?? 0) + 1); }
  up(a: Action) { const n = (this.virt.get(a) ?? 1) - 1; if (n <= 0) this.virt.delete(a); else this.virt.set(a, n); }
  /** release everything (focus loss, page hidden, scripted cut-scenes) */
  reset() { this.held.clear(); this.virt.clear(); this.resetHook?.(); }
  /** set by touch.ts so a reset also clears the on-screen buttons */
  resetHook?: () => void;
  update() {
    this.prev = this.now; this.now = new Set(this.enabled ? [...this.held, ...this.virt.keys()] : []);
    const gp = this.enabled ? navigator.getGamepads?.()[0] : null;
    if (gp) {
      const ax = gp.axes[0] ?? 0;
      if (ax < -0.4 || gp.buttons[14]?.pressed) this.now.add('left');
      if (ax > 0.4 || gp.buttons[15]?.pressed) this.now.add('right');
      if (gp.buttons[0]?.pressed) this.now.add('jump');
      if (gp.buttons[2]?.pressed || gp.buttons[1]?.pressed) this.now.add('act');
    }
  }
  pressed(a: Action) { return this.now.has(a); }
  hit(a: Action) { return this.now.has(a) && !this.prev.has(a); }
  axis() { return (this.pressed('right') ? 1 : 0) - (this.pressed('left') ? 1 : 0); }
}
export const input = new Input();
