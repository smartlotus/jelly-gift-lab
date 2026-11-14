// Cloudflare Pages Function (only used by the Cloudflare build; GitHub Pages ignores this folder).
// Pages' static asset server answers Range requests with a full 200, which breaks seeking and iOS playback of the
// ending film. For Range requests on media files this streams just the asked-for bytes back as 206; everything else
// passes straight through to the static assets.
import SIZES from './sizes.json'; // written by scripts/build_cloudflare.sh (byte sizes of dist-cf/media/*)

export async function onRequestGet({ request, env }) {
  const range = request.headers.get('Range');
  if (!range || !/\.(mp4|webm|m4a|mp3)$/i.test(new URL(request.url).pathname)) return env.ASSETS.fetch(request);
  const res = await env.ASSETS.fetch(new Request(request.url, { headers: { 'Accept-Encoding': 'identity' } }));
  if (res.status !== 200) return res;
  const name = decodeURIComponent(new URL(request.url).pathname.replace(/^\/media\//, ''));
  const size = Number(res.headers.get('Content-Length')) || SIZES[name] || 0;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!m || !size) return res;
  let start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  let end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start >= size || start > end) {
    res.body?.cancel();
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  const want = end - start + 1;
  let pos = 0, sent = 0;
  const reader = res.body.getReader();
  const body = new ReadableStream({
    async pull(ctl) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) { ctl.close(); return; }
        const a = Math.max(0, start - pos), chunkEnd = pos + value.length; pos = chunkEnd;
        if (a >= value.length) continue;
        const piece = value.subarray(a, Math.min(value.length, a + (want - sent)));
        sent += piece.length; ctl.enqueue(piece);
        if (sent >= want) { ctl.close(); reader.cancel(); }
        return;
      }
    },
    cancel() { reader.cancel(); },
  });
  const h = new Headers(res.headers);
  h.set('Content-Range', `bytes ${start}-${end}/${size}`); h.set('Content-Length', String(want)); h.set('Accept-Ranges', 'bytes');
  return new Response(body, { status: 206, headers: h });
}
