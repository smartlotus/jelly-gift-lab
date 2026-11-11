> **PAUSED (v03p, 2026-11-08)**: the film is switched off in the site (`FILM_ENABLED = false` in
> `src/stages/home/main.ts`). The journey ends on a static card with the two protected lines. This branch of work
> is bookmarked as `v03o-film`. Set the flag back to `true` to restore everything below.

# v03o — the future film, rebuilt (2026-11-08)

Not deployed. Branch `v03m-spatial-home`.

## Why it was rebuilt

The previous Module B laid painted sprites (`public/art/people/*.png`) straight onto painted plates
(`public/art/plates/*.jpg`). Same palette, same brush, no outline: at 1280×720 the couple dissolved into
the set, and the transform into it still began with 16² pixel animals. The brief for this pass: no pixel
cutaway, and the people must read as *figures in front of* a set.

## What replaced it

`src/stages/home/film.ts` — a new six-shot film drawn in code, with its own art direction:

- sets: soft gouache washes, no outlines, low saturation, heavy atmospheric light
- cast: flat fills + a warm ink outline + collar/hand details + contact shadow + rim light
- camera/composition: medium and close framings instead of tiny figures on a wide plate
- finish: paper grain + vignette over every frame, 0.9 s cross-dissolves

Shots (`SCENE_IDS`, same ids the dev hooks and the verification script use):

| id | beat |
| --- | --- |
| `walk` | the empty house, boxes still stacked, they walk in and stop |
| `greet` | filling the shelf: he holds the box, she reaches up with a small frame |
| `sofa` | night, lamp on, they sit with mugs, cat on the arm, dog on the rug |
| `sleep` | later, lamp off, her head on his shoulder, moon through the window |
| `snow` | winter afternoon: the two of them at the glass as dark silhouettes |
| `dawn` | sunrise on the balcony, both leaning on the rail behind it |
| finale | holds the dawn frame while the closing line fades in |

The `transform` beat no longer draws the dollhouse in 2D with pixel animals: the film's first frame is
already on screen and a warm veil (the light of the room just left) lifts off it.

The canvas is re-configured to ~1 canvas pixel per CSS pixel while the film plays (`fit()`), so the
outlines are hairlines instead of 4×-upscaled blocks.

## Evidence

| File | Shows |
| --- | --- |
| `shots-grid.png` | all six shots, 2×3 contact sheet |
| `transition.png` | the veil lifting onto shot 1 (with the protected 「也许有一天…」 line) |
| `shelf-scene.png` | the shelf shot at full size |
| `portrait-sofa.png` | 390×844: the film re-stages for portrait instead of cropping |
| `finale.png` | closing frame + the exact day-2000 line |

## Honest state

- The cast is *drawn*, not painted: flat vector shapes with an ink outline. It reads clearly at film
  size, but it is illustration, not the painted look of the earlier plates. If the gate wants painterly
  figures, this is the wrong base and should go back to rendered stills instead.
- `src/stages/home/montage.ts` and `cineRoom.ts` are now unused by the film. They are left in the tree
  because deleting needs a tree-level commit; a follow-up can remove them.
- Cat/dog props are simple; the sleeping dog is the weakest pose.
