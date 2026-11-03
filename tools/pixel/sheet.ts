// Sprite review sheets: renders every string-art frame (cat + meadow art) to 8x PNG contact sheets in review/sprites/.
//   npx tsx tools/pixel/sheet.ts            (no browser needed; pure string art -> PNG via zlib)
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { CAT_FRAMES, CAT_PAL } from '../../src/shared/pixel/cat';
import { SHEETS } from '../../src/stages/meadow/art';

const S = 8, PAD = 4, BG = [0x9a, 0xdc, 0xff];
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function crc32(b: Buffer) { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; }
function chunk(type: string, data: Buffer) { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function png(w: number, h: number, rgb: Uint8Array) {
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(rgb.buffer, y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function sheet(name: string, groups: Record<string, string[][]>, pal: Record<string, string>) {
  const frames = Object.values(groups).flat();
  const fw = Math.max(...frames.map(f => Math.max(...f.map(r => r.length)))), fh = Math.max(...frames.map(f => f.length));
  const cols = Math.max(...Object.values(groups).map(g => g.length)), rows = Object.keys(groups).length;
  const W = (cols * (fw + PAD) + PAD) * S, H = (rows * (fh + PAD) + PAD) * S, img = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i++) img.set(BG, i * 3);
  Object.values(groups).forEach((g, gy) => g.forEach((f, gx) => f.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = pal[r[x]]; if (!c) continue; const rgb = hex(c);
    const ox = (PAD + gx * (fw + PAD) + x) * S, oy = (PAD + gy * (fh + PAD) + y) * S;
    for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) img.set(rgb, ((oy + yy) * W + ox + xx) * 3); } })));
  mkdirSync('review/sprites', { recursive: true }); writeFileSync(`review/sprites/${name}.png`, png(W, H, img));
  console.log(`review/sprites/${name}.png  ${Object.keys(groups).join(', ')}`);
}
sheet('cat', CAT_FRAMES, CAT_PAL);
for (const s of SHEETS) sheet(s.name, s.groups, s.pal);
