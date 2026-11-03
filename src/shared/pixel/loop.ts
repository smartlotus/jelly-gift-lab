// Fixed-timestep loop: update() at exactly 60 Hz (deterministic physics, same feel on 60/120 Hz screens),
// render(alpha) once per animation frame. Pauses when the tab is hidden.
// Headless screenshots: set window.__pause = true to freeze (or ?dev&step) - see docs/HANDOFF.md "gotchas".
export const STEP = 1 / 60;
declare global { interface Window { __pause?: boolean; __steps?: number } }
export function startLoop(update: (dt: number) => void, render: (alpha: number) => void) {
  let acc = 0, last = performance.now(), raf = 0, running = true;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    let dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (window.__pause) { dt = 0; if (window.__steps) { window.__steps--; dt = STEP; } }
    acc += dt; let n = 0;
    while (acc >= STEP && n++ < 5) { update(STEP); acc -= STEP; }
    if (n >= 5) acc = 0;
    render(acc / STEP);
  };
  const vis = () => { if (document.hidden) { cancelAnimationFrame(raf); running = false; } else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } };
  document.addEventListener('visibilitychange', vis);
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', vis); };
}
