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
}
export const CHARACTERS: CharacterEntry[] = [
  { id: 'shark', name: 'Great Hammerhead', zh: '无沟双髻鲨', ready: true, actuation: sharkActuation, colourways: COLOURWAYS,
    camera: { target: [-0.03, 0.09, 0.0], yaw: 0.62, pitch: 0.46, radius: 0.66 } },
  { id: 'pig', name: 'Pig', zh: '小猪', ready: false },
  { id: 'cat', name: 'Cat', zh: '小猫', ready: false },
];
export const actuationFor = (id: string) => CHARACTERS.find(c => c.id === id)?.actuation;
