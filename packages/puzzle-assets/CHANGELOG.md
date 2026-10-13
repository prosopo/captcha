# @prosopo/puzzle-assets

## 0.2.1
### Patch Changes

- e13d7a8: New captcha type: `iconOrder`. The user is shown a frame of icons and a legend, and clicks the legend's icons in the order given.
  
  Icon-order is off by default. Only Prosopo can switch it on for a site, with the `captchaTypeFeatureFlags.iconOrder` feature flag; the site owner cannot. A site without the flag is never served icon-order by any route, and the challenge endpoint refuses it. Once the flag is on, the owner can still keep icon-order out of the frictionless flow with `frictionlessTypes.iconOrder`, the same way as image and puzzle.
  
  The answer never leaves the provider. Icon positions are stored on the challenge record, and the widget receives only the rendered frame and legend. Grading checks order as well as position, and each icon's hit radius scales with its size. Verifying a token is single-use under concurrent requests.
  
  `@prosopo/icon-order-assets` draws the imagery, and `@prosopo/procaptcha-icon-order` is the widget. Its text is translated into every supported language.
  
  Puzzle and icon-order now share their server code: challenge and solution handlers, the verify route, the submit and verify pipeline, and the database record methods. The widget code they have in common moves into `@prosopo/procaptcha-common`: the lazy mount wrapper, manager expiry and dispose, spent-session handling, behavioural data encryption and trusted click coordinates. Puzzle's behaviour is unchanged.
  
  The demo playground has icon-order pages, and there is an end-to-end test for it.

## 0.2.0
### Minor Changes

- f961dab: Store everything needed to redraw a puzzle, so the portal can show the exact challenge a user was served.
  
  Until now a puzzle record kept the target, the origin and the accuracy required (`tolerance`), and
  nothing else. The things that decide what the puzzle actually looked like — how many decoy shapes were
  scattered on it, how dark they were, how big the piece was, and which background was used — were
  picked per challenge and then thrown away. So you could see that someone failed by 11px and had no way
  to know whether they had been handed an easy puzzle or a nasty one.
  
  Puzzle records now carry a `render` object with all of it: the difficulty ladder level, the piece size,
  the frame geometry, the five render settings, and the two 128-bit seeds that regenerate the imagery.
  Given those, the portal reproduces the background and the piece byte for byte.
  
  To make that possible the renderer had to become reproducible. `renderPuzzle` and `createBackground`
  now take an optional seed and report the one they used, instead of generating one internally and
  discarding it; the background pool hands out each image together with its seed. Default behaviour is
  unchanged — omit the seed and you still get a fresh random one.
  
  The ladder level is new on the session too (`puzzleLevel`), because it was computed when the puzzle
  was escalated and never written down anywhere. It is absent when the ladder did not choose the
  puzzle — a site-configured puzzle or a traffic-filter override has no level.
  
  The record is patched after the imagery is produced rather than written with the rest of the record,
  because the piece size and the seeds only exist once the render has run, and the target has to be
  durable before it is expressed in pixels. If that patch fails it is logged and ignored: losing a
  diagnostic must not cost the user their solve. Records written before this change, and any challenge
  whose render threw, simply have no `render`.
  
  **The seeds are secret.** `puzzle-assets/src/prng.ts` explains why: they regenerate the clean
  background, and a clean background can be diffed against the composite to read the target position
  straight off. They were previously barred from leaving the provider entirely. They may now sit on the
  captcha record, and nowhere else — not in a response, not in a log, not on the session. Anything that
  exposes a puzzle record to a caller has to drop `render.backgroundSeed` and `render.renderSeed`, and
  must not serve them at all while the challenge is still live. The comment in `prng.ts` now says so.
  
  Test coverage. Three guards, each confirmed to fail when the thing it protects is broken:
  `renderReplay.unit.test.ts` re-renders from the stored fields and asserts the bytes match, with one
  case per field asserting that changing *only* that field changes the output — so a record missing a
  field cannot pass; `puzzleRenderer.unit.test.ts` replays through the same entry points the portal would
  use, which catches a background paired with the wrong seed; and `schemas.test.ts` asserts every
  sub-field survives a strict-mode mongoose write, since a field absent from the schema is dropped
  silently and would store nothing at all.

### Patch Changes

