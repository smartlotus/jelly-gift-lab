import { chromium } from '/workspace/jelly/pw/node_modules/playwright/index.mjs';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const LOCAL = 'http://127.0.0.1:8833';
const OUT = '/workspace/review/v03m';
const OUT2 = '/workspace/jelly/jelly-gift-story/review/v03m/clips';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(OUT2, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

async function clip(name, url, { w = 1280, h = 720, seconds = 6, setup } = {}) {
  const tmpDir = `/tmp/vid-${name}`;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    recordVideo: { dir: tmpDir, size: { width: w, height: h } },
  });
  const page = await context.newPage();
  const u = url.includes('?') ? `${url}&lang=zh` : `${url}?lang=zh`;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try { await page.goto(u, { waitUntil: 'networkidle', timeout: 60000 }); }
  catch { try { await page.goto(u, { waitUntil: 'load', timeout: 60000 }); } catch (e) { errors.push(String(e)); } }
  await page.waitForTimeout(700);
  if (setup) await setup(page).catch(e => errors.push(String(e)));
  await page.waitForTimeout(seconds * 1000);
  const raw = await page.video()?.path();
  await page.close();
  await context.close();
  if (!raw || !fs.existsSync(raw)) {
    console.log('NO VIDEO', name, errors[0] || '');
    return;
  }
  const dest = path.join(OUT, `${name}.mp4`);
  const r = spawnSync('ffmpeg', ['-y', '-i', raw, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-an', '-movflags', '+faststart', dest], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.log('ffmpeg fail', name, r.stderr.slice(-400));
    const webm = path.join(OUT, `${name}.webm`);
    fs.copyFileSync(raw, webm);
    console.log('saved webm fallback', name, fs.statSync(webm).size);
    return;
  }
  fs.copyFileSync(dest, path.join(OUT2, `${name}.mp4`));
  console.log('clip', name, `${w}x${h}`, `${seconds}s`, Math.round(fs.statSync(dest).size / 1024) + 'KB', errors[0] || 'ok');
}

const wanderAuto = async () => {};
const homeSeek = (id, tt) => async (page) => {
  await page.evaluate(({ id, tt }) => window.__home?.seek(id, tt), { id, tt });
  await page.waitForTimeout(200);
};

await clip('clip-flower-desktop', `${LOCAL}/flower/?auto`, { seconds: 7 });
await clip('clip-mushroom-desktop', `${LOCAL}/mushroom/?auto`, { seconds: 7 });
await clip('clip-flower-portrait', `${LOCAL}/flower/?auto`, { w: 390, h: 844, seconds: 6 });
await clip('clip-mushroom-portrait', `${LOCAL}/mushroom/?auto`, { w: 390, h: 844, seconds: 6 });
await clip('clip-home-walk', `${LOCAL}/home/?at=walk`, { seconds: 6.4, setup: homeSeek('walk', 0.45) });
await clip('clip-home-greet', `${LOCAL}/home/?at=greet&furnish`, { seconds: 5.2, setup: homeSeek('greet', 0.35) });
await clip('clip-home-sofa', `${LOCAL}/home/?at=sofa&furnish`, { seconds: 4.6, setup: homeSeek('sofa', 0.4) });
await clip('clip-home-sleep', `${LOCAL}/home/?at=sleep`, { seconds: 4.6, setup: homeSeek('sleep', 0.4) });
await clip('clip-home-snow', `${LOCAL}/home/?at=snow`, { seconds: 5.2, setup: homeSeek('snow', 0.5) });
await clip('clip-home-dawn', `${LOCAL}/home/?at=dawn`, { seconds: 5.6, setup: homeSeek('dawn', 1.2) });

await browser.close();
console.log('CLIPS DONE');
console.log(fs.readdirSync(OUT).filter(f => f.startsWith('clip-')).map(f => `${f} ${Math.round(fs.statSync(path.join(OUT, f)).size/1024)}KB`).join('\n'));
