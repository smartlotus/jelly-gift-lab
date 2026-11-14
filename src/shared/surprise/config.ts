// One place for the knobs of the 惊喜 hunt.
//
// SECRET_PAGE: where the journey goes after the ending film once every hidden thing is found. Relative to the site root
// (the Vite base is './', so this works on any host or subpath). The owner has not designed that page yet: secret/ is a
// placeholder (secret/index.html → src/secret/main.ts). To point somewhere else, change only this value
// (another path in this site, e.g. 'bonus/', or a full https:// URL).
// Now the album site (its own repo smartlotus/rhine-album, own GitHub Pages). ?from=jelly lets it greet the visit.
// The old placeholder secret/ page stays in this build (it is what you see if you open it before finding everything).
// 2026-11-14: the Cloudflare Pages build (scripts/build_cloudflare.sh) sets VITE_SECRET_PAGE to the album's pages.dev
// URL; the GitHub Pages build keeps the GitHub address.
export const SECRET_PAGE: string = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SECRET_PAGE || 'https://smartlotus.github.io/rhine-album/?from=jelly';
/** seconds the closing card stays on screen before the secret page opens by itself (all found) */
export const SECRET_DELAY_S = 9;
/** seconds the closing card stays on screen before the collection list slides up (something missing) */
export const LIST_DELAY_S = 5;
