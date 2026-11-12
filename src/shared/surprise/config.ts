// One place for the knobs of the 惊喜 hunt.
//
// SECRET_PAGE: where the journey goes after the ending film once every hidden thing is found. Relative to the site root
// (the Vite base is './', so this works on any host or subpath). The owner has not designed that page yet: secret/ is a
// placeholder (secret/index.html → src/secret/main.ts). To point somewhere else, change only this value
// (another path in this site, e.g. 'bonus/', or a full https:// URL).
export const SECRET_PAGE = 'secret/';
/** seconds the closing card stays on screen before the secret page opens by itself (all found) */
export const SECRET_DELAY_S = 9;
/** seconds the closing card stays on screen before the collection list slides up (something missing) */
export const LIST_DELAY_S = 5;
