// Hand-built dollhouse meshes. Warm wood and soft upholstery, nearest-filtered
// pixel textures, real sides and tops — not flat stickers or bare cubes.
import {
  BoxGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, Group,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, NearestFilter, PlaneGeometry,
  RepeatWrapping, SRGBColorSpace, SphereGeometry,
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
  return canvasTex((g, n) => {
    for (let x = 0; x < n; x++) {
      const u = x / n;
      const tone = 168 + Math.sin(u * 18) * 14 + (x % 7 === 0 ? -18 : 0);
      g.fillStyle = `rgb(${tone | 0},${(tone * 0.78) | 0},${(tone * 0.52) | 0})`;
      g.fillRect(x, 0, 1, n);
    }
    g.fillStyle = 'rgba(90,56,28,0.16)';
    for (let y = 3; y < n; y += 8) g.fillRect(0, y, n, 1);
  }, 32, 4, 4);
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
  m.castShadow = false;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function cyl(parent: Group, rTop: number, rBot: number, h: number, mat: MeshStandardMaterial, x: number, y: number, z: number, segs = 10) {
  const m = new Mesh(new CylinderGeometry(rTop, rBot, h, segs), mat);
  m.position.set(x, y, z);
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

  const floorMat = new MeshStandardMaterial({ map: woodMap(), roughness: 0.7, metalness: 0.02 });
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

function sofa(): Group {
  const g = new Group();
  const cream = cloth('#E8D4B8');
  const arm = cloth('#DCC4A4');
  const seat = cloth('#F0E2CA');
  const rose = cloth('#E8A0A0');
  const w = wood();
  [[-1.0, 0.06, -0.34], [1.0, 0.06, -0.34], [-1.0, 0.06, 0.34], [1.0, 0.06, 0.34]].forEach(([x, y, z]) => box(g, 0.08, 0.12, 0.08, w, x, y, z));
  box(g, 2.2, 0.22, 0.86, cream, 0, 0.26, 0, 0.03);
  box(g, 0.96, 0.1, 0.52, rose, -0.48, 0.40, 0.06, 0.04);
  box(g, 0.96, 0.1, 0.52, rose, 0.48, 0.40, 0.06, 0.04);
  box(g, 2.24, 0.56, 0.16, cream, 0, 0.62, -0.38, 0.03);
  box(g, 0.16, 0.44, 0.86, arm, -1.08, 0.42, 0, 0.03);
  box(g, 0.16, 0.44, 0.86, arm, 1.08, 0.42, 0, 0.03);
  g.add(contactShadow(1.18, 0.5));
  return g;
}

function armchair(): Group {
  const g = new Group();
  const cream = cloth('#E8D4B8');
  const arm = cloth('#DCC4A4');
  const w = wood();
  [[-0.34, 0.06, -0.32], [0.34, 0.06, -0.32], [-0.34, 0.06, 0.32], [0.34, 0.06, 0.32]].forEach(([x, y, z]) => box(g, 0.07, 0.12, 0.07, w, x, y, z));
  box(g, 0.84, 0.2, 0.8, cream, 0, 0.26, 0, 0.03);
  box(g, 0.84, 0.5, 0.14, cream, 0, 0.58, -0.36, 0.03);
  box(g, 0.12, 0.4, 0.8, arm, -0.42, 0.4, 0, 0.025);
  box(g, 0.12, 0.4, 0.8, arm, 0.42, 0.4, 0, 0.025);
  g.add(contactShadow(0.5, 0.48));
  return g;
}

function tableLike(topW: number, topD: number, topH: number, legH: number): Group {
  const g = new Group();
  const w = wood();
  box(g, topW, 0.07, topD, w, 0, legH + 0.035, 0, 0.02);
  const ox = topW * 0.42, oz = topD * 0.42;
  [[-ox, oz], [ox, oz], [-ox, -oz], [ox, -oz]].forEach(([x, z]) => box(g, 0.06, legH, 0.06, w, x, legH / 2, z));
  g.add(contactShadow(topW / 2, topD / 2));
  return g;
}

function chair(): Group {
  const g = new Group();
  const w = wood();
  const seat = painted('#D4B47A');
  box(g, 0.46, 0.05, 0.46, seat, 0, 0.42, 0, 0.015);
  [[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]].forEach(([x, z]) => box(g, 0.05, 0.42, 0.05, w, x, 0.21, z));
  box(g, 0.46, 0.42, 0.05, w, 0, 0.66, -0.21);
  g.add(contactShadow(0.28, 0.3));
  return g;
}

function bed(): Group {
  const g = new Group();
  const w = wood();
  const sheet = cloth('#F4EDE0');
  const quilt = cloth('#E8B0B8');
  const pillow = cloth('#F7EFE4');
  box(g, 2.1, 0.16, 1.6, w, 0, 0.18, 0, 0.02);
  box(g, 2.02, 0.14, 1.52, sheet, 0, 0.32, 0, 0.02);
  box(g, 1.4, 0.1, 1.48, quilt, 0.28, 0.42, 0, 0.03);
  box(g, 0.42, 0.14, 0.58, pillow, -0.78, 0.44, -0.32, 0.04);
  box(g, 0.42, 0.14, 0.58, pillow, -0.78, 0.44, 0.32, 0.04);
  box(g, 0.1, 0.7, 1.62, w, -1.02, 0.45, 0);
  box(g, 0.08, 0.38, 1.62, w, 1.02, 0.32, 0);
  g.add(contactShadow(1.12, 0.88));
  return g;
}

function shelf(): Group {
  const g = new Group();
  const w = wood();
  box(g, 1.1, 1.55, 0.36, w, 0, 0.78, 0);
  box(g, 1.02, 1.47, 0.08, painted('#F3E6D0'), 0, 0.78, 0.14);
  const cols = ['#C96A6A', '#6A7A8A', '#E8C878', '#7AA05A', '#8A6AA0', '#E890A8', '#C4A06A', '#5E8444'];
  for (let row = 0; row < 4; row++) {
    const y = 0.28 + row * 0.34;
    box(g, 1.02, 0.03, 0.32, w, 0, y, 0);
    for (let i = 0; i < 5; i++) {
      const bw = 0.12 + (i % 3) * 0.02, bh = 0.22 + (i % 2) * 0.05;
      box(g, bw, bh, 0.2, painted(cols[(row * 5 + i) % cols.length]!), -0.4 + i * 0.2, y + 0.03 + bh / 2, 0.02);
    }
  }
  g.add(contactShadow(0.58, 0.24));
  return g;
}

function tv(): Group {
  const g = new Group();
  const w = wood();
  box(g, 1.55, 0.42, 0.42, w, 0, 0.25, 0, 0.02);
  box(g, 1.4, 0.82, 0.08, painted('#1A2430'), 0, 0.92, -0.12);
  const screen = new Mesh(
    new BoxGeometry(1.28, 0.7, 0.03),
    new MeshStandardMaterial({ color: '#243044', emissive: '#2A4868', emissiveIntensity: 0.22, roughness: 0.35 }),
  );
  screen.position.set(0, 0.92, -0.07);
  g.add(screen);
  g.add(contactShadow(0.88, 0.3));
  return g;
}

function lamp(): Group {
  const g = new Group();
  const w = wood();
  const shade = new MeshStandardMaterial({ color: '#F4E0B8', emissive: '#E8C070', emissiveIntensity: 0.45, roughness: 0.55 });
  cyl(g, 0.16, 0.18, 0.06, w, 0, 0.03, 0, 12);
  cyl(g, 0.03, 0.03, 1.35, w, 0, 0.72, 0, 8);
  cyl(g, 0.22, 0.28, 0.28, shade, 0, 1.48, 0, 12);
  g.add(contactShadow(0.2, 0.2));
  return g;
}

function wardrobe(): Group {
  const g = new Group();
  const w = wood();
  box(g, 1.1, 1.7, 0.5, w, 0, 0.85, 0, 0.02);
  box(g, 0.02, 1.5, 0.02, painted('#D8B878'), 0, 0.88, 0.26);
  cyl(g, 0.025, 0.025, 0.04, painted('#E2BE73'), -0.18, 0.85, 0.26, 8);
  cyl(g, 0.025, 0.025, 0.04, painted('#E2BE73'), 0.18, 0.85, 0.26, 8);
  g.add(contactShadow(0.58, 0.3));
  return g;
}

function cattree(): Group {
  const g = new Group();
  const sisal = painted('#D8B878', 0.9);
  const plat = cloth('#E8C878');
  cyl(g, 0.08, 0.08, 1.15, sisal, 0, 0.58, 0, 8);
  box(g, 0.55, 0.06, 0.55, plat, 0, 0.08, 0, 0.02);
  box(g, 0.42, 0.05, 0.42, plat, 0.02, 0.55, 0, 0.02);
  box(g, 0.36, 0.05, 0.36, plat, -0.02, 1.08, 0, 0.02);
  g.add(contactShadow(0.34, 0.34));
  return g;
}

function dogbed(): Group {
  const g = new Group();
  const rim = cloth('#6A7A8A');
  const cushion = cloth('#C8D0D8');
  box(g, 0.82, 0.14, 0.72, rim, 0, 0.1, 0, 0.04);
  box(g, 0.62, 0.08, 0.52, cushion, 0, 0.16, 0, 0.04);
  g.add(contactShadow(0.44, 0.4));
  return g;
}

function vase(kind: 'roses' | 'lisi'): Group {
  const g = new Group();
  const pot = painted('#E8F0DC');
  cyl(g, 0.09, 0.11, 0.22, pot, 0, 0.14, 0, 10);
  const stem = painted('#5E8444');
  const bloom = kind === 'roses' ? painted('#E890A8') : painted('#8A6AA0');
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const sx = Math.cos(a) * 0.04, sz = Math.sin(a) * 0.04;
    cyl(g, 0.012, 0.012, 0.28, stem, sx, 0.38, sz, 6);
    const ball = new Mesh(new SphereGeometry(kind === 'roses' ? 0.07 : 0.055, 10, 8), bloom);
    ball.position.set(sx, 0.54 + (i % 2) * 0.04, sz);
    g.add(ball);
  }
  g.add(contactShadow(0.14, 0.14));
  return g;
}

function rug(): Group {
  const g = new Group();
  const mat = new MeshStandardMaterial({ color: '#C96A6A', map: fabricMap('#C96A6A'), roughness: 0.95, metalness: 0 });
  const mesh = new Mesh(new BoxGeometry(3.5, 0.025, 2.3), mat);
  mesh.position.y = 0.014;
  g.add(mesh);
  // stripe
  const stripe = new Mesh(new BoxGeometry(3.2, 0.01, 0.12), painted('#E8A0A0'));
  stripe.position.set(0, 0.024, 0);
  g.add(stripe);
  return g;
}

function cushion(): Group {
  const g = new Group();
  box(g, 0.55, 0.16, 0.55, cloth('#E8A0A0'), 0, 0.09, 0, 0.05);
  g.add(contactShadow(0.32, 0.32));
  return g;
}

export function buildItem(kind: string): Group {
  switch (kind) {
    case 'rug': return rug();
    case 'sofa': return sofa();
    case 'armchair': return armchair();
    case 'coffee': return tableLike(1.28, 0.72, 0.07, 0.32);
    case 'table': return tableLike(1.4, 1.4, 0.07, 0.68);
    case 'chair': return chair();
    case 'bed': return bed();
    case 'night': return tableLike(0.48, 0.48, 0.07, 0.48);
    case 'side': return tableLike(0.48, 0.48, 0.07, 0.42);
    case 'shelf': return shelf();
    case 'tv': return tv();
    case 'lamp': return lamp();
    case 'wardrobe': return wardrobe();
    case 'cattree': return cattree();
    case 'dogbed': return dogbed();
    case 'roses': return vase('roses');
    case 'lisi': return vase('lisi');
    case 'cushion': return cushion();
    default: return tableLike(0.5, 0.5, 0.07, 0.4);
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
