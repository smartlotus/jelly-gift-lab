// Loads generated pixel plates and sprite sheets from /art (public/).
// Missing files are skipped so the stages can fall back to procedural drawing.
export interface FaunaSet {
  walk: HTMLCanvasElement[];
  stand?: HTMLCanvasElement;
  extra?: HTMLCanvasElement;
  fly?: HTMLCanvasElement[];
}

export interface ArtKit {
  ready: boolean;
  flowers: HTMLCanvasElement[];
  mushrooms: HTMLCanvasElement[];
  people: Record<string, HTMLCanvasElement>;
  furniture: Record<string, HTMLCanvasElement>;
  fauna: Record<string, FaunaSet>;
  plates: {
    interior?: HTMLCanvasElement;
    cottage?: HTMLCanvasElement;
    cottageDoor?: HTMLCanvasElement;
    snow?: HTMLCanvasElement;
    dawn?: HTMLCanvasElement;
    flowerSea?: HTMLCanvasElement;
    mushroomSea?: HTMLCanvasElement;
    portraits?: HTMLCanvasElement;
    poseSheet?: HTMLCanvasElement;
    flowerGround: { img: HTMLCanvasElement; pathT: number }[];
    mushroomGround: { img: HTMLCanvasElement; pathT: number }[];
    flowerPortrait?: { img: HTMLCanvasElement; pathT: number };
    mushroomPortrait?: { img: HTMLCanvasElement; pathT: number };
  };
}

