// Hand-built dollhouse meshes. Warm wood and soft upholstery, nearest-filtered
// pixel textures, real sides and tops — not flat stickers or bare cubes.
import {
  BoxGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, Group,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, NearestFilter, PlaneGeometry,
  RepeatWrapping, SRGBColorSpace, SphereGeometry, TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ROOM } from './catalog';

function canvasTex(draw: (g: CanvasRenderingContext2D, n: number) => void, n = 32, repeatX = 1, repeatY = 1): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = n; c.height = n;
  const g = c.getContext('2d')!;
  draw(g, n);
  const t = new CanvasTexture(c);
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function woodMap() {
  // fine, low-contrast grain: soft vertical tone drift plus a few hairline pores.
  // (The first pass used a 3-band sine at high contrast, which read as a barcode on tall pieces.)
  return canvasTex((g, n) => {
    for (let x = 0; x < n; x++) {
      const u = x / n;
      const tone = 172 + Math.sin(u * 9.4) * 5 + Math.sin(u * 31.7) * 2.5;
      g.fillStyle = `rgb(${tone | 0},${(tone * 0.79) | 0},${(tone * 0.55) | 0})`;
      g.fillRect(x, 0, 1, n);
    }
    for (let i = 0; i < 26; i++) {
      const x = (i * 11) % n, y = (i * 7) % n, h = 2 + (i % 5);
      g.fillStyle = i % 3 ? 'rgba(120,80,44,0.10)' : 'rgba(255,232,196,0.10)';
      g.fillRect(x, y, 1, h);
    }
    g.fillStyle = 'rgba(104,68,36,0.10)';
    for (let y = 0; y < n; y += 11) g.fillRect(0, y, n, 1);
  }, 32, 2, 2);
}

/** oak floorboards: 4 boards per tile, staggered butt joints, per-board tone, soft grain */
function plankMap() {
  return canvasTex((g, n) => {
    const rows = 4, bh = n / rows;
    let seed = 11;
    const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let row = 0; row < rows; row++) {
      const joint = Math.floor(r() * n);
      for (const [x0, x1] of [[0, joint], [joint, n]] as const) {
        const tone = 160 + r() * 26;
        g.fillStyle = `rgb(${tone | 0},${(tone * 0.76) | 0},${(tone * 0.52) | 0})`;
        g.fillRect(x0, row * bh, x1 - x0, bh);
        for (let k = 0; k < 6; k++) {
          g.fillStyle = r() < 0.5 ? 'rgba(110,72,40,0.12)' : 'rgba(255,230,190,0.08)';
          g.fillRect(x0 + Math.floor(r() * (x1 - x0)), row * bh + 1 + Math.floor(r() * (bh - 2)), 3 + Math.floor(r() * 9), 1);
        }
      }
      g.fillStyle = 'rgba(70,44,24,0.45)';
      g.fillRect(0, row * bh, n, 1);
      g.fillRect(joint, row * bh, 1, bh);
    }
  }, 64, ROOM.w / 2.4, ROOM.d / 1.2);
}

function plasterMap() {
  return canvasTex((g, n) => {
    g.fillStyle = '#E6D4B8';
    g.fillRect(0, 0, n, n);
    for (let i = 0; i < 80; i++) {
      const x = (i * 17) % n, y = (i * 29) % n;
      g.fillStyle = i % 3 ? 'rgba(180,150,120,0.10)' : 'rgba(255,244,228,0.12)';
      g.fillRect(x, y, 2, 1);
    }
  }, 32, 6, 3);
}

function fabricMap(hex: string) {
  return canvasTex((g, n) => {
    g.fillStyle = hex;
    g.fillRect(0, 0, n, n);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let y = 0; y < n; y += 4) g.fillRect(0, y, n, 1);
    g.fillStyle = 'rgba(40,24,16,0.07)';
    for (let x = 0; x < n; x += 4) g.fillRect(x, 0, 1, n);
  }, 16, 2, 2);
}

const wood = () => new MeshStandardMaterial({ map: woodMap(), roughness: 0.72, metalness: 0.04 });
const plaster = () => new MeshStandardMaterial({ map: plasterMap(), roughness: 0.88, metalness: 0.0, side: DoubleSide });
const painted = (color: string | number, roughness = 0.68) => new MeshStandardMaterial({
  color: new Color(color), roughness, metalness: 0.03,
});
const cloth = (hex: string) => new MeshStandardMaterial({
  color: hex, map: fabricMap(hex), roughness: 0.86, metalness: 0.0,
});

