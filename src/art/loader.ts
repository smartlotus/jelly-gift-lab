// Loads generated pixel plates and sprite sheets from /art (public/).
// Missing files are skipped so the stages can fall back to procedural drawing.
export interface ArtKit {
  ready: boolean;
  flowers: HTMLCanvasElement[];
  mushrooms: HTMLCanvasElement[];
  people: Record<string, HTMLCanvasElement>;
  furniture: Record<string, HTMLCanvasElement>;
  plates: {
    interior?: HTMLCanvasElement;
    cottage?: HTMLCanvasElement;
    flowerSea?: HTMLCanvasElement;
    mushroomSea?: HTMLCanvasElement;
    portraits?: HTMLCanvasElement;
    poseSheet?: HTMLCanvasElement;
  };
}

export const art: ArtKit = {
  ready: false,
  flowers: [],
  mushrooms: [],
  people: {},
  furniture: {},
  plates: {},
};

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(src));
    im.src = src;
  });
}

function toCanvas(im: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = im.naturalWidth || im.width;
  c.height = im.naturalHeight || im.height;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(im, 0, 0);
  return c;
}

async function take(src: string): Promise<HTMLCanvasElement | null> {
  try { return toCanvas(await loadImg(src)); }
  catch { return null; }
}

const FLOWER_FILES = Array.from({ length: 12 }, (_, i) => `/art/flowers/fl${String(i).padStart(2, '0')}.png`);
const MUSH_FILES = Array.from({ length: 12 }, (_, i) => `/art/mushrooms/ms${String(i).padStart(2, '0')}.png`);
const PEOPLE_FILES = [
  'her-stand', 'him-stand', 'her-walk', 'him-walk', 'sit', 'sleep', 'lean', 'hold',
  'walk0', 'walk1', 'walk2', 'walk3', 'run0', 'run1', 'run2', 'run3',
];
const FURN_FILES = [
  'sofa', 'armchair', 'coffee', 'table', 'chair', 'bed', 'night', 'shelf', 'tv', 'lamp',
  'wardrobe', 'side', 'cushion', 'cattree', 'dogbed', 'rug', 'frame', 'lights',
];

export async function preloadArt(): Promise<ArtKit> {
  if (art.ready) return art;
  const [flowers, mushrooms, people, furniture, interior, cottage, flowerSea, mushroomSea, portraits, poseSheet] = await Promise.all([
    Promise.all(FLOWER_FILES.map(take)),
    Promise.all(MUSH_FILES.map(take)),
    Promise.all(PEOPLE_FILES.map(n => take(`/art/people/${n}.png`))),
    Promise.all(FURN_FILES.map(n => take(`/art/furniture/${n}.png`))),
    take('/art/plates/interior.png'),
    take('/art/plates/cottage.png'),
    take('/art/plates/flower-sea.png'),
    take('/art/plates/mushroom-sea.png'),
    take('/art/plates/portraits.png'),
    take('/art/plates/pose-sheet.png'),
  ]);
  art.flowers = flowers.filter((x): x is HTMLCanvasElement => !!x);
  art.mushrooms = mushrooms.filter((x): x is HTMLCanvasElement => !!x);
  PEOPLE_FILES.forEach((n, i) => { const im = people[i]; if (im) art.people[n] = im; });
  FURN_FILES.forEach((n, i) => { const im = furniture[i]; if (im) art.furniture[n] = im; });
  if (interior) art.plates.interior = interior;
  if (cottage) art.plates.cottage = cottage;
  if (flowerSea) art.plates.flowerSea = flowerSea;
  if (mushroomSea) art.plates.mushroomSea = mushroomSea;
  if (portraits) art.plates.portraits = portraits;
  if (poseSheet) art.plates.poseSheet = poseSheet;
  art.ready = true;
  return art;
}
