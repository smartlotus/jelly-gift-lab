import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync, statSync } from 'node:fs';
import { DICT } from './src/i18n/dict.ts';
import { en as sharedEn } from './src/shared/dict.ts';
import { en as meadowEn } from './src/stages/meadow/dict.ts';
import { en as shopEn } from './src/stages/shop/dict.ts';
import { en as nightEn } from './src/stages/night/dict.ts';
import { en as skyEn } from './src/stages/sky/dict.ts';
import { en as arEn } from './src/stages/ar/dict.ts';
import { en as coopEn } from './src/stages/coop/dict.ts';
import { en as seaEn } from './src/stages/sea/dict.ts';
import { en as flowerEn } from './src/stages/flower/dict.ts';
import { en as mushroomEn } from './src/stages/mushroom/dict.ts';
import { en as homeEn } from './src/stages/home/dict.ts';
import { en as surpriseEn } from './src/shared/surprise/dict.ts';
// Multi-page app = the gift journey (docs/GIFT_PLAN.md):
//   /         stage 1 meadow   (index.html)        /shop/   stage 2 shop
//   /night/   stage 3 night                         /jelly/  stage 4 jelly studies (+ mushroom egg)
// Static <title> placeholders %T:key% come from the English dictionaries (JS swaps them per language at runtime).
const EN: Record<string, string> = { ...DICT.en, ...sharedEn, ...meadowEn, ...shopEn, ...nightEn, ...skyEn, ...arEn, ...coopEn, ...seaEn, ...flowerEn, ...mushroomEn, ...homeEn, ...surpriseEn };
const i18nHtml = () => ({ name: 'i18n-html', transformIndexHtml: (html: string) => html.replace(/%T:([\w.-]+)%/g, (_, k) => EN[k] ?? k) });
import { curtainMarkup } from './src/shared/curtain-inline.ts';
// v03e: the loading curtain is inlined right after <body> on every page (first paint, before any CSS/JS loads)
const curtain = () => ({ name: 'gift-curtain', transformIndexHtml: (html: string) => html.replace(/<body([^>]*)>/, (m) => m + curtainMarkup()) });
const page = (p: string) => resolve(import.meta.dirname, p);
// decoded byte sizes of the jelly page's tet-mesh assets (progress bar; see src/shared/jellyAsset.ts)
const jellySizes: Record<string, number> = {};
for (const id of readdirSync(page('public/jelly/assets'))) for (const f of readdirSync(page(`public/jelly/assets/${id}`)))
  if (f.endsWith('.bin')) jellySizes[`${id}/${f.slice(0, -4)}`] = statSync(page(`public/jelly/assets/${id}/${f}`)).size;
process.env.VITE_JELLY_SIZES = JSON.stringify(jellySizes);
export default defineConfig({
  base: './',
  plugins: [i18nHtml(), curtain()],
  build: {
    target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 800,
    rollupOptions: { input: { meadow: page('index.html'), flower: page('flower/index.html'), mushroom: page('mushroom/index.html'), shop: page('shop/index.html'), night: page('night/index.html'), jelly: page('jelly/index.html'), sky: page('sky/index.html'), ar: page('ar/index.html'), coop: page('coop/index.html'), sea: page('sea/index.html'), home: page('home/index.html'), secret: page('secret/index.html') } }, // secret = lab placeholder (SECRET_PAGE)
  },
  worker: { format: 'iife' },
  server: { host: true },
});
