// v03h: the 200-day hand-drawn film, tucked into the sky stage — she is looking at that night's stars,
// and can watch the film of the two hundred days that led here. Tap-to-play, playsinline, respects the
// shared sound toggle; poster until she taps.
import { asset } from '../../shared/flow';
import { soundOn, unlock, onSound } from '../../shared/audio';
import { apply } from '../../shared/i18n';
import { tap } from '../../shared/sfx';

let open = false;
export function openCinema() {
  if (open) return; open = true;
  unlock();
  const root = document.createElement('div');
  root.className = 'sk-cinema'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
  root.innerHTML = `
    <button type="button" class="sk-cx" data-a="close" aria-label="Close">×</button>
    <div class="sk-cstage">
      <video class="sk-cv" playsinline webkit-playsinline preload="metadata"
        poster="${asset('media/anniv-200-poster.jpg')}"
        src="${asset('media/anniv-200.mp4')}"></video>
      <button type="button" class="sk-cplay" data-a="play"><span data-i18n="sky.film.play"></span></button>
    </div>
    <p class="sk-ccap" data-i18n="sky.film.cap"></p>`;
  document.body.appendChild(root); apply(root);
  const v = root.querySelector('video')!;
  const playBtn = root.querySelector<HTMLButtonElement>('[data-a="play"]')!;
  const syncMute = () => { v.muted = !soundOn(); };
  syncMute(); onSound(syncMute);
  const play = async () => {
    unlock(); syncMute();
    try { await v.play(); playBtn.classList.add('off'); } catch { /* stay on poster */ }
  };
  playBtn.addEventListener('click', play);
  v.addEventListener('click', () => { if (v.paused) void play(); else v.pause(); });
  v.addEventListener('pause', () => playBtn.classList.remove('off'));
  v.addEventListener('play', () => playBtn.classList.add('off'));
  const close = () => {
    tap(); v.pause(); root.classList.add('out');
    setTimeout(() => { root.remove(); open = false; }, 420);
  };
  root.querySelector('[data-a="close"]')!.addEventListener('click', close);
  root.addEventListener('click', (e) => { if (e.target === root) close(); });
  addEventListener('keydown', function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { close(); removeEventListener('keydown', onKey); } });
  requestAnimationFrame(() => root.classList.add('on'));
}
