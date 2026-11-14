// Dump every user-visible string of the site, by stage in journey order, with its source file and key.
//   npx tsx scripts/extract_copy.ts           (also: npm run copy)
// Writes docs/copy/copy.md (to read / edit) and docs/copy/copy.json (machine-readable, same content).
// Sources:
//   1. dictionaries (the real copy; zh + en side by side): src/shared/dict.ts, src/shared/story-dict.ts,
//      src/stages/*/dict.ts, src/i18n/dict.ts (jelly page), src/shared/surprise/dict.ts (惊喜 / 收集 / secret page)
//   2. the loading curtain's labels + texts (src/shared/curtain-inline.ts)
//   3. a scan for hard-coded Chinese string literals in src/**/*.ts outside the dictionaries (film names in the sea,
//      exhibit cards in the shop, flower names, …) and Chinese text in the HTML pages — heuristic, so it may also list a
//      string that never reaches the screen (marked "hard-coded": check before editing).
// To change a string: edit it in the file + key listed (dictionary rows: change zh and/or en; both languages share the key).
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAGES } from '../src/shared/stage-list';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/copy');
type Entry = { key: string; zh: string; en: string; file: string; kind: 'dict' | 'curtain' | 'hard-coded' | 'html'; line?: number };
type Section = { id: string; name: string; entries: Entry[] };

// journey order; the AR room sits after the shop (it is a side room of it); 'shared' = on every page
const ORDER = ['shared', 'surprise', 'meadow', 'shop', 'ar', 'night', 'jelly', 'sea', 'sky', 'coop', 'flower', 'mushroom', 'home', 'secret'];
const NAMES: Record<string, string> = {
  shared: '通用（每页都有：语言、声音、加载幕布） · Shared chrome',
  surprise: '惊喜 / 跳过 / 收集（通用部分） · Surprise layer (shared)',
  meadow: '1 草地 · Meadow', shop: '2 小店 · Shop', ar: '2b 桌上（小店的 AR 支线） · AR side room', night: '3 夜路 · Night road',
  jelly: '4 果冻标本 · Jelly', sea: '5 海里 · Sea', sky: '6 长春的天空 · Sky', coop: '7 一起玩 · Play together',
  flower: '8 花林 · Flower wood', mushroom: '9 蘑菇林 · Mushroom wood', home: '10 小家 · Home（含片尾）',
  secret: '彩蛋页（占位） · Secret page (placeholder)',
};
const sec = new Map<string, Section>(ORDER.map(id => [id, { id, name: NAMES[id], entries: [] }]));
const add = (stage: string, e: Entry) => (sec.get(stage) ?? sec.get('shared')!).entries.push(e);
const rel = (p: string) => relative(ROOT, p).split('\\').join('/');
const ids = new Set<string>([...STAGES, 'ar']);

function stageOfKey(key: string, fallback: string): string {
  const p = key.split('.');
  if (ids.has(p[0])) return p[0];
  if (p[0] === 'story' && ids.has(p[1])) return p[1];
  if (p[0] === 'gs' && ['stage', 'item', 'hint'].includes(p[1]) && ids.has(p[2])) return p[2];
  if (p[0] === 'secret') return 'secret';
  return fallback;
}
function dict(file: string, en: Record<string, string>, zh: Record<string, string>, fallback: string) {
  for (const key of Object.keys({ ...en, ...zh })) add(stageOfKey(key, fallback), { key, zh: zh[key] ?? '', en: en[key] ?? '', file, kind: 'dict' });
}

// 1. dictionaries
const shared = await import('../src/shared/dict');
dict('src/shared/dict.ts', shared.en, shared.zh, 'shared');
const surprise = await import('../src/shared/surprise/dict');
dict('src/shared/surprise/dict.ts', surprise.en, surprise.zh, 'surprise');
const story = await import('../src/shared/story-dict');
dict('src/shared/story-dict.ts', story.en, story.zh, 'shared');
for (const st of readdirSync(join(ROOT, 'src/stages'))) {
  const f = join(ROOT, 'src/stages', st, 'dict.ts');
  try { statSync(f); } catch { continue; }
  const m = await import(f);
  dict(rel(f), m.en, m.zh, ids.has(st) ? st : 'shared');
}
const jelly = await import('../src/i18n/dict');
dict('src/i18n/dict.ts', jelly.DICT.en, jelly.DICT.zh, 'jelly');

// 2. the loading curtain
const cur = await import('../src/shared/curtain-inline');
for (const [id, [, zh, en]] of Object.entries(cur.CURTAIN_STAGES)) add(ids.has(id) || id === 'secret' ? id : 'shared', { key: `CURTAIN_STAGES.${id}`, zh, en, file: 'src/shared/curtain-inline.ts', kind: 'curtain' });
for (const k of Object.keys(cur.TXT.zh)) add('shared', { key: `TXT.${k}`, zh: (cur.TXT.zh as Record<string, string>)[k], en: (cur.TXT.en as Record<string, string>)[k], file: 'src/shared/curtain-inline.ts', kind: 'curtain' });

