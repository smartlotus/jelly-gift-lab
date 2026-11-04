// Three light puzzles on the night path (no fail state: gentle nudges, a hint after two misses, auto-pass after a few).
// Each one is a "close look" overlay over the dimmed forest, drawn as chunky pixel art so it belongs to the voxel night.
//   mushrooms(): tap three mushrooms small -> big (the sign shows the order as dots)
//   trail():     three openings in the trees, hoofprints lead into one
//   gate():      the padlock on the gate: "When is World Butt Day?"  __ 月 __ 日  -> 5 / 2
import { t, apply } from '../../shared/i18n';
import { pzSfx } from './sfx';

const coarse = matchMedia('(pointer: coarse)').matches;
/** char-art -> crisp SVG (one rect per horizontal run) */
function pix(rows: string[], pal: Record<string, string>, cls = '') {
  const w = rows[0].length, h = rows.length; let r = '';
  rows.forEach((row, y) => { let x = 0; while (x < w) { const c = row[x]; if (c === '.') { x++; continue; } let e = x; while (e < w && row[e] === c) e++; r += `<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${pal[c]}"/>`; x = e; } });
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const MUSH = ['...rrrrrr...', '.rrwwrrrrrr.', 'rrrwwrrrwwrr', 'rrrrrrrrwwrr', 'rwwrrrrrrrrr', 'rwwrrrwwrrrr', '.dddddddddd.', '....cccc....', '....cccc....', '....cCcc....', '...cccccc...'];
const MUSH_PAL = { r: '#C4536E', w: '#F6DCC8', d: '#7E3A4C', c: '#E9D7BC', C: '#CDB894' };
const LOCK = ['...kkkkk...', '..k.....k..', '.k.......k.', '.k.......k.', 'kkkkkkkkkkk', 'kyyyyyyyyyk', 'kyyykkkyyyk', 'kyyykkkyyyk', 'kyyyykyyyyk', 'kyyyykyyyyk', 'kyyyyyyyyyk', 'kkkkkkkkkkk'];
const LOCK_PAL = { k: '#2a2118', y: '#B9934A' };

type Done = (auto?: boolean) => void;
function frame(cls: string, inner: string) {
  const el = document.createElement('section'); el.className = `pz ${cls}`; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = `<div class="pz-in">${inner}<p class="pz-say" aria-live="polite"></p></div>`;
  document.body.appendChild(el); apply(el);
  for (const ev of ['pointerdown', 'pointerup', 'touchstart'] as const) el.addEventListener(ev, e => e.stopPropagation());
  requestAnimationFrame(() => el.classList.add('on'));
  const say = el.querySelector<HTMLElement>('.pz-say')!;
  return {
    el,
    say(key: string, cls2 = '') { say.dataset.i18n = key; say.textContent = t(key); say.className = 'pz-say on ' + cls2; },
    close(): Promise<void> { el.classList.remove('on'); el.classList.add('out'); return new Promise(r => setTimeout(() => { el.remove(); r(); }, 650)); },
  };
}
const shake = (n: Element) => { n.classList.remove('pz-shake'); void (n as HTMLElement).offsetWidth; n.classList.add('pz-shake'); };

export function mushrooms(): Promise<void> {
  return new Promise(resolve => {
    const sizes = [0, 1, 2], order = [1, 2, 0];   // shown: medium, big, small
    const f = frame('pz-mush', `
      <p class="pz-q" data-i18n="night.pz.mush"></p>
      <div class="pz-sign"><i style="--s:.5"></i><i style="--s:.75"></i><i style="--s:1"></i></div>
      <div class="pz-row">${order.map(s => `<button type="button" class="pz-m" data-s="${s}" style="--w:${[46, 62, 80][s]}px" aria-label="${['S', 'M', 'L'][s]}">${pix(MUSH, MUSH_PAL)}</button>`).join('')}</div>`);
    let next = 0, miss = 0, done = false;
    const finish: Done = () => { if (done) return; done = true; f.el.querySelectorAll('.pz-m').forEach(b => b.classList.add('lit')); pzSfx.ok(); setTimeout(() => void f.close().then(resolve), 900); };
    f.el.querySelectorAll<HTMLButtonElement>('.pz-m').forEach(b => b.addEventListener('click', () => {
      if (done) return; const s = +b.dataset.s!;
      if (s === sizes[next]) { b.classList.add('lit'); pzSfx.tap(next); next++; if (next === 3) finish(); return; }
      miss++; next = 0; pzSfx.nope();
      f.el.querySelectorAll('.pz-m').forEach(m => { m.classList.remove('lit'); shake(m); });
      f.say(miss >= 2 ? 'night.pz.mush.hint' : 'night.pz.mush.no', miss >= 2 ? 'hint' : '');
      if (miss >= 2) f.el.querySelector('.pz-sign')!.classList.add('glow');
      if (miss >= 4) setTimeout(finish, 600);
    }));
  });
}

export function trail(): Promise<void> {
  return new Promise(resolve => {
    const right = 2;   // hoofprints curve off to the right-hand opening
    const hoof = (x: number, y: number, r: number, o: number) => `<g transform="translate(${x} ${y}) rotate(${r})" opacity="${o}"><ellipse cx="-3.4" cy="0" rx="2.9" ry="4.8"/><ellipse cx="3.4" cy="0" rx="2.9" ry="4.8"/></g>`;
    const prints = [[150, 112, 10, .95], [160, 94, 22, .85], [176, 78, 34, .75], [196, 64, 44, .62], [218, 52, 52, .5], [240, 42, 58, .38]].map(p => hoof(p[0], p[1], p[2], p[3])).join('');
    const tree = (dark: string) => pix(['ggggggggggg', 'gGgggGggggg', 'ggg.....ggg', 'gg.......gg', 'gg.......gg', 'b.........b', 'b.........b', 'b.........b', 'b.........b', 'b.........b', 'b.........b'], { g: '#22331f', G: '#2e4429', b: '#3a2a1c' }).replace('<svg', `<svg style="--dark:${dark}"`);
    const f = frame('pz-trail', `
      <p class="pz-q" data-i18n="night.pz.trail"></p>
      <div class="pz-forks">${[0, 1, 2].map(i => `<button type="button" class="pz-fork" data-i="${i}" aria-label="${i + 1}"><span class="pz-dark"></span>${tree('#000')}</button>`).join('')}</div>
      <svg class="pz-prints" viewBox="0 0 300 120" aria-hidden="true">${prints}</svg>`);
    let miss = 0, done = false;
    const finish = (b: Element) => { if (done) return; done = true; b.classList.add('go'); pzSfx.ok(); setTimeout(() => void f.close().then(resolve), 900); };
    f.el.querySelectorAll<HTMLButtonElement>('.pz-fork').forEach(b => b.addEventListener('click', () => {
      if (done) return;
      if (+b.dataset.i! === right) { finish(b); return; }
      miss++; pzSfx.nope(); shake(b); b.classList.add('nope');
      f.say(miss >= 2 ? 'night.pz.trail.hint' : 'night.pz.trail.no', miss >= 2 ? 'hint' : '');
      if (miss >= 2) f.el.querySelector('.pz-prints')!.classList.add('glow');
      if (miss >= 3) setTimeout(() => finish(f.el.querySelectorAll('.pz-fork')[right]), 700);
    }));
  });
}

/** the padlock: two number wheels (tap ▲▼, or type with the numeric keypad / keyboard). Resolves true if solved by hand. */
export function gate(): Promise<boolean> {
  return new Promise(resolve => {
    const wheel = (k: 'month' | 'day', max: number) => `
      <span class="pz-lab" data-i18n="night.pz.${k}"></span>
      <span class="pz-wheel" data-k="${k}" data-max="${max}">
        <button type="button" class="pz-up" data-i18n-aria="night.pz.up"><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></button>
        <input class="pz-num" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" placeholder="__" aria-label="${k}" />
        <button type="button" class="pz-dn" data-i18n-aria="night.pz.down"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
      </span>
      <span class="pz-unit" data-i18n="night.pz.${k}.u"></span>`;
    const f = frame('pz-gate', `
      <div class="pz-lock">${pix(LOCK, LOCK_PAL)}</div>
      <div class="pz-board">
        <p class="pz-q" data-i18n="night.pz.gate"></p>
        <form class="pz-date" autocomplete="off">${wheel('month', 12)}${wheel('day', 31)}</form>
        <button type="button" class="pz-open" data-i18n="night.pz.open"></button>
      </div>`);
    const inputs = [...f.el.querySelectorAll<HTMLInputElement>('.pz-num')];
    const val = (i: HTMLInputElement) => { const s = i.value.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\D/g, ''); return s ? parseInt(s, 10) : NaN; };
    let miss = 0, done = false;
    const finish = (auto: boolean) => {
      if (done) return; done = true;
      inputs[0].value = '5'; inputs[1].value = '2'; inputs.forEach(i => i.blur());
      f.el.classList.add('solved'); f.say(auto ? 'night.pz.gate.auto' : 'night.pz.ok', 'ok'); pzSfx.click(); setTimeout(() => pzSfx.ok(), 160);
      setTimeout(() => void f.close().then(() => resolve(!auto)), 1250);
    };
    const check = () => {
      if (done) return;
      const m = val(inputs[0]), d = val(inputs[1]);
      if (m === 5 && d === 2) { finish(false); return; }
      if (Number.isNaN(m) || Number.isNaN(d)) { (Number.isNaN(m) ? inputs[0] : inputs[1]).focus(); shake(f.el.querySelector('.pz-date')!); return; }
      miss++; pzSfx.click(); setTimeout(() => pzSfx.nope(), 90); shake(f.el.querySelector('.pz-lock')!);
      f.say(miss >= 4 ? 'night.pz.gate.hint2' : miss >= 2 ? 'night.pz.gate.hint' : miss === 1 ? 'night.pz.gate.no1' : 'night.pz.gate.no2', miss >= 2 ? 'hint' : '');
      if (miss >= 4) inputs[0].value = '5';
      if (miss >= 6) setTimeout(() => finish(true), 900);
    };
    f.el.querySelectorAll<HTMLElement>('.pz-wheel').forEach((w, wi) => {
      const inp = inputs[wi], max = +w.dataset.max!;
      const step = (s: number) => { const v = val(inp); inp.value = String(Number.isNaN(v) ? (s > 0 ? 1 : max) : ((v - 1 + s + max) % max) + 1); w.classList.remove('tick'); void w.offsetWidth; w.classList.add('tick'); pzSfx.tap(0); };
      w.querySelector('.pz-up')!.addEventListener('click', () => step(1));
      w.querySelector('.pz-dn')!.addEventListener('click', () => step(-1));
      inp.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp') { e.preventDefault(); step(1); } else if (e.key === 'ArrowDown') { e.preventDefault(); step(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); check(); }
        e.stopPropagation();
      });
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\D/g, '').slice(0, 2);
        const v = val(inp);
        if (wi === 0 && (inp.value.length === 2 || v > 1)) inputs[1].focus();   // month done -> day
      });
      // wheel on desktop
      w.addEventListener('wheel', e => { e.preventDefault(); step(e.deltaY < 0 ? 1 : -1); }, { passive: false });
    });
    f.el.querySelector('form')!.addEventListener('submit', e => { e.preventDefault(); check(); });
    f.el.querySelector('.pz-open')!.addEventListener('click', check);
    if (!coarse) setTimeout(() => inputs[0].focus(), 500);
  });
}

