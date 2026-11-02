import type { V3 } from './sdf';

/** Rest-space definition of a jelly character. Everything downstream (bake, sim, render) is generic. */
export interface CharacterShape {
  id: string;
  /** world-units -> centimetres for readouts */
  unitCm: number;
  bounds: { min: V3; max: V3 };
  /** outer clear-jelly surface */
  outer(x: number, y: number, z: number): number;
  /** inner opaque/milky layer (belly + eyes) */
  inner(x: number, y: number, z: number): number;
  /** body core without appendages (used for fin stiffness masks) */
  core(x: number, y: number, z: number): number;
  /** per-vertex pattern attributes evaluated at rest positions (4 floats) */
  attrs(x: number, y: number, z: number, out: Float32Array): void;
  /** can a trapped bubble live here? */
  bubbleOk(x: number, y: number, z: number): boolean;
  /** named rest-space landmarks embedded in the tet mesh for live measurements */
  landmarks: Record<string, V3>;
  /** surface voxel size multiplier for smooth characters (default 1) */
  surfScale?: number;
}

/** Muscle actuation: per-tet weights for N muscle channels and their activation over time. */
export interface Actuation {
  channels: number;
  /** rest-space fibre axis per channel (isochoric active stretch along it); default +x */
  axes?: V3[];
  weights(cx: number, cy: number, cz: number, out: Float32Array): void;
  activation(t: number, out: Float32Array): void;
  /** optional per-tet stiffness multiplier (rest centroid) */
  stiffness?(cx: number, cy: number, cz: number): number;
  /** optional per-node floor friction multiplier (rest position) */
  friction?(x: number, y: number, z: number): number;
  /** optional per-node gravity multiplier (lets tall jelly fins stand) */
  gravity?(x: number, y: number, z: number): number;
}