- 6e2eb55: Make the puzzle piece look like a puzzle piece, sit apart from the background, and survive colour-blind vision.
  
  Three complaints from the Twickets call, all about how the challenge looks.
  
  **The silhouette is now always a jigsaw piece.** The generator had five unrelated shape families — jigsaw, circle, rounded rectangle, regular polygon, flower — so four pieces in five were not jigsaw-shaped at all, and a first-time user was as likely to be handed a heptagon as anything recognisable. There is now one grammar: a rounded body where each of the four edges independently gets a tab, a blank or nothing, with the knob's position along its edge, its radius and the corner rounding all varying.
  
  Silhouette variety is deliberate anti-automation and it has not been given up — it has moved inside the grammar. 3^4 edge combinations before any of the continuous parameters, against five families with a handful of parameters each, so the space did not shrink; what changed is that every sample in it reads as a piece of a jigsaw. A sweep over 400 seeds finds more than 320 distinct coarse signatures, so there is nothing like a template to match against.
  
  The piece is also scaled to fit its bounding box now, measured from the knobs actually drawn, rather than the body being inset by the worst case the parameters could produce. Insetting for the worst case shrinks every piece to make room for the largest tab that was never drawn. A tab reaching the border used to come out clipped flat, which looks like a manufacturing defect rather than a jigsaw tab.
  
  **The piece is separated by a luminance step, not by hue.** It is cut from the same mesh the background is drawn from, so on an unlucky palette it was the same colour as whatever it was resting on and the only thing dividing them was a CSS drop-shadow. It now carries an outline whose brightness steps away from its own, in the direction chosen from the piece's own mean luminance — a dark piece gets a light rim, a light piece a dark one. A fixed direction vanishes at one end of the range, which is how a cue that is present in the code ends up absent on screen.
  
  The size of the step is solved for per piece to reach a target contrast ratio, not set as a fixed byte offset: 40 units out of 255 is obvious on a mid grey and nearly invisible near white. Being a brightness step rather than a hue, it survives greyscale, a monochrome display, every dichromacy and a phone screen in sunlight — which the tests assert by measuring luminance only, and again after flattening the piece to grey.
  
  **Palette generation now has a measured contrast floor.** The six palettes are analogous-hue families, which is what makes a mesh gradient look deliberate and is also the worst case for colour-blind vision: a band of neighbouring hues at one lightness is exactly what a dichromat collapses to a single colour. Nothing checked for that, so a palette could lose all its structure for 1 in 12 men and no test would notice.
  
  A new `contrast` module does WCAG relative luminance on linearised sRGB and Viénot–Brettel–Mollon simulation of protanopia, deuteranopia and tritanopia. `drawPalette` now redraws while its widest pair falls below the floor under *any* of the four vision types, widening the lightness band on each retry rather than giving up after N tries — a floor that can be returned past is not a floor. The first attempts are unstretched, so an ordinary draw is exactly what it was before and only a failing palette gets touched.
  
  The floor is on the palette's *range*, not on every pair: a gradient needs near-neighbours, and demanding contrast between them would produce stripes. What it rules out is a field that is uniformly one brightness.
  
  **Tests sweep seeds rather than checking an example.** 45 tests, including 400-seed sweeps of the palette floor, the presence of tabs, silhouette variety, the bounding box, and the area covered; and 120-seed sweeps of the rim's luminance step, its direction, its survival in greyscale, and its survival under each dichromacy. A palette or parameter that is fine on the one seed somebody happened to look at and unreadable on a tenth of the rest is the failure that shipped, and a single-seed test cannot see it.
  
  One thing the tests could not see, found by rendering the output and looking at it: a fixed 4px rim is a tidy outline on a large piece and most of the surface area of a 44px one — the default — so the whole piece read as a pale blob rather than as a piece with a lit edge. No measurement of rim-versus-core contrast catches that, because by that measure a piece which is entirely rim scores perfectly. The rim is now proportional to the piece size, and the tests read the band geometry from the renderer so the measurement cannot drift away from what was drawn.

## 0.1.4
### Patch Changes

- 6fd727c: Publish `@prosopo/native-merkle` and `@prosopo/puzzle-assets` to npm instead of keeping them private.
  
  These are the last two entries in `@prosopo/provider`'s `dependencies` that carried `"private": true` and so were never published. With `@prosopo/native-ja4` already fixed, dropping `private` here makes `npm i @prosopo/provider` resolve for the first time since 5.5.0 — until now it failed with an `E404` on whichever unpublished dependency npm reached first. The Docker image and the bundled CLI build the workspace from source and never resolve these against the registry, which is why the breakage stayed invisible.
  
  `native-merkle` also gains `repository`, because the release workflow publishes with `NPM_CONFIG_PROVENANCE=true` and provenance attestation verifies `repository.url` against the OIDC claim for `prosopo/captcha`. `puzzle-assets` already declared `repository`, `author`, `bugs` and `homepage`, so it needed only the `private` line removed.
  
  Neither tarball changes shape. `native-merkle` keeps its `files` allowlist of `index.js`, `index.d.ts` and the prebuilt `*.node`, and stays `x86_64-unknown-linux-gnu` only — it resolves on linux-x64-gnu and throws napi's "Unsupported architecture" elsewhere, exactly as it does inside the workspace today. `puzzle-assets` ships `dist/` with both the root and `./browser` subpath exports, and keeps its `sharp` runtime dependency.

## 0.1.3
### Patch Changes

- a9c0406: Add vite export path
- 9bf4570: Export code for use in the portal

## 0.1.2
### Patch Changes

- 572f965: chore(puzzle-assets): mark private to unblock changeset publish
  
  `@prosopo/puzzle-assets` was never published to npm (registry returns
  404). `publish_release` calls `npx changeset publish` which walks every
  non-private workspace; the trusted-publisher OIDC flow only works for
  packages that already exist on the registry, so the first-time publish
  hit `ENEEDAUTH` and aborted the whole job — that's why v3.7.15, v3.7.16
  and v3.7.17 all failed at the same step and never published the docker
  image tags either.
  
  `puzzle-assets` is only consumed inside the workspace (provider bundles
  it into the CLI docker image); it has no external consumers, so mark it
  `private: true`. changeset skips private packages by design, so the
  release pipeline goes green without needing a legacy npm token or a
  manual bootstrap publish.
  
  If we ever want to publish it externally, drop `private` and either
  seed a first publish with a legacy `NPM_TOKEN` or configure the package
  as a trusted publisher on npmjs.com first.

## 0.1.1
### Patch Changes

- 35f640f: Render puzzle captcha imagery on the provider instead of sending the answer to the client.
  
  The challenge used to carry `targetX`/`targetY` and the widget drew the target box straight from them, so any HTTP client could echo the coordinates back as its solution and pass without a browser. The provider now synthesises a background procedurally, cuts the notch into the pixels, and returns the background and piece as data URIs; the target and the tolerance never leave the server.
  
  Backgrounds come from the new `@prosopo/puzzle-assets` package and are single-use — reusing one across two challenges would let an attacker diff the composites and recover both notch positions.
