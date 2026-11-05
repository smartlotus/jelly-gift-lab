// The four printed objects on display (data from lotus-3d-figures docs/PROJECT_README_v5.md §4).
// Each GLB has one mesh per colour part, named 'NN_key' (e.g. '08_pink'); COLOURS maps key -> filament hex + names.
export type ExhibitId = 'figure-pig' | 'figure-cat' | 'magnet-pig' | 'magnet-cat' | 'pair' | 'cat-fig' | 'pig-fig' | 'cat-relief' | 'pig-relief';
export interface Exhibit {
  id: ExhibitId; no: string; kind: 'figure' | 'magnet' | 'pair';
  size: string;          // X × Y × Z mm (print bed axes)
  parts: number;         // colour parts (AMS)
  x: number;             // world x (logical px) of the display centre
  y: number;             // world y of the surface the model stands on (plinth top) / magnet centre on the fridge door
  box: number;           // logical px size of the square 3D viewport over the world
}
export const EXHIBITS: Exhibit[] = [
  { id: 'figure-pig', no: '01', kind: 'figure', size: '59.9 × 31.9 × 41.4', parts: 12, x: 272, y: 124, box: 84 },
  { id: 'figure-cat', no: '02', kind: 'figure', size: '61.9 × 31.9 × 47.8', parts: 15, x: 432, y: 124, box: 84 },
  { id: 'magnet-pig', no: '03', kind: 'magnet', size: '70.1 × 55.0 × 10.4', parts: 13, x: 621, y: 129, box: 36 },
  { id: 'magnet-cat', no: '04', kind: 'magnet', size: '70.1 × 55.0 × 8.9', parts: 15, x: 651, y: 129, box: 36 },
  // the couple set on the counter: dovetailed pig + cat that slide together (the half hearts on the seam make one heart)
  { id: 'pair', no: '05', kind: 'pair', size: '121.8 × 31.9 × 47.8', parts: 21, x: 816, y: 121, box: 78 },
  // v03h · Lotus30 Notion set (complete figures + reliefs with magnet slots)
  { id: 'pig-fig', no: '06', kind: 'figure', size: '84.0 × 53.0 × 66.0', parts: 17, x: 1000, y: 124, box: 88 },
  { id: 'cat-fig', no: '07', kind: 'figure', size: '82.0 × 50.0 × 68.3', parts: 15, x: 1160, y: 124, box: 88 },
  { id: 'pig-relief', no: '08', kind: 'magnet', size: '67.8 × 56.4 × 8.1', parts: 16, x: 1310, y: 129, box: 40 },
  { id: 'cat-relief', no: '09', kind: 'magnet', size: '69.0 × 65.0 × 7.6', parts: 15, x: 1350, y: 129, box: 40 },
];
/** pair = two GLBs; the cat sits at +60.8493 mm X when assembled (lotus-3d-figures README v5, dx) */
export const PAIR_DX = 0.608493;
export const COLOURS: Record<string, { hex: string; en: string; zh: string }> = {
  black: { hex: '#2E2A2B', en: 'Soft black', zh: '软黑' },
  logo: { hex: '#8A8F99', en: 'Slate', zh: '石板灰' },
  snout: { hex: '#EE8FA6', en: 'Deep pink', zh: '深粉' },
  blush: { hex: '#F5A3B4', en: 'Blush', zh: '腮红粉' },
  yellow: { hex: '#FFD45C', en: 'Sunny yellow', zh: '暖黄' },
  leaf: { hex: '#8FCB9B', en: 'Succulent', zh: '多肉绿' },
  metal: { hex: '#B5BBC4', en: 'Satin silver', zh: '缎银' },
  pink: { hex: '#F9C6CF', en: 'Pastel pink', zh: '浅粉' },
  laptop: { hex: '#DADDE3', en: 'Light grey', zh: '浅灰' },
  lampw: { hex: '#F6F0E2', en: 'Warm white', zh: '暖白' },
  pot: { hex: '#F2C6A6', en: 'Peach', zh: '蜜桃' },
  wood: { hex: '#E6C79F', en: 'Light wood', zh: '原木' },
  plate: { hex: '#CFEBDD', en: 'Mint', zh: '薄荷' },
  whisker: { hex: '#9A9AA2', en: 'Warm grey', zh: '暖灰' },
  text: { hex: '#3B4B7C', en: 'Navy', zh: '藏青' },
  heart: { hex: '#F08AA4', en: 'Rose', zh: '玫红' },
  pins: { hex: '#C9CED6', en: 'Silver', zh: '银' },
  pinkacc: { hex: '#F4A7B9', en: 'Accent pink', zh: '点缀粉' },
  chip: { hex: '#2F5D46', en: 'PCB green', zh: '电路绿' },
  cream: { hex: '#FFF4E4', en: 'Cream', zh: '奶油白' },
  pages: { hex: '#FCEBC4', en: 'Ivory', zh: '象牙' },
  cover: { hex: '#9CC8EE', en: 'Book blue', zh: '书封蓝' },
};
/** the magnet-cat plate is lavender, not mint */
export const colourOf = (ex: ExhibitId, key: string) => {
  if (key === 'plate' && ex === 'magnet-cat') return { hex: '#E4DCF5', en: 'Lavender', zh: '薰衣草' };
  if (COLOURS[key]) return COLOURS[key];
  // v03h: lotus30 meshes are named NN_<hex> — use the hex itself
  if (/^[0-9a-fA-F]{6}$/.test(key)) return { hex: '#' + key.toLowerCase(), en: '#' + key.toLowerCase(), zh: '#' + key.toLowerCase() };
  return { hex: '#ccc', en: key, zh: key };
};
export const partKey = (meshName: string) => meshName.replace(/^\d+_/, '').replace(/[._]\d+$/, '');