// 3. hard-coded Chinese literals (outside dictionaries) — a tiny lexer that skips comments
const HAN = /[\u3400-\u9fff\uf900-\ufaff]/;
function walk(d: string, out: string[] = []) {
  for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p, out); else if (/\.ts$/.test(n) && !/dict\.ts$/.test(n) && !/curtain-inline\.ts$/.test(n) && !/\.d\.ts$/.test(n)) out.push(p); }
  return out;
}
function literals(src: string): { s: string; line: number; at: number }[] {
  const out: { s: string; line: number; at: number }[] = []; let i = 0, line = 1;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c, start = line, at = i; let s = ''; i++;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') { s += src[i + 1]; i += 2; continue; } if (src[i] === '\n') line++; s += src[i]; i++; }
      i++; out.push({ s, line: start, at }); continue;
    }
    i++;
  }
  return out;
}
function stageOfFile(f: string): string {
  const m = f.match(/src\/(?:stages|shared\/surprise\/anims)\/([a-z]+)\//) || f.match(/src\/shared\/surprise\/anims\/([a-z]+)\.ts$/);
  if (m) return ids.has(m[1]) ? m[1] : m[1] === 'wander' ? 'meadow' : 'shared';
  if (/src\/(main|egg\/|i18n\/)/.test(f)) return 'jelly';
  if (/src\/secret\//.test(f)) return 'secret';
  return 'shared';
}
for (const f of walk(join(ROOT, 'src'))) {
  const src = readFileSync(f, 'utf8'); const lines = src.split('\n');
  const lits = literals(src);
  for (let k = 0; k < lits.length; k++) {
    const L = lits[k]; if (!HAN.test(L.s)) continue;
    const text = lines[L.line - 1] ?? '';
    if (/console\.|throw |new Error/.test(text)) continue;
    // pair with an English sibling on the same line (zh: '…', en: '…' pattern) and name it by the nearest key
    const before = src.slice(Math.max(0, L.at - 40), L.at); const prop = before.match(/([A-Za-z_$][\w$]*)\s*:\s*$/)?.[1];
    const sib = [...lits.slice(Math.max(0, k - 3), k), ...lits.slice(k + 1, k + 4)].find(o => o.line === L.line && !HAN.test(o.s) && /[a-z]{2}/i.test(o.s) && /\ben\s*:\s*$/.test(src.slice(Math.max(0, o.at - 12), o.at)));
    const idm = text.match(/\bid\s*:\s*['"]([\w-]+)['"]/)?.[1] ?? text.match(/^\s*([A-Za-z_$][\w$-]*)\s*:\s*\{/)?.[1];
    const key = [idm, prop].filter(Boolean).join('.') || `line ${L.line}`;
    // markup built in a string: keep only the Chinese text nodes
    const parts = L.s.includes('<') ? [...L.s.matchAll(/>([^<>]*[\u3400-\u9fff][^<>]*)</g)].map(m => m[1].trim()) : [L.s];
    for (const zh of parts) add(stageOfFile(rel(f)), { key, zh, en: L.s.includes('<') ? '' : sib?.s ?? '', file: rel(f), line: L.line, kind: 'hard-coded' });
  }
}
// Chinese text in the HTML pages (titles come from dictionaries via %T:key%; this catches literal text)
for (const d of ['.', ...STAGES.map(s => s === 'meadow' ? '' : s).filter(Boolean), 'ar', 'secret']) {
  const f = join(ROOT, d, 'index.html'); let html = ''; try { html = readFileSync(f, 'utf8'); } catch { continue; }
  const st = d === '.' ? 'meadow' : d;
  html.split('\n').forEach((ln, i) => {
    if (/<script|<style/.test(ln)) return;
    for (const m of ln.matchAll(/>([^<>]*[\u3400-\u9fff][^<>]*)</g)) add(st, { key: `html line ${i + 1}`, zh: m[1].trim(), en: '', file: rel(f), line: i + 1, kind: 'html' });
    for (const m of ln.matchAll(/(?:aria-label|title|alt|content)="([^"]*[\u3400-\u9fff][^"]*)"/g)) add(st, { key: `html attr line ${i + 1}`, zh: m[1], en: '', file: rel(f), line: i + 1, kind: 'html' });
  });
}

// write
mkdirSync(OUT, { recursive: true });
const sections = ORDER.map(id => sec.get(id)!).filter(s => s.entries.length);
const total = sections.reduce((n, s) => n + s.entries.length, 0);
const KIND: Record<Entry['kind'], string> = { dict: '词典', curtain: '幕布', 'hard-coded': '写死在代码里', html: 'HTML' };
writeFileSync(join(OUT, 'copy.json'), JSON.stringify({ generated: new Date().toISOString(), total, order: ORDER, sections }, null, 2) + '\n');
const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, '<br>').replace(/\s+$/, '');
let md = `# 网站全部文字 · All visible copy\n\n`;
md += `由 \`npx tsx scripts/extract_copy.ts\` 自动生成（${total} 条），按旅程顺序分站。改字：到“文件”里找到同一个 key，改中文（zh）和/或英文（en）。\n`;
md += `“写死在代码里”的条目是扫描出来的中文字面量，可能有极少数并不显示在屏幕上；改之前看一眼那一行。\n\n`;
md += `Generated by \`npx tsx scripts/extract_copy.ts\` (${total} strings), grouped by stage in journey order. Edit the string under the same key in the listed file.\n\n`;
md += `## 目录\n\n` + sections.map(s => `- [${s.name}](#${s.id}) — ${s.entries.length}`).join('\n') + '\n\n';
for (const s of sections) {
  md += `<a id="${s.id}"></a>\n## ${s.name}\n\n| key | 中文 | English | 文件 · 类型 |\n|---|---|---|---|\n`;
  for (const e of s.entries) md += `| \`${esc(e.key)}\` | ${esc(e.zh)} | ${esc(e.en)} | ${e.file}${e.line ? ':' + e.line : ''} · ${KIND[e.kind]} |\n`;
  md += '\n';
}
writeFileSync(join(OUT, 'copy.md'), md);
console.log(`wrote ${rel(join(OUT, 'copy.md'))} and copy.json — ${total} strings in ${sections.length} sections`);
for (const s of sections) console.log(`  ${s.id.padEnd(9)} ${String(s.entries.length).padStart(4)}`);
