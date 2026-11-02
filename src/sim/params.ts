// Shared simulation parameters (CPU + GPU solvers use the same numbers).
export interface SimParams {
  gravity: number;      // units/s^2  (1 unit = 25 cm  ->  9.81 m/s^2 = 39.2 u/s^2)
  density: number;      // sim mass per unit^3
  muBody: number;       // deviatoric (co-rotational) stiffness
  muFin: number;        // fins are firmer
  lambdaRatio: number;  // volume stiffness = lambdaRatio * mu
  damping: number;      // velocity damping 1/s
  substeps: number;
  frictionStatic: number;
  frictionKinetic: number;
  grabStiffness: number;
}
export const DEFAULT_PARAMS: SimParams = {
  gravity: 39.2,
  density: 1,
  muBody: 90,
  muFin: 2500,
  lambdaRatio: 150,
  damping: 1.2,
  substeps: 10,
  frictionStatic: 1.2,
  frictionKinetic: 0.9,
  grabStiffness: 0.12,
};
export const MAX_BEADS = 16;
export const MAX_GRAB = 64;
