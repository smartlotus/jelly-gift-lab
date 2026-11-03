// QR in and out, all bundled (no CDN): qrcode-generator draws, BarcodeDetector (Android Chrome) or jsQR (iOS / WeChat /
// everything else) reads from the camera.
import qrcode from 'qrcode-generator';
import jsQR from 'jsqr';

/** crisp QR on a canvas (module = n device px), soft-black on cream */
export function qrCanvas(text: string, px = 6, fg = '#2E2A2B', bg = '#FFF8EE'): HTMLCanvasElement {
  const q = qrcode(0, 'L'); q.addData(text, 'Byte'); q.make();
  const n = q.getModuleCount(), m = 3, c = document.createElement('canvas'); c.width = c.height = (n + m * 2) * px;
  const g = c.getContext('2d')!; g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg;
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + m) * px, (r + m) * px, px, px);
  return c;
}

type BD = { detect(s: CanvasImageSource): Promise<{ rawValue: string }[]> };
/** open the rear camera inside `host`, resolve with the first QR text that passes `accept`. stop() closes it. */
export function scan(host: HTMLElement, accept: (s: string) => boolean): { done: Promise<string>; stop: () => void } {
  const video = document.createElement('video'); video.playsInline = true; video.muted = true; video.setAttribute('playsinline', ''); host.appendChild(video);
  const cv = document.createElement('canvas'), g = cv.getContext('2d', { willReadFrequently: true })!;
  let stream: MediaStream | null = null, alive = true, raf = 0;
  const stop = () => { alive = false; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); video.remove(); };
  const W = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BD };
  const det: BD | null = W.BarcodeDetector ? (() => { try { return new W.BarcodeDetector!({ formats: ['qr_code'] }); } catch { return null; } })() : null;
  const done = new Promise<string>((res, rej) => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false }).then(s => {
      stream = s; if (!alive) { stop(); return; } video.srcObject = s; void video.play();
      let busy = false;
      const tick = async () => {
        if (!alive) return; raf = requestAnimationFrame(() => void tick());
        if (busy || video.readyState < 2) return; busy = true;
        try {
          let txt: string | null = null;
          if (det) { const r = await det.detect(video); txt = r[0]?.rawValue ?? null; }
          else {
            const w = Math.min(720, video.videoWidth), h = Math.round(w * video.videoHeight / video.videoWidth); cv.width = w; cv.height = h;
            g.drawImage(video, 0, 0, w, h); txt = jsQR(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })?.data ?? null;
          }
          if (txt && accept(txt)) { stop(); res(txt); }
        } catch { /* keep trying */ } finally { busy = false; }
      };
      void tick();
    }).catch(e => { stop(); rej(e); }) ?? rej(new Error('no camera'));
  });
  return { done, stop };
}
