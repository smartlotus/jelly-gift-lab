// Stage 2 DOM layer: the proximity card (editorial caption next to an exhibit) and the inspect-mode chrome
// (title block, colour swatches, hairline buttons). Same typography as the jelly page (shared/chrome.css tokens).
import { t, lang, onLang } from '../../shared/i18n';
import { AR_ICON, isArId, quickLook, openQuickLook } from '../../shared/ar';
import { go } from '../../shared/flow';
import { dissolve } from '../../shared/transition';
import { EXHIBITS, colourOf, type Exhibit, type ExhibitId } from './exhibits';
import type { Viewer, Rect } from './viewer';
// v02: the AR button is part of the journey: on every device for the three printed figures. iOS -> AR Quick Look on the
// spot; elsewhere the paper dissolves into /ar/ (same model, centred; WebXR there if the phone has it) and comes back here.
const AR_PAPER = '#eeece8';

const coarse = matchMedia('(pointer: coarse)').matches;
const ex = (id: ExhibitId) => EXHIBITS.find(e => e.id === id)!;

/** Near an exhibit: one quiet round eye button (desktop; on touch the pad's eye button does this). No copy - the model speaks. */
export class Card {
  readonly el = document.createElement('button');
  private cur: Exhibit | null = null;
  onLook: (id: ExhibitId) => void = () => {};
  constructor() {
    this.el.type = 'button'; this.el.className = 'shop-card';
    this.el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="12" r="3.2"/><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/></svg>`;
    if (!coarse) document.body.appendChild(this.el);
    this.el.addEventListener('click', () => { if (this.cur) this.onLook(this.cur.id); });
    const label = () => this.el.setAttribute('aria-label', t('shop.look')); label(); onLang(label);
  }
  show(e: Exhibit | null) {
    if (e === this.cur) return;
    this.cur = e; this.el.classList.toggle('on', !!e);
  }
  /** a = exhibit rect (css px): sit just above the model */
  place(a: Rect, _stage: DOMRect) {
    if (!this.cur) return;
    const s = 40, x = a.x + a.w / 2 - s / 2, y = Math.max(64, a.y - s - 2);
    this.el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  }
}

export class Inspect {
  readonly el = document.createElement('section');
  readonly backdrop = document.createElement('div');
  private id: ExhibitId = 'figure-pig';
  onClose: () => void = () => {};
  constructor(private v: Viewer) {
    this.backdrop.className = 'shop-backdrop'; document.body.appendChild(this.backdrop);
    const el = this.el; el.className = 'shop-inspect'; el.setAttribute('aria-modal', 'true'); el.setAttribute('role', 'dialog');
    el.innerHTML = `
      <button type="button" class="si-close" data-i18n-aria="shop.i.close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <footer class="si-foot">
        <div class="si-swatches" role="group" data-i18n-aria="shop.i.colours"></div>
        <nav class="si-bar">
          <button type="button" class="si-prev" data-i18n-aria="shop.i.prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M15 5l-7 7 7 7"/></svg></button>
          <button type="button" class="si-btn" data-k="reset"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4v3.5H8"/></svg></button>
          <button type="button" class="si-btn" data-k="split" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><rect x="14" y="14" width="6.5" height="6.5" rx="1"/></svg></button>
          <button type="button" class="si-btn" data-k="spin" aria-pressed="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="8.5" ry="3.6"/><path d="M15.5 6.6l2.6 1.9-2.4 2"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/></svg></button>
          <button type="button" class="si-btn si-light" data-k="light"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.6"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/></svg><i></i></button>
          <button type="button" class="si-btn si-ar" data-k="ar" hidden>${AR_ICON}</button>
          <button type="button" class="si-next" data-i18n-aria="shop.i.next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M9 5l7 7-7 7"/></svg></button>
        </nav>
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
      else if (b.dataset.k === 'light') v.cycleMood();
      else if (b.dataset.k === 'ar' && isArId(this.id)) { b.classList.remove('suggest'); if (quickLook()) openQuickLook(this.id); else { const id = this.id; void go('ar', () => dissolve(1, 650, AR_PAPER), { m: id }); } }
      else if (b.dataset.sw !== undefined) v.solo(b.dataset.sw || null);
    });
    window.addEventListener('keydown', e => {
      if (!this.open) return;
      if (e.code === 'Escape' || e.code === 'KeyX' || e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Backspace') { e.preventDefault(); this.onClose(); }
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.browse(-1);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.browse(1);
      else if (e.code === 'KeyR') v.reset();
      else if (e.code === 'KeyL') v.cycleMood();
      else if (e.code === 'KeyS' || e.code === 'Space') { e.preventDefault(); v.toggleSplit(); }
    });
    v.onChange = () => this.sync();
    onLang(() => { this.fill(); this.sync(); });
    v.inspectRect = () => this.rect();
  }
  open = false; static hinted = false;
  private rect(): Rect {
    const foot = this.el.querySelector<HTMLElement>('.si-foot')!.getBoundingClientRect();
    const top = Math.max(64, innerHeight * 0.08), bottom = foot.top - 6;
    return { x: 0, y: top, w: innerWidth, h: Math.max(120, bottom - top) };
  }
  show(id: ExhibitId) {
    this.id = id; this.open = true; this.fill(); this.sync();
    // featured once per visit: the first figure she opens gently points at its AR button (two soft rings)
    if (isArId(id) && !Inspect.hinted) { Inspect.hinted = true; const b = this.el.querySelector<HTMLElement>('[data-k="ar"]')!; setTimeout(() => { if (this.open && this.id === id) b.classList.add('suggest'); }, 1400); }
    this.el.classList.add('on'); this.backdrop.classList.add('on'); document.body.classList.add('shop-inspecting');
  }
  hide() { this.open = false; this.el.classList.remove('on'); this.backdrop.classList.remove('on'); document.body.classList.remove('shop-inspecting'); }
  private browse(d: number) {
    const i = EXHIBITS.findIndex(e => e.id === this.id), n = EXHIBITS[(i + d + EXHIBITS.length) % EXHIBITS.length];
    this.id = n.id; this.fill(); this.el.querySelector('.si-swatches')!.innerHTML = '';
    void this.v.show(n.id).then(() => this.sync());
  }
  get current() { return this.id; }
  private fill() {
    // icon-only controls: words live in aria-labels / tooltips only
    this.el.querySelectorAll<HTMLButtonElement>('.si-btn').forEach(b => {
      const k = b.dataset.k!, l = k === 'ar' ? t('shop.i.ar') : k === 'light' ? t(`shop.i.light${this.v.mood}`) : k === 'split' && this.id === 'pair' ? t('shop.i.split.pair') : t(`shop.i.${k}`);
      b.setAttribute('aria-label', l); b.title = l;
    });
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
    this.el.querySelector('[data-k="split"]')!.setAttribute('aria-pressed', String(v.split()));
    this.el.querySelector('[data-k="spin"]')!.setAttribute('aria-pressed', String(v.autoSpin));
    this.el.querySelector<HTMLButtonElement>('[data-k="ar"]')!.hidden = !isArId(this.id);
    const lb = this.el.querySelector<HTMLElement>('[data-k="light"]')!; lb.dataset.mood = String(v.mood); this.fill();
  }
}
