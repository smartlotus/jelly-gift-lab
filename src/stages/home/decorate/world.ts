// Module A: realtime spatial home decoration. Isolated from the cinematic montage.
import {
  AmbientLight, Color, DirectionalLight, Group, HemisphereLight, PerspectiveCamera,
  Raycaster, Scene, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { t, apply } from '../../../shared/i18n';
import { thumb } from '../furniture';
import { loadLayout, persistLayout, type SavedItem } from '../save';
import { placed, saved, wood } from '../sfx';
import { demoLayout3, extents, FLOOR_KINDS, kind3, ROOM } from './catalog';
import { buildItem, buildRoom, footprintMarker } from './meshes';

export interface DecorateApi {
  update(_dt: number): void;
  items(): SavedItem[];
  furnishDemo(): void;
  destroy(): void;
  onSave: ((items: SavedItem[]) => void) | null;
}

interface Piece {
  id: number;
  kind: string;
  x: number;
  z: number;
  yaw: number;
  root: Group;
}

let uid = 1;
const SNAP = 0.2;

function canWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }

function snapped(n: number) { return Math.round(n / SNAP) * SNAP; }

function footerOf(kind: string, yaw: number) {
  return extents(kind, yaw);
}

function collides(list: Piece[], kind: string, x: number, z: number, yaw: number, ignore?: number): boolean {
  const k = kind3(kind);
  if (!k?.collide) return false;
  const a = footerOf(kind, yaw);
  for (const p of list) {
    if (p.id === ignore) continue;
    const o = kind3(p.kind);
    if (!o?.collide) continue;
    const b = footerOf(p.kind, p.yaw);
    if (Math.abs(x - p.x) < a.hw + b.hw && Math.abs(z - p.z) < a.hd + b.hd) return true;
  }
  return false;
}

function inBounds(kind: string, x: number, z: number, yaw: number): { x: number; z: number } {
  const { hw, hd } = footerOf(kind, yaw);
  const maxX = ROOM.w / 2 - hw - 0.2;
  const maxZ = ROOM.d / 2 - hd - 0.2;
  return { x: clamp(x, -maxX, maxX), z: clamp(z, -maxZ, maxZ) };
}

