// v03i: tiny shared SFX vocabulary so every stage taps the same palette (muted until the chrome switch is on).
import { blip, tone, noise, unlock, soundOn } from './audio';

const later = (ms: number, f: () => void) => setTimeout(f, ms);
const go = () => soundOn() && unlock();

/** UI chrome: language / sound / generic soft tap */
export const tap = () => { if (!go()) return; blip(880, 0.04, 'triangle', 0.05); };
export const toggleOn = () => { if (!go()) return; tone(988, 0.22, 'triangle', 0.07); later(70, () => tone(1319, 0.28, 'sine', 0.045)); };
export const toggleOff = () => { if (!go()) return; tone(660, 0.18, 'triangle', 0.05, { slide: -220 }); };

/** page transitions / iris */
export const whoosh = (deep = false) => { if (!go()) return; noise(deep ? 0.55 : 0.35, deep ? 0.07 : 0.045, { type: 'lowpass', freq: deep ? 500 : 900, to: 120, q: 0.6 }); tone(deep ? 110 : 180, deep ? 0.5 : 0.32, 'sine', 0.03, { slide: deep ? -60 : -90 }); };
export const arrive = () => { if (!go()) return; tone(523, 0.35, 'sine', 0.035); later(90, () => tone(784, 0.4, 'sine', 0.025)); };

/** jelly soft-body */
export const jellyGrab = () => { if (!go()) return; noise(0.12, 0.04, { type: 'bandpass', freq: 400, to: 180, q: 0.8 }); blip(220, 0.08, 'sine', 0.04, -40); };
export const jellyRelease = () => { if (!go()) return; blip(320, 0.14, 'sine', 0.05, 180); noise(0.18, 0.025, { type: 'lowpass', freq: 600, to: 200, q: 0.7 }); };
export const jellyTwist = () => { if (!go()) return; blip(180 + Math.random() * 40, 0.1, 'triangle', 0.035, 90); };
export const jellyReset = () => { if (!go()) return; tone(392, 0.2, 'sine', 0.05); later(80, () => tone(523, 0.25, 'sine', 0.04)); };
export const jellyColour = () => { if (!go()) return; blip(1046, 0.07, 'sine', 0.06); later(50, () => blip(1318, 0.1, 'sine', 0.04)); };
export const jellySwitch = () => { if (!go()) return; noise(0.25, 0.04, { type: 'lowpass', freq: 700, to: 200, q: 0.7 }); tone(294, 0.28, 'sine', 0.04, { slide: 80 }); };

/** coop / platformer extras */
export const step = () => { if (!go()) return; blip(140 + Math.random() * 30, 0.05, 'triangle', 0.04); };
export const coopJoin = () => { if (!go()) return; [523, 659, 784].forEach((f, i) => later(i * 70, () => blip(f, 0.16, 'sine', 0.05))); };
export const coopWin = () => { if (!go()) return; [523, 659, 784, 1047, 1319].forEach((f, i) => later(i * 90, () => blip(f, 0.2, 'square', 0.05))); };
export const jump = (hi = false) => { if (!go()) return; blip(hi ? 520 : 400, 0.12, 'square', 0.035, hi ? 520 : 380); };
export const land = () => { if (!go()) return; blip(110, 0.06, 'triangle', 0.045, -30); };
export const plate = (down: boolean) => { if (!go()) return; blip(down ? 660 : 440, 0.07, 'square', 0.035, down ? -120 : 0); };
export const gate = (open: boolean) => { if (!go()) return; noise(0.35, 0.04, { type: 'bandpass', freq: open ? 300 : 200, to: open ? 700 : 120, q: 1 }); blip(open ? 220 : 160, 0.3, 'triangle', 0.035, open ? 110 : -60); };
export const stepsUp = () => { if (!go()) return; [392, 494, 587, 784].forEach((f, i) => later(i * 80, () => blip(f, 0.09, 'square', 0.035))); };
export const coopFail = () => { if (!go()) return; blip(180, 0.25, 'sawtooth', 0.06, -80); later(100, () => blip(120, 0.3, 'triangle', 0.05, -40)); };

/** sky / quiet pages */
export const softChime = () => { if (!go()) return; tone(784, 0.4, 'sine', 0.04); later(100, () => tone(1175, 0.5, 'sine', 0.03)); };
export const tick = () => { if (!go()) return; blip(1200, 0.03, 'square', 0.03); };