export const art: ArtKit = {
  ready: false,
  flowers: [],
  mushrooms: [],
  people: {},
  furniture: {},
  fauna: {},
  plates: { flowerGround: [], mushroomGround: [] },
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

async function takeRetry(src: string, tries = 3): Promise<HTMLCanvasElement | null> {
  for (let i = 0; i < tries; i++) {
    const hit = await take(src);
    if (hit && hit.width > 8) return hit;
  }
  return null;
}

const FLOWER_FILES = Array.from({ length: 12 }, (_, i) => `/art/flowers/fl${String(i).padStart(2, '0')}.png`);
const MUSH_FILES = Array.from({ length: 12 }, (_, i) => `/art/mushrooms/ms${String(i).padStart(2, '0')}.png`);
const PEOPLE_FILES = [
  'her-stand', 'him-stand', 'her-walk', 'him-walk', 'sit', 'sleep', 'lean', 'hold',
  'walk0', 'walk1', 'walk2', 'walk3', 'run0', 'run1', 'run2', 'run3',
];
const FURN_FILES = [
  'sofa', 'armchair', 'coffee', 'table', 'chair', 'bed', 'night', 'shelf', 'tv', 'lamp',
  'wardrobe', 'side', 'cushion', 'cattree', 'dogbed', 'rug', 'frame', 'lights', 'roses', 'lisi',
];

async function loadWalk(prefix: string, n: number): Promise<HTMLCanvasElement[]> {
  const imgs = await Promise.all(Array.from({ length: n }, (_, i) => take(`/art/fauna/${prefix}-${i}.png`)));
  return imgs.filter((x): x is HTMLCanvasElement => !!x);
}

export async function preloadArt(): Promise<ArtKit> {
  if (art.ready) return art;
  const [flowers, mushrooms, people, furniture, interior, cottage, cottageDoor, snow, dawn, flowerSea, mushroomSea, portraits, poseSheet,
    flowerA, flowerB, flowerG, flowerP, flowerWide, mushA, mushB, mushG, mushP, mushWide,
    catW, deerW, lambW, collieW, kitW, owlW,
    deerS, lambS, collieS, kitS, owlS, owlP, grey] = await Promise.all([
    Promise.all(FLOWER_FILES.map(take)),
    Promise.all(MUSH_FILES.map(take)),
    Promise.all(PEOPLE_FILES.map(n => take(`/art/people/${n}.png`))),
    Promise.all(FURN_FILES.map(n => take(`/art/furniture/${n}.png`))),
    take('/art/plates/interior.png'),
    take('/art/plates/cottage.png'),
    take('/art/plates/cottage-door.png'),
    take('/art/plates/snow-cottage.jpg'),
    take('/art/plates/dawn.jpg'),
    take('/art/plates/flower-sea.png'),
    take('/art/plates/mushroom-sea.png'),
    take('/art/plates/portraits.png'),
    take('/art/plates/pose-sheet.png'),
    takeRetry('/art/plates/flower-ground-a.jpg'),
    takeRetry('/art/plates/flower-ground-b.jpg'),
    take('/art/plates/flower-ground.jpg'),
    take('/art/plates/flower-portrait.jpg'),
    takeRetry('/art/plates/flower-ground-wide.jpg'),
    takeRetry('/art/plates/mushroom-ground-a.jpg'),
    takeRetry('/art/plates/mushroom-ground-b.jpg'),
    take('/art/plates/mushroom-ground.jpg'),
    take('/art/plates/mushroom-portrait.jpg'),
    takeRetry('/art/plates/mushroom-ground-wide.jpg'),
    loadWalk('cat', 4),
    loadWalk('deer', 4),
    loadWalk('lamb', 4),
    loadWalk('collie', 4),
    loadWalk('kitten', 4),
    loadWalk('owl', 4),
    take('/art/fauna/deer-stand.png'),
    take('/art/fauna/lamb-stand.png'),
    take('/art/fauna/collie-stand.png'),
    take('/art/fauna/kitten-stand.png'),
    take('/art/fauna/owl-stand.png'),
    take('/art/fauna/owl-perch.png'),
    take('/art/fauna/greykit-0.png'),
  ]);
  art.flowers = flowers.filter((x): x is HTMLCanvasElement => !!x);
  art.mushrooms = mushrooms.filter((x): x is HTMLCanvasElement => !!x);
  PEOPLE_FILES.forEach((n, i) => { const im = people[i]; if (im) art.people[n] = im; });
  FURN_FILES.forEach((n, i) => { const im = furniture[i]; if (im) art.furniture[n] = im; });
  if (interior) art.plates.interior = interior;
  if (cottage) art.plates.cottage = cottage;
  if (cottageDoor) art.plates.cottageDoor = cottageDoor;
  if (snow) art.plates.snow = snow;
  if (dawn) art.plates.dawn = dawn;
  if (flowerSea) art.plates.flowerSea = flowerSea;
  if (mushroomSea) art.plates.mushroomSea = mushroomSea;
  if (portraits) art.plates.portraits = portraits;
  if (poseSheet) art.plates.poseSheet = poseSheet;
  // Prefer one continuous wide plate (no A|B composition cut, no wrap fade).
  art.plates.flowerGround = [];
  if (flowerWide) art.plates.flowerGround.push({ img: flowerWide, pathT: 0.657 });
  else {
    if (flowerA) art.plates.flowerGround.push({ img: flowerA, pathT: 0.68 });
    if (flowerB) art.plates.flowerGround.push({ img: flowerB, pathT: 0.68 });
    if (!art.plates.flowerGround.length && flowerG) art.plates.flowerGround.push({ img: flowerG, pathT: 0.68 });
  }
  art.plates.mushroomGround = [];
  if (mushWide) art.plates.mushroomGround.push({ img: mushWide, pathT: 0.835 });
  else {
    if (mushA) art.plates.mushroomGround.push({ img: mushA, pathT: 0.84 });
    if (mushB) art.plates.mushroomGround.push({ img: mushB, pathT: 0.84 });
    if (!art.plates.mushroomGround.length && mushG) art.plates.mushroomGround.push({ img: mushG, pathT: 0.84 });
  }
  if (flowerP) art.plates.flowerPortrait = { img: flowerP, pathT: 0.57 };
  if (mushP) art.plates.mushroomPortrait = { img: mushP, pathT: 0.79 };

  const fauna = (walk: HTMLCanvasElement[], stand?: HTMLCanvasElement | null, extra?: HTMLCanvasElement | null, fly?: HTMLCanvasElement[]): FaunaSet => {
    const set: FaunaSet = { walk };
    if (stand) set.stand = stand;
    if (extra) set.extra = extra;
    if (fly?.length) set.fly = fly;
    return set;
  };
  if (catW.length) art.fauna.cat = fauna(catW, catW[0], catW[0]);
  if (deerW.length) art.fauna.deer = fauna(deerW, deerS, deerS);
  if (lambW.length) art.fauna.lamb = fauna(lambW, lambS, lambS);
  if (collieW.length) art.fauna.collie = fauna(collieW, collieS, collieS);
  if (kitW.length) {
    art.fauna.kitten = fauna(kitW, kitS, kitS);
    art.fauna.calico = art.fauna.kitten;
  }
  if (owlW.length) {
    const up = owlW[0]!, glide = owlW[1] ?? owlW[0]!, down = owlW[2] ?? owlW[0]!;
    // Alternate the two most contrasting silhouettes (raised vs flat glide vs down)
    // so a wingbeat reads at 5 fps instead of blending into one soaring pose.
    // Every fly sheet faces right (yellow beak on the right); blit flips only
    // when world travel is to the left.
    const flap = owlW.length >= 3 ? [up, glide, down, glide] : owlW;
    art.fauna.owl = fauna(flap, owlP ?? owlS, owlP ?? owlS, flap);
  }
  if (grey) art.fauna.greykit = fauna([grey], grey, grey);

  art.ready = true;
  return art;
}
