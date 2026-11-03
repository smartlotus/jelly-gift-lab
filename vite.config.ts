import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { DICT } from './src/i18n/dict.ts';
import { en as sharedEn } from './src/shared/dict.ts';
import { en as meadowEn } from './src/stages/meadow/dict.ts';
import { en as shopEn } from './src/stages/shop/dict.ts';
import { en as nightEn } from './src/stages/night/dict.ts';
import { en as skyEn } from './src/stages/sky/dict.ts';
import { en as arEn } from './src/stages/ar/dict.ts';
import { en as coopEn } from './src/stages/coop/dict.ts';
// Multi-page app = the gift journey (docs/GIFT_PLAN.md):
//   /         stage 1 meadow   (index.html)        /shop/   stage 2 shop
//   /night/   stage 3 night                         /jelly/  stage 4 jelly studies (+ mushroom egg)
// Static <title> placeholders %T:key% come from the English dictionaries (JS swaps them per language at runtime).
const EN: Record<string, string> = { ...DICT.en, ...sharedEn, ...meadowEn, ...shopEn, ...nightEn, ...skyEn, ...arEn, ...coopEn };
const i18nHtml = () => ({ name: 'i18n-html', transformIndexHtml: (html: string) => html.replace(/%T:([\w.-]+)%/g, (_, k) => EN[k] ?? k) });
const page = (p: string) => resolve(import.meta.dirname, p);
export default defineConfig({
  base: './',
  plugins: [i18nHtml()],
  build: {
    target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 800,
    rollupOptions: { input: { meadow: page('index.html'), shop: page('shop/index.html'), night: page('night/index.html'), jelly: page('jelly/index.html'), sky: page('sky/index.html'), ar: page('ar/index.html'), coop: page('coop/index.html') } },
  },
  worker: { format: 'iife' },
  server: { host: true },
});
