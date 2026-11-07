import { onSound, soundOn, unlock, noise, tone } from '../../shared/audio';
import { startMusic, stopTune, chime } from '../../shared/music';
import { place, whoosh } from '../../shared/sfx';

export function startHomeAudio(which: 'hearth' | 'dream' = 'hearth') {
  const go = () => { unlock(); if (soundOn()) startMusic(which); };
  go();
  onSound(v => { if (v) startMusic(which); });
}
export const toDream = () => startMusic('dream');
export const leaveHome = () => stopTune(1);
export const placed = () => place();
export const saved = () => chime('save');
export const opened = () => chime('door');
export const whooshSoft = () => whoosh(false);
export function wood() { if (soundOn()) { unlock(); noise(0.12, 0.035, { type: 'lowpass', freq: 400, to: 140, q: 0.6 }); tone(196, 0.14, 'triangle', 0.04); } }
export function snow() { if (soundOn()) { unlock(); noise(0.18, 0.03, { type: 'highpass', freq: 1800, to: 900, q: 0.5 }); } }
