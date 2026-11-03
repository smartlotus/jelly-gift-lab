// Stage 2 DOM layer: the proximity card (editorial caption next to an exhibit) and the inspect-mode chrome
// (title block, colour swatches, hairline buttons). Same typography as the jelly page (shared/chrome.css tokens).
import { t, lang, onLang } from '../../shared/i18n';
import { EXHIBITS, colourOf, type Exhibit, type ExhibitId } from './exhibits';
import type { Viewer, Rect } from './viewer';

const coarse = matchMedia('(pointer: coarse)').matches;
const ex = (id: ExhibitId) => EXHIBITS.find(e => e.id === id)!;
const meta = (e: Exhibit) => `${t(`shop.kind.${e.kind}`)} · ${e.size} mm · ${t('shop.parts', { n: e.parts })}`;

export class Card {
  readonly el = document.createElement('aside');
  private cur: Exhibit | null = null;
  onLook: (id: ExhibitId) => void = () => {};
  constructor() {
    this.el.className = 'shop-card'; this.el.setAttribute('aria-live', 'polite');
    this.el.innerHTML = `<p class="sc-no"></p><h2 class="sc-title"></h2><p class="sc-note"></p><p class="sc-meta"></p>
      <button type="button" class="sc-look"><span></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>`;
    document.body.appendChild(this.el);
    this.el.querySelector('.sc-look')!.addEventListener('click', () => { if (this.cur) this.onLook(this.cur.id); });
    onLang(() => this.fill());
  }
  private fill() {
    const e = this.cur; if (!e) return; const q = (s: string) => this.el.querySelector(s)!;
    q('.sc-no').textContent = `No. ${e.no}`; q('.sc-title').textContent = t(`shop.ex.${e.id}`);
    q('.sc-note').textContent = t(`shop.note.${e.id}`); q('.sc-meta').textContent = meta(e);
    q('.sc-look span').textContent = t('shop.look') + (coarse ? '' : '  ·  E');
  }
  show(e: Exhibit | null) {
    if (e === this.cur) return;
    if (!e) { this.el.classList.remove('on'); this.cur = null; return; }
    this.cur = e; this.fill(); this.el.classList.remove('on'); void this.el.offsetWidth; this.el.classList.add('on');
  }
  /** a = exhibit rect (css px), stage = pixel canvas rect */
  place(a: Rect, stage: DOMRect) {
    if (!this.cur) return;
    const w = this.el.offsetWidth, h = this.el.offsetHeight, below = innerHeight - stage.bottom;
    let x: number, y: number;
    if (below > h + 120 || innerWidth < 560) { x = innerWidth / 2 - w / 2; y = Math.min(stage.bottom + 18, innerHeight - h - (coarse ? 128 : 24)); this.el.dataset.mode = 'below'; }
    else {
      this.el.dataset.mode = 'side';
      x = a.x + a.w + 10; if (x + w > innerWidth - 16) x = a.x - w - 10;
      y = Math.max(64, Math.min(a.y + a.h / 2 - h / 2 - 10, innerHeight - h - (coarse ? 120 : 24)));
    }
    this.el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  }
}

