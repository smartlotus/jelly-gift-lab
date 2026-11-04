// v03f · the branching night. A small graph of junctions (nodes) joined by walkable paths (edges = Catmull-Rom curves
// through control points, sampled every 0.25 m). Three routes leave the fork and meet again at the gate clearing:
//
//                              BUS (ending: the last bus)      TREE (hidden best ending)      END (ending: caught)
//                                  \__________________________ G2 ____________________________/
//                                                              | gate lock (our day 1)
//      W2 hollow tree ── creek ──────────────────────────────> G <─────────── tunnel (candle + padlock) ── E3
//       |                                                      ^                                          |
//      W1 carved tree (+ a loop that brings you back)          | garden                                   E2 crypt (candles)
//       |                                                      H3 back door                               |
//       |                                            H2 music room (music box) / H1 hall / H0 porch       E1 graveyard gate
//        \______________________ F (fork: forest / old house / graveyard) ______________________________/
//                                                              |
//                                                              S (start: "don't look back", mushrooms)
//
// World: x east, z south; walking "up" the map is -z. Ground level y = 0.
export type Theme = 'forest' | 'house' | 'grave' | 'tunnel' | 'clear' | 'road' | 'pink' | 'end';
export type NodeId = 'S' | 'F' | 'W1' | 'W2' | 'H0' | 'H1' | 'H2' | 'H3' | 'E1' | 'E2' | 'E3' | 'G' | 'G2' | 'BUS' | 'END' | 'TREE';
export interface MapNode { id: NodeId; x: number; z: number; stop?: boolean; }
export interface Edge { id: string; a: NodeId; b: NodeId; pts: [number, number][]; theme: Theme; xs: Float32Array; zs: Float32Array; len: number; }

export const NODES: Record<NodeId, MapNode> = {
  S: { id: 'S', x: 0, z: 6 },
  F: { id: 'F', x: 0, z: -40, stop: true },
  W1: { id: 'W1', x: -26, z: -56, stop: true },
  W2: { id: 'W2', x: -40, z: -92, stop: true },
  H0: { id: 'H0', x: 0, z: -57 },
  H1: { id: 'H1', x: 0, z: -71 },
  H2: { id: 'H2', x: -3, z: -82, stop: true },
  H3: { id: 'H3', x: 0, z: -100 },
  E1: { id: 'E1', x: 26, z: -54 },
  E2: { id: 'E2', x: 40, z: -84, stop: true },
  E3: { id: 'E3', x: 26, z: -112 },
  G: { id: 'G', x: 0, z: -146, stop: true },
  G2: { id: 'G2', x: 0, z: -160, stop: true },
  BUS: { id: 'BUS', x: -28, z: -172, stop: true },
  END: { id: 'END', x: 10, z: -204, stop: true },
  TREE: { id: 'TREE', x: -4, z: -186, stop: true },
};

