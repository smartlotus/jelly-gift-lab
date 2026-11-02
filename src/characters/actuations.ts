// Actuation (muscles, per-node friction/gravity) per character, shared by the main thread and the sim worker.
import type { Actuation } from '../core/character';
import { sharkActuation } from './shark/actuation';
import { pigActuation } from './pig/actuation';
export const ACTUATIONS: Record<string, Actuation> = { shark: sharkActuation, pig: pigActuation };
export const actuationFor = (id: string) => ACTUATIONS[id];
