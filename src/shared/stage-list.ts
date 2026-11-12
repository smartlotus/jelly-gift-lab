// The journey order as plain data (no DOM): shared by flow.ts and by modules that must also load in node
// (collection state, the copy extractor, unit tests). Required order (t23u):
// meadow → shop → night → jelly → sea → sky → coop → flower → mushroom → home.   (ar is a side room of the shop)
export type StageId = 'meadow' | 'flower' | 'mushroom' | 'shop' | 'night' | 'jelly' | 'sea' | 'sky' | 'coop' | 'home' | 'ar';
export const STAGES: readonly StageId[] = ['meadow', 'shop', 'night', 'jelly', 'sea', 'sky', 'coop', 'flower', 'mushroom', 'home'];
