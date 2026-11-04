// Camcorder viewfinder HUD drawn with a self-made 5×7 pixel font (digits + the few capitals we need) on a 2D canvas
// scaled up by an integer factor. Corner brackets, ● REC (blinking), timecode, battery, DAY 200 date stamp.
const G: Record<string, string> = {
  '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100010001000100011111',
  '3': '11110000010000101110000010000111110', '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110',
  '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000', '8': '01110100011000101110100011000101110',
  '9': '01110100011000101111000010001001100', ':': '00000001000010000000001000010000000', ' ': '00000000000000000000000000000000000',
  A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110',
  D: '11100100101000110001100011001011100', E: '11111100001000011110100001000011111', G: '01110100011000010111100011000101111',
  H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110', K: '10001100101010011000101001001010001',
  L: '10000100001000010000100001000011111', M: '10001110111010110101100011000110001', N: '10001110011010110011100011000110001',
  O: '01110100011000110001100011000101110', P: '11110100011000111110100001000010000', R: '11110100011000111110101001001010001',
  S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', Y: '10001100010101000100001000010000100',
  F: '11111100001000011110100001000010000', '>': '10000010000010000010001000100010000',
  '.': '00000000000000000000000000110001100', '-': '00000000000000011111000000000000000',
};
export function makeHud(host: HTMLElement) {
  const c = document.createElement('canvas'); c.className = 'n-hud'; host.appendChild(c);
  const g = c.getContext('2d')!; let k = 2, W = 0, H = 0;
  const resize = () => {
    k = Math.max(2, Math.floor(Math.min(innerWidth, innerHeight) / 230));
    W = Math.ceil(innerWidth / k); H = Math.ceil(innerHeight / k); c.width = W; c.height = H;
    c.style.width = `${W * k}px`; c.style.height = `${H * k}px`;
  };
  resize(); window.addEventListener('resize', resize);
  const text = (s: string, x: number, y: number, col: string) => {
    for (let i = 0; i < s.length; i++) {
      const gl = G[s[i]] ?? G[' '];
      for (let p = 0; p < 35; p++) if (gl[p] === '1') { const px = x + i * 6 + (p % 5), py = y + Math.floor(p / 5); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(px + 1, py + 1, 1, 1); g.fillStyle = col; g.fillRect(px, py, 1, 1); }
    }
  };
  const W1 = 'rgba(246,244,238,.92)';
  return {
    /** t seconds of footage; low = battery warning blink; on = recording (false during boot) */
    draw(t: number, opts: { rec: boolean; low: boolean; alpha: number; ff?: boolean }) {
      g.clearRect(0, 0, W, H); if (opts.alpha <= 0) return; g.globalAlpha = opts.alpha;
      const m = 10, L = 12;
      g.fillStyle = W1;
      for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]] as const) {
        g.fillRect(sx > 0 ? x : x - L, y - (sy > 0 ? 0 : 1), L, 1); g.fillRect(x - (sx > 0 ? 0 : 1), sy > 0 ? y : y - L, 1, L);
      }
      const ox = m + 6, oy = m + 6;
      if (opts.rec && Math.floor(t * 1.4) % 2 === 0) { g.fillStyle = '#ff3b4a'; g.beginPath(); g.arc(ox + 3, oy + 3, 3, 0, Math.PI * 2); g.fill(); }
      text(opts.ff ? '>> FF' : opts.rec ? 'REC' : 'STBY', ox + 10, oy, W1);
      const s = Math.floor(t), tc = `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      text(tc, ox, oy + 11, W1);
      // battery (bottom-right corner, above touch area on phones it's just a tiny glyph)
      const bx = W - m - 26, by = H - m - 14; g.fillStyle = W1;
      g.fillRect(bx, by, 18, 1); g.fillRect(bx, by + 8, 18, 1); g.fillRect(bx, by, 1, 9); g.fillRect(bx + 17, by, 1, 9); g.fillRect(bx + 18, by + 3, 2, 3);
      const bars = opts.low ? (Math.floor(t * 2) % 2 ? 1 : 0) : 3;
      for (let i = 0; i < bars; i++) g.fillRect(bx + 2 + i * 5, by + 2, 4, 5);
      text('DAY 200', m + 6, H - m - 14, W1);
      text('NIGHT  PM 11:58', m + 6, H - m - 24, 'rgba(246,244,238,.55)');
      g.globalAlpha = 1;
    },
  };
}
