import { onSound, soundOn, unlock, tone } from '../../shared/audio';
import { startMusic, stopTune, chime } from '../../shared/music';

let dripAt = 0;
export function startGroveAudio() {
  const go = () => { unlock(); if (soundOn()) startMusic('grove'); };
  go();
  onSound(v => { if (v) startMusic('grove'); });
}
export function drip(t: number) {
  if (!soundOn() || t < dripAt) return;
  dripAt = t + 3.2 + Math.random() * 4;
  tone(620 + Math.random() * 180, 0.35, 'sine', 0.025, { slide: -80 });
}
export function leaveGrove() { stopTune(0.9); }
export const sporeChime = () => chime('spore');