const RAW: [string, NodeId, NodeId, Theme, [number, number][]][] = [
  ['s', 'S', 'F', 'forest', [[0, 6], [1.6, -8], [-1.6, -22], [0.6, -32], [0, -40]]],
  ['fw', 'F', 'W1', 'forest', [[0, -40], [-8, -45], [-18, -50], [-26, -56]]],
  ['loop', 'W1', 'W1', 'forest', [[-26, -56], [-33, -59], [-40, -66], [-41, -75], [-34, -80], [-26, -77], [-22, -68], [-23, -61], [-26, -56]]],
  ['w12', 'W1', 'W2', 'forest', [[-26, -56], [-27, -66], [-31, -76], [-37, -84], [-40, -92]]],
  ['w2g', 'W2', 'G', 'forest', [[-40, -92], [-38, -104], [-30, -116], [-18, -128], [-8, -138], [0, -146]]],
  ['fh', 'F', 'H0', 'forest', [[0, -40], [0.6, -48], [0, -57]]],
  ['h01', 'H0', 'H1', 'house', [[0, -57], [0, -64], [0, -71]]],
  ['h12', 'H1', 'H2', 'house', [[0, -71], [-1, -77], [-3, -82]]],
  ['h23', 'H2', 'H3', 'house', [[-3, -82], [-2, -87], [0, -93], [0, -100]]],
  ['h3g', 'H3', 'G', 'forest', [[0, -100], [2, -112], [-1, -124], [1, -136], [0, -146]]],
  ['fe', 'F', 'E1', 'grave', [[0, -40], [8, -45], [18, -50], [26, -54]]],
  ['e12', 'E1', 'E2', 'grave', [[26, -54], [30, -64], [36, -74], [40, -84]]],
  ['e23', 'E2', 'E3', 'grave', [[40, -84], [39, -96], [33, -106], [26, -112]]],
  ['tun', 'E3', 'G', 'tunnel', [[26, -112], [19, -121], [11, -131], [4, -140], [0, -146]]],
  ['gg', 'G', 'G2', 'clear', [[0, -146], [0, -153], [0, -160]]],
  ['bus', 'G2', 'BUS', 'road', [[0, -160], [-8, -165], [-18, -169], [-28, -172]]],
  ['end', 'G2', 'END', 'end', [[0, -160], [7, -168], [12, -180], [12, -192], [10, -204]]],
  ['tree', 'G2', 'TREE', 'pink', [[0, -160], [-1, -168], [-3, -177], [-4, -186]]],
];

function sample(pts: [number, number][]) {
  // Catmull-Rom through the control points (ends duplicated), fine steps, then resampled at equal arc length 0.25
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const raw: [number, number][] = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let k = 0; k < 40; k++) {
      const t = k / 40, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      raw.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  raw.push(pts[pts.length - 1]);
  const cum = [0]; for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const len = cum[cum.length - 1], n = Math.max(2, Math.ceil(len / 0.25) + 1);
  const xs = new Float32Array(n), zs = new Float32Array(n); let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (i / (n - 1)) * len; while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const k = (s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
    xs[i] = raw[j][0] + (raw[j + 1][0] - raw[j][0]) * k; zs[i] = raw[j][1] + (raw[j + 1][1] - raw[j][1]) * k;
  }
  return { xs, zs, len };
}

export const EDGES: Edge[] = RAW.map(([id, a, b, theme, pts]) => ({ id, a, b, theme, pts, ...sample(pts) }));
export const EDGE: Record<string, Edge> = Object.fromEntries(EDGES.map(e => [e.id, e]));

/** position on edge e at arc length s */
export function at(e: Edge, s: number): [number, number] {
  const f = Math.max(0, Math.min(e.len, s)) / e.len * (e.xs.length - 1), i = Math.min(e.xs.length - 2, Math.floor(f)), k = f - i;
  return [e.xs[i] + (e.xs[i + 1] - e.xs[i]) * k, e.zs[i] + (e.zs[i + 1] - e.zs[i]) * k];
}
/** camera yaw (three.js: yaw 0 looks toward -z) facing along e at s, walking in direction dir (+1 = a -> b) */
export function yawAt(e: Edge, s: number, dir: 1 | -1): number {
  const h = 0.6; const [x0, z0] = at(e, s - h * dir), [x1, z1] = at(e, s + h * dir);
  return Math.atan2(-(x1 - x0), -(z1 - z0));
}
/** edges touching node n, each with the direction you'd walk to leave n along it (an edge that loops gives two) */
export function exits(n: NodeId): { e: Edge; dir: 1 | -1; s: number }[] {
  const out: { e: Edge; dir: 1 | -1; s: number }[] = [];
  for (const e of EDGES) { if (e.a === n) out.push({ e, dir: 1, s: 0 }); if (e.b === n) out.push({ e, dir: -1, s: e.len }); }
  return out;
}
/** point a little way along an exit (to judge its direction from the node) */
export function exitYaw(x: { e: Edge; dir: 1 | -1; s: number }) { return yawAt(x.e, x.s + x.dir * 2.5, x.dir); }

// world bounds (voxels)
export const X0 = -52, X1 = 52, Z0 = -214, Z1 = 12;