// ---- v03f: three more puzzles (each a different kind) + small cards ------------------------------------------------
//   musicBox():  listen + play back (memory): the music box plays "two tigers" in two phrases; tap the keys in order
//   candles():   a 3×3 Lights-Out on the crypt slab (logic): a tap flips a candle and its neighbours; light all nine
//   codeLock():  four digit wheels (knowledge + clues): our day one, 0503; collected note pieces fill in digits
const NOTES = [523.25, 587.33, 659.25, 698.46, 783.99];
const KEY_COL = ['#f4a7b9', '#ffd45c', '#9cc8ee', '#8fcb9b', '#e4dcf5'];
export function musicBox(): Promise<void> {
  return new Promise(resolve => {
    const PHRASES = [[0, 1, 2, 0], [2, 3, 4]];
    const f = frame('pz-music', `
      <p class="pz-q" data-i18n="night.pz.music"></p>
      <div class="pz-mbox"><div class="pz-drum"></div></div>
      <div class="pz-keys">${NOTES.map((_, i) => `<button type="button" class="pz-key" data-k="${i}" style="--c:${KEY_COL[i]}" aria-label="${i + 1}"><b></b><span>${'do re mi fa sol'.split(' ')[i]}</span></button>`).join('')}</div>
      <div class="pz-acts"><button type="button" class="pz-again" data-i18n="night.pz.music.again"></button><span class="pz-dots"></span></div>`);
    const keys = [...f.el.querySelectorAll<HTMLButtonElement>('.pz-key')];
    let phrase = 0, pos = 0, miss = 0, busy = true, done = false;
    const light = (k: number, ms = 360) => { keys[k].classList.add('lit'); pzSfx.note(NOTES[k]); setTimeout(() => keys[k].classList.remove('lit'), ms); };
    const dots = () => { f.el.querySelector('.pz-dots')!.innerHTML = PHRASES[phrase].map((_, i) => `<i class="${i < pos ? 'on' : ''}"></i>`).join(''); };
    const play = () => { busy = true; pos = 0; dots(); f.el.querySelector('.pz-mbox')!.classList.add('spin');
      PHRASES[phrase].forEach((k, i) => setTimeout(() => light(k), 500 + i * 520));
      setTimeout(() => { busy = false; f.el.querySelector('.pz-mbox')!.classList.remove('spin'); if (miss >= 2) keys[PHRASES[phrase][0]].classList.add('hint'); }, 500 + PHRASES[phrase].length * 520); };
    const finish = () => { if (done) return; done = true; f.say('night.pz.music.ok', 'ok'); pzSfx.ok(); f.el.classList.add('solved'); setTimeout(() => void f.close().then(resolve), 1300); };
    keys.forEach(b => b.addEventListener('click', () => {
      if (busy || done) return; const k = +b.dataset.k!; light(k, 220); keys.forEach(x => x.classList.remove('hint'));
      if (k === PHRASES[phrase][pos]) { pos++; dots(); if (miss >= 2 && pos < PHRASES[phrase].length) keys[PHRASES[phrase][pos]].classList.add('hint');
        if (pos === PHRASES[phrase].length) { if (++phrase === PHRASES.length) finish(); else { f.say('night.pz.music.next'); setTimeout(play, 700); } } return; }
      miss++; pzSfx.nope(); shake(f.el.querySelector('.pz-keys')!); f.say(miss >= 2 ? 'night.pz.music.hint' : 'night.pz.music.no', miss >= 2 ? 'hint' : '');
      if (miss >= 5) { setTimeout(finish, 600); return; } setTimeout(play, 800);
    }));
    f.el.querySelector('.pz-again')!.addEventListener('click', () => { if (!busy && !done) play(); });
    setTimeout(play, 700);
  });
}

