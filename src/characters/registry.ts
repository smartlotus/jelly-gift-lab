// Character registry: wires each character's runtime modules (actuation, look, metrics, camera) to its baked assets.
import type { CharacterSetup } from '../app/engine';
import type { Look } from '../core/look';
import { ACTUATIONS } from './actuations';
import { sharkLook } from './shark/look';
import { pigLook } from './pig/look';
import { catLook } from './cat/look';

export interface CharacterEntry extends CharacterSetup {
  name: string; zh: string; subtitle: string; num: string; ready: boolean; look: Look;
}
export const CHARACTERS: CharacterEntry[] = [
  {
    id: 'shark', name: 'Great Hammerhead', zh: '鲨', subtitle: '果冻标本 · 无沟双髻鲨', num: '1', ready: true,
    actuation: ACTUATIONS.shark, look: sharkLook, colourways: sharkLook.colourways,
    camera: { target: [-0.03, 0.085, 0.0], yaw: 0.62, pitch: 0.42, mobileYaw: 1.3, mobilePitch: 0.6, legacyFit: true },
    idle: { at: [0.47, 0.045, 0], lift: [0.02, 0.075, 0], period: 13, duration: 3.2, radius: 0.13, offset: 6 },
    metrics: [
      { id: 'fork', label: 'Fork length', zh: '叉长', a: 'snout', b: 'fork', decimals: 2 },
      { id: 'eyes', label: 'Eye to eye', zh: '眼距', a: 'eyeL', b: 'eyeR', decimals: 2 },
    ],
  },
  {
    id: 'pig', name: 'Little Pig', zh: '猪', subtitle: '果冻标本 · 小粉猪', num: '2', ready: true, upright: 0.3,
    actuation: ACTUATIONS.pig, look: pigLook, colourways: pigLook.colourways,
    camera: { target: [0, 0.22, 0], yaw: 0.2, pitch: 0.22, mobileYaw: 0.16, mobilePitch: 0.2 },
    metrics: [
      { id: 'ears', label: 'Ear span', zh: '耳距', a: 'earL', b: 'earR', decimals: 2 },
      { id: 'snout', label: 'Snout to tail', zh: '鼻尾', a: 'snout', b: 'tail', decimals: 2 },
    ],
  },
  {
    id: 'cat', name: 'Sleepy Cat', zh: '猫', subtitle: '果冻标本 · 困困猫', num: '3', ready: true, upright: 0.3,
    actuation: ACTUATIONS.cat, look: catLook, colourways: catLook.colourways,
    idle: { at: [0.115, 0.275, -0.088], lift: [0.03, 0, 0.012], period: 6.5, duration: 4.2, radius: 0.04, offset: 2, wave: 2 },
    camera: { target: [0, 0.22, 0], yaw: 0.16, pitch: 0.2, mobileYaw: 0.12, mobilePitch: 0.18 },
    metrics: [
      { id: 'ears', label: 'Ear-tip span', zh: '耳尖距', a: 'earL', b: 'earR', decimals: 2 },
      { id: 'whiskers', label: 'Whisker span', zh: '须宽', a: 'whiskL', b: 'whiskR', decimals: 2 },
    ],
  },
];
