import { onSound, soundOn, unlock } from '../../shared/audio';
import { startMusic, stopTune, chime } from '../../shared/music';
import { noise } from '../../shared/audio';

let rustleAt = 0;
export function startFlowerAudio() {
  const go = () => { if (soundOn()) startMusic('bloom'); };
  go();
  onSound(v => { if (v) startMusic('bloom'); });
}
export function rustle(t: number) {
  if (!soundOn() || t < rustleAt) return;
  rustleAt = t + 2.8 + Math.random() * 3.5;
  noise(0.28, 0.03, { type: 'bandpass', freq: 1400, to: 600, q: 0.8 });
}
export function leaveFlower() { stopTune(0.9); }
export const petalChime = () => chime('petal');