export function candles(): Promise<void> {
  return new Promise(resolve => {
    const on = Array(9).fill(true); const sol = new Set([0, 4, 8]); // scrambled by tapping the diagonal -> tapping it again solves
    const flip = (i: number) => { const r = Math.floor(i / 3), c = i % 3; for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 3 && cc >= 0 && cc < 3) on[rr * 3 + cc] = !on[rr * 3 + cc]; } };
    sol.forEach(flip);
    const FLAME = ['..y..', '.yoy.', '.yoy.', '..o..'], CAN = ['wwwww', 'wwwww', 'wwwww', 'wwwww', 'wwwww', 'ddddd'];
    const f = frame('pz-candles', `
      <p class="pz-q" data-i18n="night.pz.candles"></p>
      <div class="pz-slab">${on.map((_, i) => `<button type="button" class="pz-c" data-i="${i}" aria-label="${i + 1}"><span class="pz-fl">${pix(FLAME, { y: '#ffd45c', o: '#ff9a3c' })}</span>${pix(CAN, { w: '#efe6d2', d: '#b9ab92' })}</button>`).join('')}</div>`);
    const btns = [...f.el.querySelectorAll<HTMLButtonElement>('.pz-c')];
    const sync = () => btns.forEach((b, i) => b.classList.toggle('on', on[i]));
    sync(); let taps = 0, done = false, hinted = false;
    const finish = () => { if (done) return; done = true; on.fill(true); sync(); f.el.classList.add('solved'); f.say('night.pz.candles.ok', 'ok'); pzSfx.ok(); setTimeout(() => void f.close().then(resolve), 1400); };
    btns.forEach((b, i) => b.addEventListener('click', () => {
      if (done) return; flip(i); if (sol.has(i)) sol.delete(i); else sol.add(i); taps++; pzSfx.whoosh(on[i]); sync();
      btns.forEach(x => x.classList.remove('hint'));
      if (on.every(Boolean)) { finish(); return; }
      if (taps >= 6) { if (!hinted) { hinted = true; f.say('night.pz.candles.hint', 'hint'); } const nx = [...sol][0]; if (nx !== undefined) btns[nx].classList.add('hint'); }
      if (taps >= 22) setTimeout(finish, 500);
    }));
  });
}

