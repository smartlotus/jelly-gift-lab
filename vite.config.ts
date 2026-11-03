import { defineConfig } from 'vite';
import { DICT } from './src/i18n/dict';
// static <title>/<meta description> come from the English dictionary (JS swaps them per language at runtime)
const i18nHtml = () => ({ name: 'i18n-html', transformIndexHtml: (html: string) => html.replace(/%T:([\w.]+)%/g, (_, k) => (DICT.en as Record<string, string>)[k] ?? k) });
export default defineConfig({
  base: './',
  plugins: [i18nHtml()],
  build: { target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 800 },
  worker: { format: 'iife' },
  server: { host: true },
});
