# Publish status — story edition

Date: 2026-11-07 (America/Los_Angeles).

- Repository `smartlotus/jelly-gift-story` is **public**.
- GitHub Pages: https://smartlotus.github.io/jelly-gift-story/
- Source: `main` `0461d90` (motion door/snow fixes) plus this docs note.
- Pages branch: `gh-pages` `d48cda3` — `Deploy story edition (0461d90)`, source branch `gh-pages` path `/`, HTTPS enforced. API `status: built`.
- Enabling Pages via POST after visibility change returned HTTP 409 `GitHub Pages is already enabled.` GET then showed the correct `html_url` and `gh-pages` source; no further POST was sent.
- Old stable site unchanged: `smartlotus/jelly-gift` `1c2d5de` (`Deploy built site (jelly-gift-site@52caa2d)`), live https://smartlotus.github.io/jelly-gift/ HTTP 200, `Last-Modified: Thu, 05 Nov 2026 02:10:46 GMT`.
- Private reference photos in `/workspace/gift-references/{woman,man}.jpg` were audited against every tracked blob and the `dist/` build: no matches, never published.