function box(parent: Group, w: number, h: number, d: number, mat: MeshStandardMaterial, x: number, y: number, z: number, round = 0) {
  const geo = round > 0
    ? new RoundedBoxGeometry(w, h, d, 2, round)
    : new BoxGeometry(w, h, d);
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function cyl(parent: Group, rTop: number, rBot: number, h: number, mat: MeshStandardMaterial, x: number, y: number, z: number, segs = 10, open = false) {
  const m = new Mesh(new CylinderGeometry(rTop, rBot, h, segs, 1, open), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function contactShadow(hw: number, hd: number): Mesh {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 30);
  grd.addColorStop(0, 'rgba(42,28,18,0.34)');
  grd.addColorStop(0.55, 'rgba(42,28,18,0.14)');
  grd.addColorStop(1, 'rgba(42,28,18,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  const mat = new MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
  const mesh = new Mesh(new PlaneGeometry(hw * 2.2, hd * 2.2), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.01;
  mesh.renderOrder = 1;
  return mesh;
}

export function buildRoom(): { group: Group; floor: Mesh } {
  const group = new Group();
  const hw = ROOM.w / 2, hd = ROOM.d / 2, hh = ROOM.wall;

  const floorMat = new MeshStandardMaterial({ map: plankMap(), roughness: 0.62, metalness: 0.02 });
  const floor = new Mesh(new PlaneGeometry(ROOM.w, ROOM.d), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.floor = true;
  group.add(floor);

  // larger invisible plane so edge taps still hit the floor
  const pick = new Mesh(new PlaneGeometry(ROOM.w + 1.4, ROOM.d + 1.2), new MeshBasicMaterial({ visible: false }));
  pick.rotation.x = -Math.PI / 2;
  pick.userData.floor = true;
  group.add(pick);

  const wall = plaster();
  // back wall
  box(group, ROOM.w, hh, 0.12, wall, 0, hh / 2, -hd);
  // side walls: cutaway toward the camera so they frame the dollhouse without blocking placement
  const sideD = ROOM.d * 0.72;
  const sideZ = -hd + sideD / 2;
  box(group, 0.12, hh, sideD, wall, -hw, hh / 2, sideZ);
  box(group, 0.12, hh, sideD, wall, hw, hh / 2, sideZ);

  const trim = wood();
  box(group, ROOM.w, 0.08, 0.1, trim, 0, 0.04, -hd + 0.08);
  box(group, 0.1, 0.08, sideD, trim, -hw + 0.08, 0.04, sideZ);
  box(group, 0.1, 0.08, sideD, trim, hw - 0.08, 0.04, sideZ);

  // window + warm evening sky
  const wx = 1.15, wy = 1.55, ww = 1.7, wh = 1.15;
  box(group, ww + 0.16, wh + 0.16, 0.08, trim, wx, wy, -hd + 0.08);
  const sky = new Mesh(
    new PlaneGeometry(ww, wh),
    new MeshStandardMaterial({ color: '#E8A890', emissive: '#F2AE9F', emissiveIntensity: 0.35, roughness: 1 }),
  );
  sky.position.set(wx, wy, -hd + 0.14);
  group.add(sky);
  // muntins
  box(group, 0.05, wh, 0.04, trim, wx, wy, -hd + 0.16);
  box(group, ww, 0.05, 0.04, trim, wx, wy, -hd + 0.16);
  box(group, ww + 0.28, 0.08, 0.16, trim, wx, wy - wh / 2 - 0.06, -hd + 0.14);

  // ceiling beam (open roof — dollhouse)
  box(group, ROOM.w * 0.92, 0.08, 0.1, trim, 0, hh - 0.08, -0.4);

  return { group, floor };
}

// ---- small modelling helpers -------------------------------------------------------------------

/** tapered turned leg: a slim cylinder with a collar, so legs read as made, not as sticks */
function leg(parent: Group, mat: MeshStandardMaterial, x: number, z: number, h: number, r = 0.032) {
  cyl(parent, r * 0.72, r * 0.5, h * 0.82, mat, x, h * 0.41, z, 8);
  cyl(parent, r * 1.05, r * 1.05, h * 0.12, mat, x, h * 0.88, z, 8);
  cyl(parent, r * 0.8, r * 0.8, h * 0.08, mat, x, h * 0.97, z, 8);
}

/** soft cushion: a rounded box with a lighter top face so stacked cushions separate */
function cushionBlock(parent: Group, w: number, h: number, d: number, mat: MeshStandardMaterial, x: number, y: number, z: number) {
  return box(parent, w, h, d, mat, x, y, z, Math.min(h, w, d) * 0.42);
}

/** a horizontal roll (sofa arm top, bolster) */
function roll(parent: Group, r: number, len: number, mat: MeshStandardMaterial, x: number, y: number, z: number, alongX = false) {
  const m = cyl(parent, r, r, len, mat, x, y, z, 14);
  if (alongX) m.rotation.z = Math.PI / 2; else m.rotation.x = Math.PI / 2;
  return m;
}

function sofa(): Group {
  const g = new Group();
  const shell = cloth('#E2CCAE');
  const seat = cloth('#F0E2CA');
  const back = cloth('#EAD8BC');
  const rose = cloth('#E59C9C');
  const w = wood();
  // tapered legs under a plinth rail
  for (const [x, z] of [[-1.0, -0.32], [1.0, -0.32], [-1.0, 0.32], [1.0, 0.32]] as const) cyl(g, 0.035, 0.024, 0.14, w, x, 0.07, z, 8);
  box(g, 2.18, 0.08, 0.84, w, 0, 0.16, 0, 0.02);
  // base frame and back frame
  box(g, 2.08, 0.16, 0.84, shell, 0, 0.27, 0.0, 0.05);
  box(g, 2.2, 0.44, 0.18, shell, 0, 0.5, -0.34, 0.07);
  // arms: panel + rolled top
  for (const sx of [-1, 1]) {
    box(g, 0.16, 0.34, 0.84, shell, sx * 1.04, 0.37, 0, 0.05);
    roll(g, 0.1, 0.86, shell, sx * 1.04, 0.56, 0);
  }
  // two seat cushions with a seam between, two back cushions leaning back
  for (const sx of [-0.46, 0.46]) {
    cushionBlock(g, 0.9, 0.14, 0.62, seat, sx, 0.42, 0.08);
    const bc = cushionBlock(g, 0.88, 0.42, 0.16, back, sx, 0.66, -0.2);
    bc.rotation.x = -0.16;
  }
  // a rose throw pillow tucked in the corner, turned a little
  const tp = cushionBlock(g, 0.34, 0.3, 0.1, rose, -0.74, 0.62, -0.05);
  tp.rotation.set(-0.3, 0.35, 0.12);
  g.add(contactShadow(1.18, 0.5));
  return g;
}

function armchair(): Group {
  const g = new Group();
  const shell = cloth('#E2CCAE');
  const seat = cloth('#F0E2CA');
  const w = wood();
  for (const [x, z] of [[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.3], [0.32, 0.3]] as const) cyl(g, 0.03, 0.02, 0.14, w, x, 0.07, z, 8);
  box(g, 0.82, 0.18, 0.78, shell, 0, 0.23, 0, 0.05);
  const bk = box(g, 0.84, 0.56, 0.16, shell, 0, 0.56, -0.32, 0.07); bk.rotation.x = -0.1;
  for (const sx of [-1, 1]) { box(g, 0.13, 0.28, 0.76, shell, sx * 0.4, 0.38, 0.01, 0.05); roll(g, 0.08, 0.78, shell, sx * 0.4, 0.53, 0.01); }
  cushionBlock(g, 0.64, 0.13, 0.6, seat, 0, 0.38, 0.06);
  g.add(contactShadow(0.5, 0.48));
  return g;
}

function coffee(): Group {
  const g = new Group();
  const w = wood();
  const top = new Mesh(new CylinderGeometry(0.5, 0.5, 0.06, 28), w);
  top.scale.set(1.3, 1, 0.75); top.position.y = 0.4; top.castShadow = true; top.receiveShadow = true; g.add(top);
  const rim = new Mesh(new CylinderGeometry(0.505, 0.49, 0.02, 28), painted('#9A7048'));
  rim.scale.set(1.3, 1, 0.75); rim.position.y = 0.365; g.add(rim);
  const shelfM = new Mesh(new CylinderGeometry(0.42, 0.42, 0.03, 24), w);
  shelfM.scale.set(1.3, 1, 0.75); shelfM.position.y = 0.12; shelfM.receiveShadow = true; g.add(shelfM);
  for (const [x, z] of [[-0.46, -0.22], [0.46, -0.22], [-0.46, 0.22], [0.46, 0.22]] as const) leg(g, w, x, z, 0.37, 0.028);
  // a stack of books and a mug on top, a basket on the shelf
  box(g, 0.3, 0.05, 0.22, painted('#6A7A8A'), -0.24, 0.455, 0.02, 0.01);
  box(g, 0.26, 0.04, 0.2, painted('#C96A6A'), -0.23, 0.5, 0.0, 0.01);
  cyl(g, 0.045, 0.04, 0.09, painted('#F4ECE0'), 0.26, 0.475, 0.05, 12);
  box(g, 0.36, 0.1, 0.24, painted('#C4A06A', 0.9), 0.12, 0.185, 0, 0.03);
  g.add(contactShadow(0.72, 0.44));
  return g;
}

function dining(): Group {
  const g = new Group();
  const w = wood();
  const runner = cloth('#E8A0A0');
  // a family table: 1.5 x 0.95 top with a softened edge, an apron, turned legs and a linen runner
  box(g, 1.5, 0.06, 0.95, w, 0, 0.75, 0, 0.025);
  box(g, 1.34, 0.1, 0.8, painted('#8A6440'), 0, 0.67, 0, 0.012);
  for (const [x, z] of [[-0.66, -0.38], [0.66, -0.38], [-0.66, 0.38], [0.66, 0.38]] as const) leg(g, w, x, z, 0.72, 0.04);
  box(g, 0.34, 0.006, 0.97, runner, 0, 0.783, 0);
  // a small bud vase so the table is set, not a slab
  cyl(g, 0.035, 0.045, 0.12, painted('#E8F0DC'), 0.0, 0.84, 0.0, 10);
  const b = new Mesh(new SphereGeometry(0.045, 10, 8), painted('#E890A8')); b.position.set(0, 0.93, 0); b.castShadow = true; g.add(b);
  g.add(contactShadow(0.82, 0.56));
  return g;
}

function chair(): Group {
  const g = new Group();
  const w = wood();
  const pad = cloth('#E8C8A0');
  for (const [x, z] of [[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]] as const) cyl(g, 0.024, 0.018, 0.42, w, x, 0.21, z, 8);
  box(g, 0.44, 0.04, 0.44, w, 0, 0.43, 0, 0.012);
  cushionBlock(g, 0.38, 0.05, 0.38, pad, 0, 0.475, 0.01);
  // spindle back: two posts, a curved top rail, four spindles
  for (const sx of [-0.19, 0.19]) cyl(g, 0.022, 0.022, 0.5, w, sx, 0.69, -0.2, 8);
  const rail = box(g, 0.44, 0.07, 0.04, w, 0, 0.92, -0.2, 0.015); rail.rotation.x = -0.05;
  for (let i = 0; i < 4; i++) cyl(g, 0.009, 0.009, 0.42, w, -0.11 + i * 0.073, 0.68, -0.2, 6);
  g.add(contactShadow(0.28, 0.3));
  return g;
}

function nightstand(): Group {
  const g = new Group();
  const w = wood();
  const brass = painted('#D8B878', 0.42);
  for (const [x, z] of [[-0.19, -0.17], [0.19, -0.17], [-0.19, 0.17], [0.19, 0.17]] as const) cyl(g, 0.022, 0.016, 0.12, w, x, 0.06, z, 6);
  box(g, 0.46, 0.38, 0.42, w, 0, 0.31, 0, 0.015);
  box(g, 0.5, 0.035, 0.46, painted('#9A7048'), 0, 0.515, 0, 0.012);
  box(g, 0.4, 0.13, 0.012, painted('#C9A87C'), 0, 0.38, 0.214, 0.006);
  box(g, 0.4, 0.13, 0.012, painted('#C9A87C'), 0, 0.22, 0.214, 0.006);
  for (const y of [0.38, 0.22]) { const k = cyl(g, 0.016, 0.016, 0.03, brass, 0, y, 0.228, 8); k.rotation.x = Math.PI / 2; }
  // small reading lamp
  cyl(g, 0.05, 0.06, 0.03, brass, 0.08, 0.55, -0.05, 10);
  cyl(g, 0.01, 0.01, 0.18, brass, 0.08, 0.64, -0.05, 6);
  const sh = cyl(g, 0.06, 0.09, 0.1, new MeshStandardMaterial({ color: '#F4E0B8', emissive: '#E8C070', emissiveIntensity: 0.4, roughness: 0.6 }), 0.08, 0.76, -0.05, 12);
  sh.castShadow = false;
  g.add(contactShadow(0.28, 0.28));
  return g;
}

function sideTable(): Group {
  const g = new Group();
  const w = wood();
  cyl(g, 0.24, 0.24, 0.04, w, 0, 0.5, 0, 24);
  cyl(g, 0.03, 0.05, 0.46, w, 0, 0.25, 0, 10);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const f = box(g, 0.2, 0.03, 0.04, w, Math.cos(a) * 0.09, 0.03, Math.sin(a) * 0.09, 0.01);
    f.rotation.y = -a;
  }
  // a plant on top
  cyl(g, 0.07, 0.055, 0.1, painted('#C46A4A'), 0, 0.57, 0, 12);
  for (let i = 0; i < 5; i++) {
    const lf = new Mesh(new SphereGeometry(0.05, 8, 6), painted('#5E8444'));
    lf.scale.set(0.6, 1.4, 0.6);
    lf.position.set(Math.cos(i * 1.3) * 0.04, 0.67 + (i % 2) * 0.03, Math.sin(i * 1.3) * 0.04);
    lf.rotation.z = Math.cos(i * 1.3) * 0.5; lf.castShadow = true; g.add(lf);
  }
  g.add(contactShadow(0.28, 0.28));
  return g;
}

function bed(): Group {
  const g = new Group();
  const w = wood();
  const sheet = cloth('#F4EDE0');
  const quilt = cloth('#E8B0B8');
  const pillow = cloth('#F7EFE4');
  for (const [x, z] of [[-0.92, -0.68], [0.92, -0.68], [-0.92, 0.68], [0.92, 0.68]] as const) cyl(g, 0.035, 0.03, 0.16, w, x, 0.08, z, 6);
  box(g, 2.1, 0.10, 1.6, w, 0, 0.21, 0, 0.02);
  box(g, 2.0, 0.20, 1.5, sheet, 0, 0.34, 0, 0.06);
  // quilt drapes over both long sides and the foot, with a turned-down band
  box(g, 1.36, 0.12, 1.56, quilt, 0.30, 0.48, 0, 0.05);
  box(g, 1.36, 0.22, 0.04, quilt, 0.30, 0.37, 0.79, 0.02);
  box(g, 1.36, 0.22, 0.04, quilt, 0.30, 0.37, -0.79, 0.02);
  box(g, 0.04, 0.2, 1.56, quilt, 0.99, 0.38, 0, 0.02);
  box(g, 0.16, 0.09, 1.54, painted('#F2C8CE'), -0.33, 0.53, 0, 0.04);
  // pillows leaning on the headboard
  for (const z of [-0.36, 0.36]) {
    const pl = cushionBlock(g, 0.34, 0.16, 0.6, pillow, -0.76, 0.5, z);
    pl.rotation.z = 0.35;
  }
  // headboard with a rounded top rail and slats, low footboard
  box(g, 0.08, 0.7, 1.66, w, -1.03, 0.52, 0, 0.03);
  roll(g, 0.05, 1.72, w, -1.03, 0.9, 0);
  for (let i = 0; i < 6; i++) box(g, 0.02, 0.42, 0.06, painted('#9A7048'), -0.985, 0.6, -0.6 + i * 0.24, 0.01);
  box(g, 0.07, 0.3, 1.62, w, 1.03, 0.3, 0, 0.02);
  roll(g, 0.04, 1.66, w, 1.03, 0.46, 0);
  g.add(contactShadow(1.12, 0.88));
  return g;
}

function shelf(): Group {
  const g = new Group();
  const w = wood();
  // open bookcase: two sides, a back, a top and a plinth, four shelves of mixed books
  box(g, 0.05, 1.6, 0.36, w, -0.53, 0.8, 0, 0.01);
  box(g, 0.05, 1.6, 0.36, w, 0.53, 0.8, 0, 0.01);
  box(g, 1.12, 0.05, 0.38, w, 0, 1.6, 0, 0.012);
  box(g, 1.06, 0.1, 0.34, painted('#8A6440'), 0, 0.05, 0, 0.01);
  box(g, 1.02, 1.5, 0.02, painted('#EADBC2'), 0, 0.8, -0.17);
  const cols = ['#C96A6A', '#6A7A8A', '#E8C878', '#7AA05A', '#8A6AA0', '#E890A8', '#C4A06A', '#5E8444', '#F4ECE0'];
  let seed = 3;
  const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let row = 0; row < 4; row++) {
    const y = 0.1 + row * 0.38;
    box(g, 1.02, 0.03, 0.32, w, 0, y + 0.015, 0);
    let x = -0.47;
    while (x < 0.42) {
      const bw = 0.04 + r() * 0.05, bh = 0.2 + r() * 0.1;
      if (row === 1 && x > 0.1 && x < 0.3) { // a small plant gap
        cyl(g, 0.06, 0.05, 0.1, painted('#C46A4A'), x + 0.08, y + 0.08, 0, 10);
        const lf = new Mesh(new SphereGeometry(0.08, 8, 6), painted('#5E8444')); lf.position.set(x + 0.08, y + 0.2, 0); lf.castShadow = true; g.add(lf);
        x += 0.2; continue;
      }
      const bk = box(g, bw, bh, 0.22, painted(cols[Math.floor(r() * cols.length)]!), x + bw / 2, y + 0.03 + bh / 2, 0.02, 0.006);
      if (r() < 0.12) { bk.rotation.z = 0.22; x += 0.05; }
      x += bw + 0.006;
    }
  }
  g.add(contactShadow(0.58, 0.24));
  return g;
}

function tv(): Group {
  const g = new Group();
  const w = wood();
  const shell = painted('#20262E', 0.5);
  const brass = painted('#C8A868', 0.4);
  box(g, 1.58, 0.32, 0.44, w, 0, 0.30, 0, 0.02);
  box(g, 1.64, 0.045, 0.48, w, 0, 0.485, 0, 0.012);
  for (const sx of [-0.4, 0.4]) {
    box(g, 0.74, 0.24, 0.012, painted('#C9A87C'), sx, 0.3, 0.222, 0.006);
    box(g, 0.12, 0.016, 0.02, brass, sx, 0.36, 0.232);
  }
  for (const [x, z] of [[-0.66, -0.15], [0.66, -0.15], [-0.66, 0.15], [0.66, 0.15]] as const) cyl(g, 0.024, 0.018, 0.14, w, x, 0.07, z, 6);
  box(g, 1.26, 0.74, 0.06, shell, 0, 0.90, -0.12, 0.012);
  const screen = new Mesh(
    new BoxGeometry(1.14, 0.62, 0.012),
    new MeshStandardMaterial({ color: '#2E4258', emissive: '#4A6E9A', emissiveIntensity: 0.75, roughness: 0.28, metalness: 0.05 }),
  );
  screen.position.set(0, 0.905, -0.086);
  g.add(screen);
  box(g, 0.34, 0.025, 0.18, shell, 0, 0.52, -0.1, 0.01);
  box(g, 0.06, 0.1, 0.05, shell, 0, 0.56, -0.12);
  box(g, 1.18, 0.66, 0.02, painted('#39424C', 0.62), 0, 0.90, -0.158, 0.01);
  // a little plant and speaker on the console so it reads as a living-room unit
  cyl(g, 0.05, 0.04, 0.08, painted('#E8F0DC'), 0.66, 0.55, 0.08, 10);
  const lf = new Mesh(new SphereGeometry(0.07, 8, 6), painted('#5E8444')); lf.position.set(0.66, 0.64, 0.08); lf.castShadow = true; g.add(lf);
  box(g, 0.12, 0.18, 0.12, painted('#3A3430'), -0.68, 0.6, 0.06, 0.02);
  g.add(contactShadow(0.9, 0.32));
  return g;
}

function lamp(): Group {
  const g = new Group();
  const w = wood();
  const brass = painted('#C8A868', 0.4);
  const shade = new MeshStandardMaterial({ color: '#F4E0B8', emissive: '#E8C070', emissiveIntensity: 0.55, roughness: 0.55, side: DoubleSide });
  // tripod floor lamp
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    const l = cyl(g, 0.016, 0.02, 0.9, w, Math.cos(a) * 0.1, 0.43, Math.sin(a) * 0.1, 6);
    l.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22);
  }
  cyl(g, 0.045, 0.045, 0.05, brass, 0, 0.88, 0, 10);
  cyl(g, 0.016, 0.016, 0.52, brass, 0, 1.14, 0, 6);
  const s = cyl(g, 0.17, 0.26, 0.3, shade, 0, 1.47, 0, 18, true);
  s.castShadow = false;
  g.add(contactShadow(0.22, 0.22));
  return g;
}

function wardrobe(): Group {
  const g = new Group();
  const w = wood();
  const pel = wood();
  const brass = painted('#D8B878', 0.42);
  box(g, 1.14, 1.62, 0.54, w, 0, 0.92, 0, 0.015);
  box(g, 1.26, 0.07, 0.60, pel, 0, 1.755, 0, 0.02);
  box(g, 1.2, 0.04, 0.58, painted('#B08A5E'), 0, 1.71, 0, 0.01);
  box(g, 1.18, 0.06, 0.56, painted('#8A6440'), 0, 0.09, 0);
  for (const [x, z] of [[-0.5, -0.2], [0.5, -0.2], [-0.5, 0.2], [0.5, 0.2]] as const) cyl(g, 0.032, 0.026, 0.09, pel, x, 0.045, z, 6);
  for (const sx of [-0.288, 0.288]) {
    box(g, 0.545, 1.34, 0.025, pel, sx, 0.94, 0.272, 0.01);
    box(g, 0.40, 0.5, 0.012, painted('#C9A87C'), sx, 1.22, 0.292, 0.008);
    box(g, 0.40, 0.5, 0.012, painted('#C9A87C'), sx, 0.66, 0.292, 0.008);
    const k = cyl(g, 0.02, 0.02, 0.055, brass, sx + (sx < 0 ? 0.2 : -0.2), 0.94, 0.305, 8);
    k.rotation.x = Math.PI / 2;
  }
  box(g, 0.012, 1.36, 0.02, painted('#6E4E30'), 0, 0.94, 0.286);
  // hat box and a folded blanket on top
  cyl(g, 0.16, 0.16, 0.14, painted('#E8B0B8'), -0.28, 1.86, 0, 18);
  box(g, 0.36, 0.1, 0.3, cloth('#E8D4B8'), 0.26, 1.84, 0, 0.04);
  g.add(contactShadow(0.64, 0.32));
  return g;
}

function cattree(): Group {
  const g = new Group();
  const sisal = new MeshStandardMaterial({ color: '#D8B878', roughness: 0.95, map: fabricMap('#D8B878') });
  const plat = cloth('#E8C878');
  const den = cloth('#C9A87C');
  box(g, 0.66, 0.06, 0.6, plat, 0, 0.04, 0, 0.025);
  cyl(g, 0.065, 0.065, 1.2, sisal, -0.16, 0.64, -0.1, 10);
  cyl(g, 0.055, 0.055, 0.6, sisal, 0.2, 0.34, 0.12, 10);
  // a den with a round opening, a mid perch and a top bed
  box(g, 0.38, 0.32, 0.36, den, 0.14, 0.24, -0.08, 0.06);
  const hole = new Mesh(new CylinderGeometry(0.1, 0.1, 0.01, 18), painted('#3A2E28'));
  hole.rotation.x = Math.PI / 2; hole.position.set(0.14, 0.24, 0.105); g.add(hole);
  box(g, 0.42, 0.05, 0.38, plat, 0.12, 0.66, 0.06, 0.02);
  const bedTop = new Mesh(new TorusGeometry(0.15, 0.05, 8, 18), plat);
  bedTop.rotation.x = Math.PI / 2; bedTop.position.set(-0.16, 1.27, -0.1); bedTop.castShadow = true; g.add(bedTop);
  cyl(g, 0.15, 0.15, 0.04, plat, -0.16, 1.25, -0.1, 18);
  // dangling toy
  cyl(g, 0.004, 0.004, 0.22, painted('#6E4E30'), 0.3, 0.55, 0.06, 4);
  const ball = new Mesh(new SphereGeometry(0.035, 8, 6), painted('#E890A8')); ball.position.set(0.3, 0.43, 0.06); g.add(ball);
  g.add(contactShadow(0.34, 0.34));
  return g;
}

function dogbed(): Group {
  const g = new Group();
  const rim = cloth('#93A4B4');
  const cushion = cloth('#E4E8EC');
  const ring = new Mesh(new TorusGeometry(0.3, 0.1, 10, 24), rim);
  ring.rotation.x = Math.PI / 2; ring.scale.set(1.15, 1, 1); ring.position.y = 0.1; ring.castShadow = true; g.add(ring);
  const pad = new Mesh(new CylinderGeometry(0.3, 0.32, 0.08, 24), cushion);
  pad.scale.set(1.15, 1, 1); pad.position.y = 0.06; pad.receiveShadow = true; g.add(pad);
  // a bone toy
  box(g, 0.14, 0.03, 0.03, painted('#F4ECE0'), 0.12, 0.12, 0.06, 0.012);
  g.add(contactShadow(0.44, 0.4));
  return g;
}

function vase(kind: 'roses' | 'lisi'): Group {
  const g = new Group();
  const pot = painted(kind === 'roses' ? '#E8F0DC' : '#DCE4F0');
  cyl(g, 0.07, 0.1, 0.24, pot, 0, 0.12, 0, 14);
  cyl(g, 0.08, 0.07, 0.03, pot, 0, 0.255, 0, 14);
  const stem = painted('#5E8444');
  const petalA = painted(kind === 'roses' ? '#F2A8BC' : '#9A78B8');
  const petalB = painted(kind === 'roses' ? '#E07C98' : '#6E4E92');
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const sx = Math.cos(a) * 0.05, sz = Math.sin(a) * 0.05, hh = 0.26 + (i % 3) * 0.05;
    const st = cyl(g, 0.008, 0.008, hh, stem, sx * 0.6, 0.26 + hh / 2, sz * 0.6, 5);
    st.rotation.set(sz * 2.2, 0, -sx * 2.2);
    // layered bloom: an outer cup and a darker heart (Diana rose / Yunnan lisianthus)
    const outer = new Mesh(new SphereGeometry(kind === 'roses' ? 0.06 : 0.05, 10, 8), petalA);
    outer.scale.set(1, kind === 'roses' ? 0.8 : 1.1, 1);
    outer.position.set(sx * 1.6, 0.27 + hh, sz * 1.6); outer.castShadow = true; g.add(outer);
    const heart = new Mesh(new SphereGeometry(0.03, 8, 6), petalB);
    heart.position.set(sx * 1.6, 0.3 + hh, sz * 1.6); g.add(heart);
  }
  g.add(contactShadow(0.14, 0.14));
  return g;
}