export class Inspect {
  readonly el = document.createElement('section');
  readonly backdrop = document.createElement('div');
  private id: ExhibitId = 'figure-pig';
  private hintT = 0;
  onClose: () => void = () => {};
  constructor(private v: Viewer) {
    this.backdrop.className = 'shop-backdrop'; document.body.appendChild(this.backdrop);
    const el = this.el; el.className = 'shop-inspect'; el.setAttribute('aria-modal', 'true'); el.setAttribute('role', 'dialog');
    el.innerHTML = `
      <header class="si-head"><p class="si-no"></p><h2 class="si-title"></h2><p class="si-note"></p><p class="si-meta"></p></header>
      <button type="button" class="si-close" data-i18n-aria="shop.i.close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <footer class="si-foot">
        <p class="si-swname"></p>
        <div class="si-swatches" role="group" data-i18n-aria="shop.i.colours"></div>
        <nav class="si-bar">
          <button type="button" class="si-prev" data-i18n-aria="shop.i.prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M15 5l-7 7 7 7"/></svg></button>
          <button type="button" class="si-btn" data-k="reset"></button>
          <button type="button" class="si-btn" data-k="split" aria-pressed="false"></button>
          <button type="button" class="si-btn" data-k="spin" aria-pressed="true"></button>
          <button type="button" class="si-next" data-i18n-aria="shop.i.next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M9 5l7 7-7 7"/></svg></button>
        </nav>
        <p class="si-hint"></p>
      </footer>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('button'); if (!b) return;
      if (b.classList.contains('si-close')) this.onClose();
      else if (b.classList.contains('si-prev')) this.browse(-1);
      else if (b.classList.contains('si-next')) this.browse(1);
      else if (b.dataset.k === 'reset') v.reset();
      else if (b.dataset.k === 'split') v.toggleSplit();
      else if (b.dataset.k === 'spin') { v.autoSpin = !v.autoSpin; this.sync(); }
      else if (b.dataset.sw !== undefined) v.solo(b.dataset.sw || null);
    });
    // hovering a swatch previews its name (desktop)
    el.addEventListener('pointerover', e => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-sw]'); if (b) this.swName(b.dataset.sw || null); });
    el.addEventListener('pointerout', e => { if ((e.target as HTMLElement).closest('[data-sw]')) this.swName(v.soloKey()); });
    window.addEventListener('keydown', e => {
      if (!this.open) return;
      if (e.code === 'Escape' || e.code === 'KeyX' || e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Backspace') { e.preventDefault(); this.onClose(); }
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.browse(-1);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.browse(1);
      else if (e.code === 'KeyR') v.reset();
      else if (e.code === 'KeyS' || e.code === 'Space') { e.preventDefault(); v.toggleSplit(); }
    });
    v.onChange = () => this.sync();
    onLang(() => { this.fill(); this.sync(); });
    v.inspectRect = () => this.rect();
  }
  open = false;
  private rect(): Rect {
    const head = this.el.querySelector<HTMLElement>('.si-head')!.getBoundingClientRect(), foot = this.el.querySelector<HTMLElement>('.si-foot')!.getBoundingClientRect();
    const portrait = innerHeight > innerWidth * 1.05;
    const top = portrait ? head.bottom + 4 : Math.max(16, innerHeight * 0.05), bottom = foot.top - 6;
    return { x: 0, y: top, w: innerWidth, h: Math.max(120, bottom - top) };
  }
  show(id: ExhibitId) {
    this.id = id; this.open = true; this.fill(); this.sync();
    this.el.classList.add('on'); this.backdrop.classList.add('on'); document.body.classList.add('shop-inspecting');
    const hint = this.el.querySelector<HTMLElement>('.si-hint')!; hint.classList.add('on'); clearTimeout(this.hintT);
    this.hintT = window.setTimeout(() => hint.classList.remove('on'), 5200);
  }
  hide() { this.open = false; this.el.classList.remove('on'); this.backdrop.classList.remove('on'); document.body.classList.remove('shop-inspecting'); }
  private browse(d: number) {
    const i = EXHIBITS.findIndex(e => e.id === this.id), n = EXHIBITS[(i + d + EXHIBITS.length) % EXHIBITS.length];
    this.id = n.id; this.fill(); this.el.querySelector('.si-swatches')!.innerHTML = '';
    void this.v.show(n.id).then(() => this.sync());
  }
  get current() { return this.id; }
  private fill() {
    const e = ex(this.id), q = (s: string) => this.el.querySelector(s)!;
    q('.si-no').innerHTML = `No. ${e.no} <span>/ 0${EXHIBITS.length}</span>`; q('.si-title').textContent = t(`shop.ex.${e.id}`);
    q('.si-note').textContent = t(`shop.note.${e.id}`); q('.si-meta').textContent = `${meta(e)} · ${t('shop.mat')}`;
    q('.si-hint').textContent = t(coarse ? 'shop.i.hint.touch' : 'shop.i.hint.mouse');
    this.el.querySelectorAll<HTMLButtonElement>('.si-btn').forEach(b => { b.textContent = t(`shop.i.${b.dataset.k}`); });
  }
  private swName(key: string | null) {
    const n = this.el.querySelector('.si-swname')!;
    n.textContent = key ? colourOf(this.id, key)[lang] + '  ' + colourOf(this.id, key).hex : t('shop.i.colours');
  }
  sync() {
    const v = this.v, sw = this.el.querySelector<HTMLElement>('.si-swatches')!;
    const keys = v.partKeys(this.id);
    if (sw.childElementCount !== keys.length + 1) {
      sw.innerHTML = `<button type="button" class="si-sw si-all" data-sw="" aria-label="${t('shop.i.all')}"></button>` +
        keys.map(k => { const c = colourOf(this.id, k); return `<button type="button" class="si-sw" data-sw="${k}" style="--c:${c.hex}" aria-label="${c[lang]}"></button>`; }).join('');
    }
    const solo = v.soloKey();
    sw.querySelectorAll<HTMLButtonElement>('[data-sw]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.sw || null) === solo)));
    this.swName(solo);
    this.el.querySelector('[data-k="split"]')!.setAttribute('aria-pressed', String(v.split()));
    this.el.querySelector('[data-k="spin"]')!.setAttribute('aria-pressed', String(v.autoSpin));
  }
}
