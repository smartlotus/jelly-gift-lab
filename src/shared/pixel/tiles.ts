// Tile map + axis-separated AABB collision, platformer body with coyote time / jump buffer / variable jump height.
// Levels are authored as string rows (one char per 16px tile) - readable diffs, trivially editable by any agent.
export const TILE = 16;
export interface TileMap { w: number; h: number; data: string[]; solid: (ch: string) => boolean; oneway?: (ch: string) => boolean }
export function tileAt(m: TileMap, tx: number, ty: number): string {
  if (tx < 0 || tx >= m.w) return '#'; if (ty < 0) return ' '; if (ty >= m.h) return ' ';  // walls at the sides, open sky/pits
  return m.data[ty][tx] ?? ' ';
}
export function makeMap(rows: string[], solid = (c: string) => c !== ' ' && c !== '.', oneway?: (c: string) => boolean): TileMap {
  const w = Math.max(...rows.map(r => r.length));
  return { w, h: rows.length, data: rows.map(r => r.padEnd(w, ' ')), solid, oneway };
}
/** find all tiles of a char (spawn points, fountain, door, exhibits...) */
export function find(m: TileMap, ch: string) { const o: { tx: number; ty: number; x: number; y: number }[] = []; m.data.forEach((r, ty) => { for (let tx = 0; tx < r.length; tx++) if (r[tx] === ch) o.push({ tx, ty, x: tx * TILE, y: ty * TILE }); }); return o; }

export interface Body { x: number; y: number; w: number; h: number; vx: number; vy: number; ground: boolean; coyote: number; buffer: number; face: 1 | -1 }
export const body = (x: number, y: number, w = 10, h = 13): Body => ({ x, y, w, h, vx: 0, vy: 0, ground: false, coyote: 0, buffer: 0, face: 1 });

/** gentle, forgiving defaults (a gift, not a rage game). px/s, px/s^2 */
export const FEEL = { run: 96, accel: 900, decel: 1300, air: 0.75, gravity: 980, jump: 330, cut: 0.45, maxFall: 420, coyote: 0.1, buffer: 0.12 };

function solidAt(m: TileMap, px: number, py: number) { return m.solid(tileAt(m, Math.floor(px / TILE), Math.floor(py / TILE))); }
export function moveBody(b: Body, m: TileMap, dt: number, axis: number, jumpHit: boolean, jumpHeld: boolean, f = FEEL) {
  // horizontal
  const target = axis * f.run, a = (axis ? f.accel : f.decel) * (b.ground ? 1 : f.air);
  b.vx = b.vx < target ? Math.min(target, b.vx + a * dt) : Math.max(target, b.vx - a * dt);
  if (axis) b.face = axis > 0 ? 1 : -1;
  // jump (buffer + coyote)
  b.buffer = jumpHit ? f.buffer : Math.max(0, b.buffer - dt);
  b.coyote = b.ground ? f.coyote : Math.max(0, b.coyote - dt);
  let jumped = false;
  if (b.buffer > 0 && b.coyote > 0) { b.vy = -f.jump; b.buffer = 0; b.coyote = 0; jumped = true; }
  if (!jumpHeld && b.vy < -f.jump * f.cut) b.vy = -f.jump * f.cut; // short hop when released early
  b.vy = Math.min(f.maxFall, b.vy + f.gravity * dt);
  // integrate X then Y with tile sweep
  b.x += b.vx * dt;
  if (b.vx > 0 && (solidAt(m, b.x + b.w, b.y + 1) || solidAt(m, b.x + b.w, b.y + b.h - 1))) { b.x = Math.floor((b.x + b.w) / TILE) * TILE - b.w - 0.001; b.vx = 0; }
  if (b.vx < 0 && (solidAt(m, b.x, b.y + 1) || solidAt(m, b.x, b.y + b.h - 1))) { b.x = Math.floor(b.x / TILE + 1) * TILE; b.vx = 0; }
  const prevBottom = b.y + b.h; b.y += b.vy * dt; b.ground = false;
  if (b.vy >= 0) {
    const ty = Math.floor((b.y + b.h) / TILE);
    for (const px of [b.x + 1, b.x + b.w - 1]) {
      const ch = tileAt(m, Math.floor(px / TILE), ty);
      const one = m.oneway?.(ch) && prevBottom <= ty * TILE + 0.5;
      if (m.solid(ch) && (!m.oneway?.(ch) || one)) { b.y = ty * TILE - b.h; b.vy = 0; b.ground = true; break; }
    }
  } else if (solidAt(m, b.x + 1, b.y) || solidAt(m, b.x + b.w - 1, b.y)) {
    const ch = tileAt(m, Math.floor((b.x + b.w / 2) / TILE), Math.floor(b.y / TILE));
    if (!m.oneway?.(ch)) { b.y = Math.floor(b.y / TILE + 1) * TILE; b.vy = 0; }
  }
  return { jumped, headTile: b.vy === 0 && !b.ground ? { tx: Math.floor((b.x + b.w / 2) / TILE), ty: Math.floor(b.y / TILE) - 1 } : null };
}
export const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