/** 4 wheels (0-9). `have` = which of the 4 digits the collected notes show. */
export function codeLock(have: boolean[]): Promise<void> {
  return new Promise(resolve => {
    const CODE = [0, 5, 0, 3];
    const notes = CODE.map((d, i) => `<i class="${have[i] ? 'got' : ''}">${have[i] ? d : '?'}</i>`).join('');
    const f = frame('pz-code', `
      <div class="pz-lock">${pix(LOCK, LOCK_PAL)}</div>
      <div class="pz-board">
        <p class="pz-q" data-i18n="night.pz.code"></p>
        <div class="pz-notes" aria-hidden="true">${notes}</div>
        <div class="pz-digits">${CODE.map((_, i) => `<span class="pz-wheel" data-i="${i}"><button type="button" class="pz-up" data-i18n-aria="night.pz.up"><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></button><b class="pz-d">0</b><button type="button" class="pz-dn" data-i18n-aria="night.pz.down"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button></span>`).join('')}</div>
        <button type="button" class="pz-open" data-i18n="night.pz.open"></button>
      </div>`);
    const v = [0, 0, 0, 0]; const ds = [...f.el.querySelectorAll<HTMLElement>('.pz-d')];
    const sync = () => ds.forEach((d, i) => { d.textContent = String(v[i]); });
    let miss = 0, done = false;
    f.el.querySelectorAll<HTMLElement>('.pz-wheel').forEach((w, i) => {
      const step = (s: number) => { if (done) return; v[i] = (v[i] + s + 10) % 10; sync(); w.classList.remove('tick'); void w.offsetWidth; w.classList.add('tick'); pzSfx.tap(0); };
      w.querySelector('.pz-up')!.addEventListener('click', () => step(1)); w.querySelector('.pz-dn')!.addEventListener('click', () => step(-1));
      w.addEventListener('wheel', e => { e.preventDefault(); step(e.deltaY < 0 ? 1 : -1); }, { passive: false });
    });
    const finish = (auto: boolean) => { if (done) return; done = true; CODE.forEach((d, i) => { v[i] = d; }); sync(); f.el.classList.add('solved');
      f.say(auto ? 'night.pz.code.auto' : 'night.pz.code.ok', 'ok'); pzSfx.click(); setTimeout(() => pzSfx.ok(), 160); setTimeout(() => void f.close().then(resolve), 1600); };
    const check = () => {
      if (done) return;
      if (v.every((d, i) => d === CODE[i])) { finish(false); return; }
      miss++; pzSfx.click(); setTimeout(() => pzSfx.nope(), 90); shake(f.el.querySelector('.pz-lock')!);
      f.say(miss >= 5 ? 'night.pz.code.hint3' : miss >= 3 ? 'night.pz.code.hint2' : miss >= 2 ? 'night.pz.code.hint' : 'night.pz.code.no', miss >= 2 ? 'hint' : '');
      if (miss >= 5) { v[0] = 0; v[1] = 5; sync(); }
      if (miss >= 7) setTimeout(() => finish(true), 900);
    };
    f.el.querySelector('.pz-open')!.addEventListener('click', check);
    window.addEventListener('keydown', function k(e) { if (done) { window.removeEventListener('keydown', k); return; } if (e.key === 'Enter') check(); });
  });
}

/** a found item: a quick card (tap anywhere / 2.6 s) */
export function foundCard(titleKey: string, body: string): Promise<void> {
  return new Promise(resolve => {
    const f = frame('pz-found', `<p class="pz-q" data-i18n="${titleKey}"></p><div class="pz-paper">${body}</div><p class="pz-tap" data-i18n="night.tap"></p>`);
    let gone = false; const close = () => { if (gone) return; gone = true; void f.close().then(resolve); };
    pzSfx.ok(); setTimeout(() => f.el.addEventListener('click', close), 350); setTimeout(close, 3400);
  });
}