function rug(): Group {
  const g = new Group();
  const tex = canvasTex((c, n) => {
    c.fillStyle = '#B85A5A'; c.fillRect(0, 0, n, n);
    c.fillStyle = '#E8C8A0'; c.fillRect(3, 3, n - 6, n - 6);
    c.fillStyle = '#C96A6A'; c.fillRect(5, 5, n - 10, n - 10);
    c.fillStyle = '#E8A0A0';
    for (let i = 8; i < n - 8; i += 6) { c.fillRect(i, n / 2 - 1, 3, 2); c.fillRect(n / 2 - 1, i, 2, 3); }
    c.fillStyle = '#F2D8B0';
    c.fillRect(n / 2 - 4, n / 2 - 4, 8, 8);
    c.fillStyle = '#B85A5A'; c.fillRect(n / 2 - 2, n / 2 - 2, 4, 4);
  }, 48, 1, 1);
  const mat = new MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 });
  const mesh = new Mesh(new RoundedBoxGeometry(3.5, 0.025, 2.3, 2, 0.012), mat);
  mesh.position.y = 0.014;
  mesh.receiveShadow = true;
  g.add(mesh);
  // fringe on the short ends
  const fr = painted('#F2E4CC');
  for (const sx of [-1, 1]) for (let i = 0; i < 18; i++) box(g, 0.08, 0.008, 0.02, fr, sx * 1.79, 0.012, -1.05 + i * 0.124);
  return g;
}

