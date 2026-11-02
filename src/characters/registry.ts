// Character registry: each entry wires shape-independent runtime modules (actuation, look) to baked assets.
import type { Actuation } from '../core/character';
import { sharkActuation } from './shark/actuation';
import { COLOURWAYS, type Colourway } from './shark/look';

export interface CharacterEntry {
  id: string; name: string; zh: string; ready: boolean;
  actuation?: Actuation;
  colourways?: Colourway[];
  /** default camera framing */
  camera?: { target: [number, number, number]; yaw: number; pitch: number; radius: number };
  idle?: { at: number[]; lift: number[]; period: number; duration: number; radius: number; offset?: number };
}
export const CHARACTERS: CharacterEntry[] = [
  { id: 'shark', name: 'Great Hammerhead', zh: '无沟双髻鲨', ready: true, actuation: sharkActuation, colourways: COLOURWAYS,
    camera: { target: [-0.03, 0.09, 0.0], yaw: 0.62, pitch: 0.46, radius: 0.66 },
    idle: { at: [0.47, 0.045, 0], lift: [0.02, 0.075, 0], period: 13, duration: 3.2, radius: 0.13, offset: 6 } },
  { id: 'pig', name: 'Pig', zh: '小猪', ready: false },
  { id: 'cat', name: 'Cat', zh: '小猫', ready: false },
];
export const actuationFor = (id: string) => CHARACTERS.find(c => c.id === id)?.actuation;
