// Build-time: bright-star catalogue + IAU constellation lines for /sky/, from d3-celestial's data (HYG-derived, J2000,
// BSD-3, (c) Olaf Frohn). Usage: npm pack d3-celestial && tar xzf ... ; node tools/sky/gen.mjs <path-to-d3-celestial/data>
import { readFileSync, writeFileSync } from 'node:fs';
const dir = process.argv[2] || '/tmp/d3c/package/data';
const LIM = 6.0;
const s = JSON.parse(readFileSync(`${dir}/stars.6.json`, 'utf8')).features
  .filter(f => f.properties.mag <= LIM)
  .sort((a, b) => a.properties.mag - b.properties.mag);
// flat: ra_deg*100, dec_deg*100, mag*100, bv*100 (ints)
const stars = [];
for (const f of s) { let [ra, dec] = f.geometry.coordinates; if (ra < 0) ra += 360; const bv = parseFloat(f.properties.bv); stars.push(Math.round(ra * 100), Math.round(dec * 100), Math.round(f.properties.mag * 100), Math.round((isNaN(bv) ? 0.6 : bv) * 100)); }
const lines = JSON.parse(readFileSync(`${dir}/constellations.lines.json`, 'utf8')).features.map(f => ({ id: f.id, l: f.geometry.coordinates.map(seg => seg.flatMap(([ra, dec]) => [Math.round(((ra + 360) % 360) * 100), Math.round(dec * 100)])) }));
writeFileSync('src/stages/sky/data/stars.json', JSON.stringify(stars));
writeFileSync('src/stages/sky/data/lines.json', JSON.stringify(lines));
console.log(s.length, 'stars;', lines.length, 'constellations');