function cushion(): Group {
  const g = new Group();
  // a round floor pouf with a tufted centre
  const p = new Mesh(new SphereGeometry(0.3, 18, 12), cloth('#E8A0A0'));
  p.scale.set(1, 0.5, 1); p.position.y = 0.15; p.castShadow = true; p.receiveShadow = true; g.add(p);
  const b = new Mesh(new SphereGeometry(0.03, 8, 6), painted('#C87878')); b.position.y = 0.3; g.add(b);
  g.add(contactShadow(0.32, 0.32));
  return g;
}

export function buildItem(kind: string): Group {
  switch (kind) {
    case 'rug': return rug();
    case 'sofa': return sofa();
    case 'armchair': return armchair();
    case 'coffee': return coffee();
    case 'table': return dining();
    case 'chair': return chair();
    case 'bed': return bed();
    case 'night': return nightstand();
    case 'side': return sideTable();
    case 'shelf': return shelf();
    case 'tv': return tv();
    case 'lamp': return lamp();
    case 'wardrobe': return wardrobe();
    case 'cattree': return cattree();
    case 'dogbed': return dogbed();
    case 'roses': return vase('roses');
    case 'lisi': return vase('lisi');
    case 'cushion': return cushion();
    default: return sideTable();
  }
}

export function footprintMarker(hw: number, hd: number): Group {
  const g = new Group();
  const plane = new Mesh(
    new PlaneGeometry(hw * 2 + 0.08, hd * 2 + 0.08),
    new MeshBasicMaterial({ color: 0xF4D070, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0.018;
  g.add(plane);
  return g;
}