export function createDecorate(host: HTMLElement): DecorateApi {
  let onSave: ((items: SavedItem[]) => void) | null = null;
  const loaded = loadLayout();
  let pieces: Piece[] = [];
  const undo: SavedItem[][] = [];
  let selectedKind: string | null = null;
  let focus: number | null = null;
  let dragging: { id: number; ox: number; oz: number } | null = null;
  let orbiting = false;
  let lastPtr = { x: 0, y: 0 };
  let az = 0.22, pol = 1.05, dist = 7.6;
  const target = new Vector3(0, 0.78, -0.15);
  let dead = false;
  let raf = 0;

  const space = document.createElement('div');
  space.id = 'hm-space';
  host.appendChild(space);

  const tools = document.createElement('div'); tools.className = 'hm-tools';
  tools.innerHTML = `<button type="button" data-k="undo" data-i18n="home.undo"></button>
    <button type="button" data-k="reset" data-i18n="home.reset"></button>
    <button type="button" class="primary" data-k="save" data-i18n="home.save"></button>`;
  document.body.appendChild(tools);

  const hint = document.createElement('p'); hint.className = 'hm-hint on'; hint.dataset.i18n = 'home.hint';
  document.body.appendChild(hint);

  const drawer = document.createElement('div'); drawer.className = 'hm-drawer';
  for (const k of FLOOR_KINDS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'hm-chip'; b.dataset.kind = k.id;
    b.setAttribute('aria-label', t(k.label));
    b.appendChild(thumb(k.id));
    drawer.appendChild(b);
  }
  document.body.appendChild(drawer);

  const sel = document.createElement('div'); sel.className = 'hm-sel';
  sel.innerHTML = `<button type="button" data-k="rotate" data-i18n="home.rotate"></button>
    <button type="button" data-k="remove" data-i18n="home.remove"></button>`;
  document.body.appendChild(sel);

  const turn = document.createElement('div'); turn.className = 'hm-turn';
  turn.innerHTML = `<div class="hm-phone" aria-hidden="true"></div><p data-i18n="home.turn"></p>
    <button type="button" data-i18n="home.turn.skip"></button>`;
  document.body.appendChild(turn);

  const migrate = document.createElement('p');
  migrate.className = 'hm-migrate';
  migrate.dataset.i18n = 'home.migrate';
  if (loaded.notice === 'reset') { migrate.classList.add('on'); document.body.appendChild(migrate); }

  const snap = () => undo.push(pieces.map(p => ({ kind: p.kind, x: p.x, z: p.z, yaw: p.yaw })));
  const serialized = (): SavedItem[] => pieces.map(p => ({ kind: p.kind, x: p.x, z: p.z, yaw: p.yaw }));

  const orient = () => {
    const portrait = innerHeight > innerWidth;
    document.body.classList.toggle('hm-portrait', portrait);
  };
  orient();
  window.addEventListener('resize', orient);
  turn.querySelector('button')!.addEventListener('click', () => document.body.classList.add('hm-turn-skip'));

  if (!canWebGL()) {
    const msg = document.createElement('p');
    msg.className = 'hm-nowebgl on';
    msg.dataset.i18n = 'home.nowebgl';
    document.body.appendChild(msg);
    apply();
    tools.addEventListener('click', e => {
      const k = (e.target as HTMLElement).closest('button')?.dataset.k;
      if (k === 'save') { persistLayout([]); saved(); onSave?.([]); }
    });
    (window as unknown as { __homeRoom?: Record<string, unknown> }).__homeRoom = {
      items: () => [],
      save: () => { persistLayout([]); onSave?.([]); },
      persist: () => persistLayout([]),
      furnishDemo: () => {},
      raycast: () => null,
    };
    return {
      update() { /* fallback has no loop */ },
      items: () => [],
      furnishDemo() { /* */ },
      destroy() {
        tools.remove(); drawer.remove(); hint.remove(); sel.remove(); turn.remove(); space.remove(); msg.remove(); migrate.remove();
        window.removeEventListener('resize', orient);
        document.body.classList.remove('hm-decorating', 'hm-portrait', 'hm-turn-skip');
      },
      get onSave() { return onSave; },
      set onSave(f) { onSave = f; },
    };
  }

  const scene = new Scene();
  scene.background = new Color(0xc8bba4);
  const camera = new PerspectiveCamera(38, innerWidth / Math.max(1, innerHeight), 0.1, 40);
  const renderer = new WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = 'srgb';
  renderer.setClearColor(0xc8bba4, 1);
  space.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', t('home.meta.title'));

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const scale = 0.55;
    const rw = Math.max(320, Math.round(innerWidth * dpr * scale));
    const rh = Math.max(180, Math.round(innerHeight * dpr * scale));
    renderer.setSize(rw, rh, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.imageRendering = 'pixelated';
    camera.aspect = rw / rh;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  scene.add(new AmbientLight(0xf0e4d0, 0.55));
  scene.add(new HemisphereLight(0xffe0c0, 0x8a7050, 0.42));
  const sun = new DirectionalLight(0xffd0a0, 0.85);
  sun.position.set(-2.2, 4.4, -2.8);
  scene.add(sun);
  const windowLight = new DirectionalLight(0xffc888, 0.35);
  windowLight.position.set(1.2, 2.2, -3.4);
  scene.add(windowLight);

  const room = buildRoom();
  scene.add(room.group);
  const furnitureRoot = new Group();
  scene.add(furnitureRoot);

  const marker = footprintMarker(0.4, 0.4);
  marker.visible = false;
  scene.add(marker);

  const preview = new Group();
  preview.visible = false;
  scene.add(preview);
  let previewKind = '';

  const raycaster = new Raycaster();
  const ndc = new Vector2();

  function setCam() {
    const x = target.x + dist * Math.sin(az) * Math.sin(pol);
    const y = target.y + dist * Math.cos(pol);
    const z = target.z + dist * Math.cos(az) * Math.sin(pol);
    camera.position.set(x, y, z);
    camera.lookAt(target);
  }
  setCam();

  function hitFloor(cx: number, cy: number): Vector3 | null {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.x = ((cx - r.left) / r.width) * 2 - 1;
    ndc.y = -((cy - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(room.group.children, true);
    const floorHit = hits.find(h => h.object.userData.floor);
    return floorHit ? floorHit.point.clone() : null;
  }

  function hitPiece(cx: number, cy: number): Piece | null {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.x = ((cx - r.left) / r.width) * 2 - 1;
    ndc.y = -((cy - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const objs = pieces.map(p => p.root);
    const hits = raycaster.intersectObjects(objs, true);
    if (!hits.length) return null;
    let obj = hits[0]!.object;
    while (obj.parent && obj.parent !== furnitureRoot) obj = obj.parent;
    return pieces.find(p => p.root === obj) ?? null;
  }

  function applyPose(p: Piece) {
    p.root.position.set(p.x, 0, p.z);
    p.root.rotation.y = p.yaw * Math.PI / 180;
  }

  function addPiece(kind: string, x: number, z: number, yaw: number): Piece | null {
    if (!kind3(kind)) return null;
    const pos = inBounds(kind, snapped(x), snapped(z), yaw);
    if (collides(pieces, kind, pos.x, pos.z, yaw)) return null;
    const root = buildItem(kind);
    const p: Piece = { id: uid++, kind, x: pos.x, z: pos.z, yaw, root };
    applyPose(p);
    furnitureRoot.add(root);
    pieces.push(p);
    return p;
  }

  function clearPieces() {
    for (const p of pieces) { furnitureRoot.remove(p.root); }
    pieces = [];
    focus = null;
  }

  function restore(list: SavedItem[]) {
    clearPieces();
    for (const it of list) addPiece(it.kind, it.x, it.z, it.yaw);
    syncSel();
  }

  function syncSel() {
    const p = pieces.find(i => i.id === focus);
    sel.classList.toggle('on', !!p);
    if (p) {
      const v = new Vector3(p.x, 0.9, p.z).project(camera);
      const r = renderer.domElement.getBoundingClientRect();
      const sx = r.left + (v.x * 0.5 + 0.5) * r.width;
      const sy = r.top + (-v.y * 0.5 + 0.5) * r.height;
      // keep the piece toolbar clear of the save row and the screen edges
      const halfW = 74;
      const left = Math.min(Math.max(12, sx - halfW), innerWidth - halfW * 2 - 12);
      const top = Math.min(Math.max(64, sy - 48), innerHeight - 152);
      sel.style.left = `${Math.round(left)}px`;
      sel.style.top = `${Math.round(top)}px`;
      const ext = footerOf(p.kind, p.yaw);
      marker.visible = true;
      marker.position.set(p.x, 0, p.z);
      marker.scale.set(ext.hw / 0.4, 1, ext.hd / 0.4);
    } else {
      marker.visible = false;
    }
    drawer.querySelectorAll('.hm-chip').forEach(ch => ch.classList.toggle('on', (ch as HTMLElement).dataset.kind === selectedKind));
  }

  function setPreview(kind: string | null) {
    if (!kind) { preview.visible = false; previewKind = ''; return; }
    if (previewKind !== kind) {
      preview.clear();
      const ghost = buildItem(kind);
      ghost.traverse(o => {
        const m = o as MeshLike;
        if (m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach(mat => { if ('opacity' in mat) { mat.transparent = true; mat.opacity = 0.45; } });
        }
      });
      preview.add(ghost);
      previewKind = kind;
    }
    preview.visible = true;
  }

  type MeshLike = { material?: { transparent: boolean; opacity: number } | { transparent: boolean; opacity: number }[] };

  restore(loaded.items);

  drawer.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.hm-chip');
    if (!b?.dataset.kind) return;
    selectedKind = selectedKind === b.dataset.kind ? null : b.dataset.kind;
    focus = null;
    setPreview(selectedKind);
    syncSel();
    wood();
  });

  tools.addEventListener('click', e => {
    const k = (e.target as HTMLElement).closest('button')?.dataset.k;
    if (k === 'undo') {
      const prev = undo.pop();
      if (prev) restore(prev);
    } else if (k === 'reset') {
      snap();
      clearPieces();
      syncSel();
      wood();
    } else if (k === 'save') {
      persistLayout(serialized());
      saved();
      onSave?.(serialized());
    }
  });

  sel.addEventListener('click', e => {
    const k = (e.target as HTMLElement).closest('button')?.dataset.k;
    const p = pieces.find(i => i.id === focus);
    if (!p) return;
    if (k === 'rotate') {
      const next = (p.yaw + 90) % 360;
      const pos = inBounds(p.kind, p.x, p.z, next);
      if (!collides(pieces, p.kind, pos.x, pos.z, next, p.id)) {
        snap();
        p.yaw = next; p.x = pos.x; p.z = pos.z;
        applyPose(p);
        wood();
      }
    } else if (k === 'remove') {
      snap();
      furnitureRoot.remove(p.root);
      pieces = pieces.filter(i => i.id !== p.id);
      focus = null;
      wood();
    }
    syncSel();
  });

  const down = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('.hm-tools, .hm-drawer, .hm-sel, .hm-turn, .gift-chrome')) return;
    lastPtr = { x: e.clientX, y: e.clientY };
    const floor = hitFloor(e.clientX, e.clientY);
    const piece = hitPiece(e.clientX, e.clientY);
    if (selectedKind && floor) {
      snap();
      const made = addPiece(selectedKind, floor.x, floor.z, 0);
      if (made) { focus = made.id; placed(); selectedKind = null; setPreview(null); }
      syncSel();
      return;
    }
    if (piece && floor) {
      focus = piece.id;
      dragging = { id: piece.id, ox: floor.x - piece.x, oz: floor.z - piece.z };
      syncSel();
      return;
    }
    orbiting = true;
    focus = piece ? piece.id : focus;
    syncSel();
  };

  const move = (e: PointerEvent) => {
    if (dragging) {
      const p = pieces.find(i => i.id === dragging!.id);
      const floor = hitFloor(e.clientX, e.clientY);
      if (!p || !floor) return;
      const raw = inBounds(p.kind, snapped(floor.x - dragging.ox), snapped(floor.z - dragging.oz), p.yaw);
      if (!collides(pieces, p.kind, raw.x, raw.z, p.yaw, p.id)) {
        p.x = raw.x; p.z = raw.z;
        applyPose(p);
        syncSel();
      }
      return;
    }
    if (orbiting) {
      const dx = e.clientX - lastPtr.x, dy = e.clientY - lastPtr.y;
      lastPtr = { x: e.clientX, y: e.clientY };
      az = clamp(az - dx * 0.005, -0.55, 0.55);
      pol = clamp(pol - dy * 0.004, 0.85, 1.22);
      setCam();
      return;
    }
    if (selectedKind) {
      const floor = hitFloor(e.clientX, e.clientY);
      if (floor) {
        setPreview(selectedKind);
        const pos = inBounds(selectedKind, snapped(floor.x), snapped(floor.z), 0);
        preview.position.set(pos.x, 0, pos.z);
        preview.visible = !collides(pieces, selectedKind, pos.x, pos.z, 0);
      }
    }
  };

  const up = () => { dragging = null; orbiting = false; };

  renderer.domElement.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  renderer.domElement.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    dist = clamp(dist + e.deltaY * 0.008, 6.0, 9.6);
    setCam();
  }, { passive: false });

  const vis = () => {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
    else loop();
  };
  document.addEventListener('visibilitychange', vis);

  const loop = () => {
    if (dead) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    setCam();
    renderer.render(scene, camera);
    if (focus) syncSel();
  };
  loop();

  apply();

  const api: DecorateApi = {
    update() { /* own rAF */ },
    items: () => serialized(),
    furnishDemo() {
      snap();
      restore(demoLayout3());
    },
    destroy() {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      renderer.forceContextLoss?.();
      tools.remove(); drawer.remove(); hint.remove(); sel.remove(); turn.remove(); space.remove(); migrate.remove();
      window.removeEventListener('resize', orient);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.removeEventListener('visibilitychange', vis);
      document.body.classList.remove('hm-decorating', 'hm-portrait', 'hm-turn-skip');
      delete (window as unknown as { __homeRoom?: unknown }).__homeRoom;
    },
    get onSave() { return onSave; },
    set onSave(f) { onSave = f; },
  };

  (window as unknown as { __homeRoom?: Record<string, unknown> }).__homeRoom = {
    items: () => serialized(),
    save: () => { persistLayout(serialized()); onSave?.(serialized()); },
    persist: () => persistLayout(serialized()),
    furnishDemo: () => api.furnishDemo(),
    place: (kind: string, x: number, z: number, yaw = 0) => {
      snap();
      const p = addPiece(kind, x, z, yaw);
      if (p) { focus = p.id; syncSel(); }
      return !!p;
    },
    rotate: () => {
      const p = pieces.find(i => i.id === focus);
      if (!p) return false;
      const next = (p.yaw + 90) % 360;
      const pos = inBounds(p.kind, p.x, p.z, next);
      if (collides(pieces, p.kind, pos.x, pos.z, next, p.id)) return false;
      snap();
      p.yaw = next; p.x = pos.x; p.z = pos.z;
      applyPose(p);
      wood();
      syncSel();
      return true;
    },
    remove: () => { sel.querySelector<HTMLButtonElement>('[data-k="remove"]')?.click(); },
    reset: () => { tools.querySelector<HTMLButtonElement>('[data-k="reset"]')?.click(); },
    raycast: (cx: number, cy: number) => {
      const p = hitFloor(cx, cy);
      return p ? { x: p.x, z: p.z } : null;
    },
    selected: () => focus,
    collides: (kind: string, x: number, z: number, yaw = 0, ignore?: number) => collides(pieces, kind, x, z, yaw, ignore),
  };

  return api;
}
