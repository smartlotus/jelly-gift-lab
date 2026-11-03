// Per-character look: colourways + rest-space pattern shader snippets (GLSL + WGSL twins).
// shellPattern(X, Nr, A) -> vec4(pigmentA (backCol), ink, pigmentB (finTipCol), groove)
// innerPattern(X, Nr)    -> vec4(albedo multiplier rgb, glossy-eye mask)
export interface Colourway {
  id: string;
  absorb: [number, number, number];   // Beer-Lambert sigma per unit length
  back: [number, number, number, number]; // dark back pigment rgb + strength
  finTip: [number, number, number, number];
  belly: [number, number, number, number];
  glow: [number, number, number, number];
  bead: [number, number, number, number];
  swatch: string;
  bgTop: [number, number, number]; bgBot: [number, number, number]; floor: [number, number, number];
  /** shell 'ink' (slit channel): Beer-Lambert sigma and surface darkening; default [13, 0.32] */
  ink?: [number, number];
  /** refractive index of the outer jelly; default 1.36 */
  ior?: number;
}
export interface Look {
  colourways: Colourway[];
  shellGLSL: string; innerGLSL: string; shellWGSL: string; innerWGSL: string;
}
