// Tiny static server for dist/ (correct MIME types, gzip-free) used by the self-check.
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(process.argv[2] || 'dist'); const port = +(process.argv[3] || 8800);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.bin': 'application/octet-stream', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.txt': 'text/plain', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.usdz': 'model/vnd.usdz+zip' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  // like GitHub Pages: /shop -> /shop/ (relative asset URLs need the trailing slash)
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) { res.writeHead(301, { location: p + '/' }); return res.end(); }
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  const st = fs.statSync(f);
  const type = types[path.extname(f)] || 'application/octet-stream';
  // Range support: <video> only exposes a seekable timeline when the host answers 206 (GitHub Pages does;
  // this server has to, otherwise the 200-day film cannot be scrubbed or resumed in local preview).
  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m) {
      const start = m[1] ? +m[1] : Math.max(0, st.size - (+m[2] || 0));
      const end = m[2] && m[1] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      if (start <= end && start < st.size) {
        res.writeHead(206, {
          'content-type': type, 'accept-ranges': 'bytes',
          'content-range': `bytes ${start}-${end}/${st.size}`,
          'content-length': end - start + 1, 'cache-control': 'no-cache',
        });
        fs.createReadStream(f, { start, end }).pipe(res);
        return;
      }
    }
  }
  res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': st.size, 'cache-control': 'no-cache' });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('serving', root, 'on', port));
