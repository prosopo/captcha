# @prosopo/types

## 5.15.0
### Minor Changes

- 4570692: Let a user swap the puzzle captcha for an image challenge, on sites where Prosopo has switched it on.
  
  Sites get a new staff-only setting, `widgetFeatureFlags.puzzleImageSwitch`. It is off by default and has no stored default. When it is on and the site allows image challenges, the puzzle response says `imageSwitchAvailable: true`. The puzzle then shows a small grid icon next to its title, with a "Switch to an image challenge" tooltip on hover or keyboard focus. After two wrong answers or refreshes in a row, the icon fills with the primary colour and its tooltip shows without a hover, because a touch screen has no hover. The tooltip goes away once the user starts moving the piece.
  
  Pressing it re-mints the session the same way refresh does, with `switchToImage: true`. The provider only honours that when the request is a refresh of a puzzle session on the same site and the switch is on. The new session is then an image challenge with reason `PUZZLE_USER_SWITCH`. Like the refresh limit, it only ever moves from puzzle to image, so a client that fakes the request can only make its own challenge harder.
  
  Also fixes a wrong puzzle answer restarting the whole widget. The user was sent back to the checkbox instead of getting a new puzzle with "Not quite — try again", and a wasted `/frictionless` request went out. The puzzle now retries in place.

### Patch Changes

- Updated dependencies [4570692]
  - @prosopo/locale@3.9.0

## 5.14.0
### Minor Changes

- b299a91: An audio challenge, offered only as an accessibility alternative, like reCAPTCHA's audio option. The user hears a short sequence of spoken digits and types them in.
  
  It is off by default and needs two switches. Prosopo has to turn on the `captchaTypeFeatureFlags.audio` feature flag for the site, which the site owner cannot do, and the site owner has to set `audioAccessibilityEnabled`. When both are on, image, puzzle and icon-order challenges show a "Use audio instead" button. Pressing it swaps the visual challenge for the audio one. After a wrong answer the user stays on audio and gets a fresh clip.
  
  Audio is never a captcha type that can be selected or routed to. A site's `captchaType`, traffic-filter categories, Restrict rules and the site-key CLI all reject it, and routing, PoW escalation and the severity tiers leave it out. The provider only serves audio against the visual session the user was already given, and only on a site with both switches on; any other audio request is refused before the session is used up, and a request without a session is always refused.
  
  The spoken digits are synthesised by `@prosopo/audio-assets`, so there is no recorded set of clips to collect. The answer never leaves the provider, and a challenge can be submitted and verified only once, even under concurrent requests. `@prosopo/procaptcha-audio` is the widget. It and the "Use audio instead" button are built on the shared widget code in `@prosopo/procaptcha-common`, and the provider side is built on the shared interactive-captcha code that puzzle and icon-order use.
  
  The demo playground has audio pages, and there is an end-to-end test for it.
- e13d7a8: New captcha type: `iconOrder`. The user is shown a frame of icons and a legend, and clicks the legend's icons in the order given.
  
  Icon-order is off by default. Only Prosopo can switch it on for a site, with the `captchaTypeFeatureFlags.iconOrder` feature flag; the site owner cannot. A site without the flag is never served icon-order by any route, and the challenge endpoint refuses it. Once the flag is on, the owner can still keep icon-order out of the frictionless flow with `frictionlessTypes.iconOrder`, the same way as image and puzzle.
  
  The answer never leaves the provider. Icon positions are stored on the challenge record, and the widget receives only the rendered frame and legend. Grading checks order as well as position, and each icon's hit radius scales with its size. Verifying a token is single-use under concurrent requests.
  
  `@prosopo/icon-order-assets` draws the imagery, and `@prosopo/procaptcha-icon-order` is the widget. Its text is translated into every supported language.
  
  Puzzle and icon-order now share their server code: challenge and solution handlers, the verify route, the submit and verify pipeline, and the database record methods. The widget code they have in common moves into `@prosopo/procaptcha-common`: the lazy mount wrapper, manager expiry and dispose, spent-session handling, behavioural data encryption and trusted click coordinates. Puzzle's behaviour is unchanged.
  
  The demo playground has icon-order pages, and there is an end-to-end test for it.
- 270395d: Allow maintenance mode to be scoped to specific site keys.
  
  Maintenance mode was all-or-nothing for a whole provider process. If one
  customer's traffic needed to be taken out of scoring, the only option was to put
  the entire node into maintenance mode, which forces a pass for every other
  customer on it too — so in practice it was not used.
  
  The admin toggle now accepts an optional `siteKeys` list. With it, only those
  keys are taken out of scoring and the node-wide flag is left untouched; without
  it, the behaviour is exactly as before, which is what the deploy path relies on.
  
  Scoped maintenance mode is applied in the verify handlers only after the dapp
  signature has been checked, so the decision is made on a site key the caller has
  proven it owns rather than one it merely asserted.
  
  Same durability as the existing flag: per-process, cleared on restart, and set
  per node.

### Patch Changes

- Updated dependencies [b299a91]
- Updated dependencies [e13d7a8]
  - @prosopo/locale@3.8.0

## 5.13.0
### Minor Changes

- 1c13037: Add `captchaTypeFeatureFlags` to site settings, starting with `puzzle`. Setting
  `puzzle: false` stops a site being served the puzzle captcha by any path: its
  configured `captchaType`, `frictionlessTypes`, access policies, the traffic
  filter, routing machines, PoW escalation, and puzzle sessions that already
  exist. A site pinned to puzzle gets an image captcha instead (or PoW if image is
  also off). The field is optional and has no stored default, so sites that never
  set it behave exactly as before. The flag is meant for Prosopo staff, not site
  owners.
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
- dcb691b: Add a refresh control to the puzzle captcha.
  
  A user who can't solve the puzzle they were given can now ask for a different one, from a button in the puzzle's header. The replacement comes through a new frictionless session, like a wrong answer already does.
  
  The widget tells the provider which session was refreshed (`refreshOf`). The provider then records `refreshOf`, `refreshCount` and `refreshedAfterMs` on the new session, so refresh behaviour can be scored later. After three refreshes in a row it serves an image challenge instead, with reason `PUZZLE_REFRESH_LIMIT`. It only does this if the site has image enabled. The switch only goes from puzzle to image, so a client that lies about its refreshes can only make its own challenge harder. A client that leaves the field out gets a normal session, the same as reloading the page.
  
  The image widget's reload button now reports itself as a refresh too. That way a user who was moved onto image isn't sent back to the puzzle by their next reload.

### Patch Changes

- 7d57d2a: A proof-of-work solve is checked against the address the challenge was issued to, and a mismatch sends the user to an image captcha instead of approving them. That check compared the whole IPv4 address, so it fired for anyone whose address moved between asking for the challenge and solving it — which is normal behaviour on mobile and on carrier NAT, where the low octet gets reassigned mid-session. One EE subscriber was seen moving one address along in four seconds.
  
  It now compares the /24, so a reassignment inside the same pool reads as the same place on the network. IPv6 already worked this way on the /64, for the same reason, and is unchanged. A solve arriving from a genuinely different network is still caught and still escalates, so the point of the check survives.
  
  Unit tests cover a low-octet reassignment, both ends of a /24, two different /24s, and a pair of adjacent addresses that straddle the /24 boundary.
- 80b7780: Post-PoW routing now receives the widget mode from the originating session and whether the submitted click coords were all (0,0), so a routing rule can escalate visible-mode solves that carry no real click position.
- dd4c27c: Store the whole-SYN fields the tcp-probe sidecar now reports.
  
  The sidecar's handshake record grew from 80 to 104 bytes and the tail was reordered (prosopo/Protect#1167). chaddy was updated to read both layouts and to forward the new fields as their own headers (prosopo/chaddy#16, #17); this is the provider side of that, so the values have somewhere to land instead of being dropped at the middleware.
  
  Twelve new fields on `Session`, all optional: `tcpOptsKinds`, `tcpOptsPresent`, `tcpOptsCount`, `tcpTsval`, `tcpTsecr`, `tcpFlags`, `tcpDataOffsetResv`, `tcpUrgPtr`, `ipIdent`, `ipTotalLen`, `ipFragFlags`, `ipTos`. They are surfaced on the decision-machine input the same way the existing TCP fields are, so routing and verify rules can read them.
  
  `tcpOptsKinds` is stored decoded — the IANA kind number of each TCP option in wire order, `[2, 4, 8, 1, 3]` on an ordinary Linux SYN. The probe emits it packed into a u64, and a u64 reaches 2^64 while a JS number is exact only to 2^53, so the packed form could not be held without rounding; the rounding would land in the low bytes, which are the option kinds themselves. The array holds the same information and is queryable per position. It also replaces the old `tcpOptsOrder`, which packed 4 bits per option and so could not tell MSS from TCP Fast Open, or Window Scale from MD5, and could not represent MPTCP at all.
  
  `tcpOptsFlags` and `tcpOptsOrder` are kept and still read. A pronode running an older chaddy still sends them, and years of rows hold them, so removing them would both lose the rollout window and break any routing rule already reading them. They go undefined on new sessions once the fleet is rolled.
  
  `tcpTsval` and `tcpTsecr` are written only when the Timestamps option was actually on the SYN. A TSval of 0 is legal and a TSecr of 0 is expected, so neither can use zero to mean absent.
  
  Six places named every one of these fields by hand — the middleware's copy onto the request, the session write, and four task files building the decision-machine bag. They now all go through one list, with a compile-time check that every field of `RawTlsSignals` is on it. That is not tidying: the Session projection comment in `@prosopo/types-database` records a field being missed in exactly this way, after which the rules reading it got `undefined` and silently never fired against real traffic.
  
  Separately, the provider compose no longer defaults the sidecar to `prosopo/tcp-probe:latest`. The probe's reply is a bare fixed-size struct with no version in it, so the image tag is the only statement of which layout a host serves, and publishing `:latest` would change that on every pronode at the next pull with nobody running a deploy. The default is now the `0.1.1` both Protect inventories already pin.
  
  Tests: the new headers all parse; a packed value above 2^53 decodes without losing its low bytes; the kind pairs the old encoding aliased stay distinct; a trailing end-of-option-list terminates the list rather than appearing in it; an all-zero packed value reads as absent rather than as an empty list; malformed and out-of-range values are ignored; the legacy header pair is still read; and a zero is kept rather than dropped, since `ipIdent` 0 and `tcpTsecr` 0 are real readings.
- Updated dependencies [a17e8eb]
- Updated dependencies [dcb691b]
  - @prosopo/util@3.3.14
  - @prosopo/locale@3.7.0
  - @prosopo/util-crypto@13.6.0

## 5.12.0
### Minor Changes

- ede4352: Admin tokens can now be bound to one provider and used only once. `jwtVerify` takes optional checks for the `aud` claim and for the longest allowed lifetime, and the provider's admin check uses them. A token that names an audience must name this provider: its host, `https://` plus its host, or one of the values in `PROSOPO_ADMIN_JWT_AUDIENCE`. A token that carries a `jti` is accepted once per provider process. Tokens may live at most one hour (`PROSOPO_ADMIN_JWT_MAX_LIFETIME_SECONDS`).
  
  Migration: tokens without `aud` or `jti` are still accepted, so current callers keep working. Callers should add both, for example `pair.jwtIssue({ expiresIn }, { aud: provider.url, jti: randomUUID() })`, minting one token per provider and per request. Callers that reuse one token for several requests to the same provider must mint a new one per request before they add `jti`. Once every caller sends `aud`, set `PROSOPO_ADMIN_JWT_REQUIRE_AUDIENCE=true` to refuse tokens without it.

### Patch Changes

- 2145922: A wrong image answer no longer just closes the popup. The widget now says "Not quite — try again" beside the checkbox (the same translated line the puzzle uses), and the checkbox stays clickable so the user can have another go. This happens even when the site supplies its own failed callback, and it survives the frictionless widget restarting itself after the failure. The notice clears as soon as the user starts again.
- Updated dependencies [ede4352]
- Updated dependencies [de6bb08]
- Updated dependencies [b017dfb]
- Updated dependencies [8ed0eb8]
- Updated dependencies [06784d0]
- Updated dependencies [8d7ba8c]
- Updated dependencies [995e954]
- Updated dependencies [97a799e]
- Updated dependencies [9fc1e8a]
- Updated dependencies [4461043]
- Updated dependencies [92edebd]
- Updated dependencies [54a07f3]
- Updated dependencies [b75e9b7]
- Updated dependencies [6d5b7f5]
  - @prosopo/util-crypto@13.6.0
  - @prosopo/util@3.3.13
  - @prosopo/locale@3.6.2

## 5.11.1
### Patch Changes

- 254bc05: Add an optional `padBytes` to traffic-filter category policies, so an operator can tarpit a category (e.g. proxy) instead of hard-blocking it: pair a high `powDifficulty` with `padBytes` and that category's challenge is made expensive in both CPU and bandwidth.
  
  When a request matches a category that carries `padBytes` — `challenge` or `block`, since a blocked category still hands out a deferred challenge at request time — the provider appends that many bytes of incompressible padding to the challenge issuance response. So a category set to `block` still burns the caller's bandwidth on the way to being blocked. The count is resolved from the live traffic-filter verdict at request time — nothing is persisted, and the bytes never come from the client. The padding is streamed pad-first (before the real challenge fields) so a scraper can't read the prefix and abort, and it is bounded at 5 MiB so it can't be turned into an amplifier.
  
  Off by default and fully backward-compatible: with no `padBytes` configured, responses are byte-for-byte unchanged. A single response-wrapping middleware applies the padding, so no challenge endpoint can bypass it.

## 5.11.0
### Minor Changes

- b77c5f4: The image captcha widget now tells the provider whether each tile, and the checkbox, was picked with a mouse or finger or with the keyboard. Keyboard presses have no screen position, so they all arrive as (0, 0). The provider used to see those repeats as a script clicking the same pixel and reject people who solve with the keyboard. It now looks for repeated positions among pointer selections only. It rejects a keyboard selection that claims a position. Requests from older widgets, which send no input method, are checked as strictly as before. The input method is stored on the commitment next to the coordinates.

### Patch Changes

- 59b7e87: The request schemas now cap the arrays that callers can send: at most 10,000 `puzzleEvents` on a puzzle solution, 256 `captchas` on an image solution, 64 `solution` entries per captcha, and 64 entries in a byte-array `datasetId`. A request over a cap fails validation straight away, without checking each element first. Before, the arrays had no limit, so one 1 MB request could hold about 150,000 items for the provider to validate, store and echo back. The caps are well above what the widget sends: it records one puzzle event per pointer move during a drag, an image challenge has at most 32 rounds by default, and each captcha has 9 images.
- 0c8678e: The DNS event ingest endpoint now checks each event on its own. One malformed event used to make
  the whole batch fail validation, so every good event sent alongside it was lost. Bad events are now
  dropped and counted, the rest are stored, and the response reports how many were dropped. A single
  warning names up to five of the dropped events and why they failed.
- dab0338: A site owner's `isVerified` call no longer hangs when the provider stops answering. Requests from `@prosopo/api` clients can now carry a timeout, and `@prosopo/server` sets one of 10 seconds for its verify calls. You can change it with the new `providerRequestTimeoutMs` config option. When the timeout fires, `isVerified` throws `API.BAD_REQUEST` with code 504 and the user is not verified. Before, the call waited for the platform default of about 300 seconds. Browser clients keep their current behaviour.
- Updated dependencies [294b480]
- Updated dependencies [0d29dde]
  - @prosopo/locale@3.6.1
  - @prosopo/util@3.3.12

## 5.10.2
### Patch Changes

- fda0eba: Decision machines can now see which page the captcha was rendered on. `currentUrl` (the top-frame page) and `iframeUrl` (the widget's own frame, when embedded) were already stored on the session and already read back from the database, but the verify-time path never passed them to the decision machine, so rules always saw them as undefined.
  
  They are now forwarded on all three verify paths (image, PoW and puzzle). No behaviour changes on its own — it just makes the fields available to rules that need to treat an embedded widget differently from a first-party one.
  
  Both values are reported by the client and are not checked against the request's Origin or Referer header, so a rule must not hand out an exemption on the strength of these fields alone.
- 1728cd0: Carry the detector bundle's `keyMap` through the pool push.
  
  `keyMap` is an opaque per-bundle decode parameter, written alongside each
  bundle by the pool build and meaningless without it — the same contract as
  `payloadLayout`. The admin pool-replace body schema never declared it, so zod
  stripped it from every push, and the endpoint's persist step then wrote the
  bundle back to disk without it.
  
  The result was a pool the provider served but could not decode: the push
  returned success with `persisted: true`, the bundles loaded and sessions were
  assigned them, but what they produced could not be read. Pools copied onto the
  volume were unaffected, because that path never goes through the schema.
  
  Adds `keyMap` to `ReplaceDetectorPoolBody` and writes it in
  `persistDetectorBundlePool`.
- 20542d8: Send page scroll events with the captcha's behavioural data.
  
  The widget now passes a fourth collector, the page's scroll position and the
  time of each scroll, alongside mouse, touch and click data, and the provider
  stores it as `c4` on the captcha record. People scroll in uneven bursts while
  bots tend to scroll at a steady rate, so this gives detection something to
  work with. Detector bundles that predate the scroll tracker simply send no
  `c4`.
- eebe6ee: Stop re-sending a consumed sessionId, and keep `CAPTCHA.NO_SESSION_FOUND` off the checkbox.
  
  A provider consumes a session when it issues a challenge against it, so a second challenge fetch carrying the same id cannot succeed. Three changes follow from that:
  
  - The puzzle widget's wrong-answer path called `manager.start()` again on the same session. It now hands back to the frictionless wrapper through `onReload`, which mints a new session and re-mounts the widget with `autoStart` — the same route the reload button already took. `onReload` gains an options argument, and `ProcaptchaProps` gains `startShowRetry`, so the replacement challenge still carries the retry prompt across the re-mount.
  - The puzzle manager tracks the id it has already exchanged for a challenge and short-circuits rather than re-sending it, covering the other paths that re-enter `start()`. The id is marked once the provider has answered, not before the request goes out, so a throw still falls over onto another provider.
  - `CAPTCHA.NO_SESSION_FOUND` is now treated as an internal recovery signal in the puzzle, PoW and image widgets and in the frictionless wrapper: where a re-mint is going to happen the widget holds its loading state instead of rendering the error. With no recovery route available the error is still shown.
  
  The wrapper's restart is no longer a flat ten seconds. `getRestartDelayMs` in `@prosopo/procaptcha-common` doubles it to a two-minute ceiling, jittered over the top half of each interval, so a client that keeps losing its session retries indefinitely at a bounded rate.

## 5.10.1
### Patch Changes

- 4c9b84b: Escalate a PoW solve to an image captcha when it arrives from a different address than the challenge.
  
  A PoW challenge is bound to the user account and the site key and to nothing about where the request came from, so a solved challenge can be carried to any host that wants a free pass. The issuing address is already on the record, so binding to it costs nothing: `verifyPowCaptchaSolution` now compares it against the address submitting the solve and escalates when they differ, under a new `IP_CHANGED` reason.
  
  Escalation, not denial. A phone handing off between towers mid-solve is a real user and should pay a picture rather than be turned away. For the same reason IPv6 is judged on the /64 alone — the interface identifier in the low 64 bits rotates by design under RFC 8981, several times a day on one unchanged connection — and an address we could not read counts as unchanged.
  
  Only applies where a session is linked, since escalation carries the originating session's risk profile forward. Missing coordinates still takes precedence as the reported reason when both fire.

## 5.10.0
### Minor Changes

- a9141c3: Stop loading zod before the widget can draw itself. Takes another 13KB gzipped off the critical path.
  
  zod is 14KB gzipped and it was being downloaded and parsed before the checkbox appeared, because six small things on the startup path happened to use it:
  
  - two lists of strings in `@prosopo/logger` (log levels, output format)
  - two lists of strings in `@prosopo/locale` (language codes, translation keys)
  - two lists of two strings in `@prosopo/types` (start mode, challenge placement)
  - one four-field object in `@prosopo/load-balancer` (a provider entry)
  - an `instanceof ZodError` check in `@prosopo/common`
  - `INPUT_LIMITS`, a plain table of numbers, that happened to live in the same file as zod-based string builders
  
  None of these need a validation library. They are now plain TypeScript: a list, a type, and where input is untrusted, a one-line guard. `INPUT_LIMITS` moved to its own file so reading it no longer drags the builders along.
  
  zod has not gone anywhere — the real request and response schemas in `@prosopo/types` still use it, and still validate exactly as before. It now arrives with the code that needs it, after the widget is on screen, rather than in front of it.
  
  Two API changes for anyone importing these directly:
  
  - `LanguageSchema`, `TranslationKeysSchema`, `StartModeSchema` and `Placement` are no longer exported as zod schemas. Use `isLanguage()`, `isStartMode()`, `isPlacement()` to check a value, and `LanguageCodes`, `translationKeys`, `StartModes`, `Placements` for the lists.
  - `isZodError()` now recognises a zod error by its name rather than `instanceof`. That is strictly more tolerant: the name still matches when an error crosses a realm boundary or comes from a second copy of zod, which `instanceof` misses — it was already the fallback arm of the same check.
  
  Two behaviour notes: a malformed entry in the fetched provider list now throws a plain `Error` naming the entry, where it used to throw an untranslated zod error; and the language codes accepted are unchanged.
  
  Covered by the existing suites for every package touched (types, types-database, locale, logger, common, load-balancer, all five procaptcha packages, api, cli, api-express-router, server, and the provider's 1322 unit tests), all passing. The built bundle was also loaded in a real browser: the widget renders from the first eight chunks, zod arrives in the second wave, and the provider's error came back translated into German.

### Patch Changes

- Updated dependencies [a9141c3]
- Updated dependencies [a9141c3]
- Updated dependencies [a9141c3]
  - @prosopo/locale@3.6.0
  - @prosopo/util-crypto@13.5.33
  - @prosopo/util@3.3.11

## 5.9.2
### Patch Changes

- Updated dependencies [59c02da]
  - @prosopo/locale@3.5.0

## 5.9.1
### Patch Changes

- a22069d: Let a Block access rule name the reason it fired, so the 403 says why instead of "Forbidden"
- Updated dependencies [a22069d]
  - @prosopo/locale@3.4.4

## 5.9.0
### Minor Changes

- a606f54: Detector signals now travel in a single open field, `d`, instead of one named
  field each.
  
  Previously every signal the detector reported needed adding by hand in about a
  dozen places — the decoder, two type files, the Mongoose schema, the read
  projection, the session write path, the escalation copy, and each machine's
  input — and missing any one of them dropped the signal with no error. Signals
  were in fact being dropped that way: one was persisted but never reached a
  decision machine at all, and three more were lost whenever a user was escalated
  from PoW to another challenge.
  
  Now the provider carries whatever the detector reported without knowing what it
  is, and hands it to decision and routing machines as `input.d`. A rule can read
  a signal that no release of `@prosopo/types` or `@prosopo/provider` has ever
  heard of, so adding one no longer requires a release of either. Values keep
  their types: a boolean arrives as a boolean and a number as a number.
  
  The bag is client-controlled data that gets persisted, so it is sanitised and
  capped on ingress — key names Mongo cannot store are dropped, values that are
  not JSON are dropped, and there are limits on key count, string length, array
  length, nesting depth and total size.
  
  Two things to note when deploying. Sessions written before this change carry
  the old named fields and no `d`, so queries and dashboards that read those
  fields need a `d.` prefix; the sessions collection expires after a day, so the
  overlap is short. And the sparse session index moves to a dotted path inside
  the bag.
- 0f23010: Correlate captcha sessions with Prosopo Protect sessions on sites that run both.
  
  Protect's challenge page already renders the widget with `data-sessionid=<its session id>`, so captchas served from the interstitial can be matched back to the Protect session. A widget the site embeds itself — on its own pages — had no way to know that id, so those sessions could not be matched to anything.
  
  The widget now falls back to reading Protect's session id from the page (`window.prosopo_protect.jti`, or the `prosopo_session` cookie Protect sets on the site's domain) when the site has not supplied a session id of its own. A session id the site does supply always wins, so nothing changes for sites that use the field themselves, and sites without Protect are unaffected. Only the id is read — the session token that shares the cookie never leaves the page.
  
  Two gaps in the existing field are closed alongside it: the widget now sends the session id when it first asks for a captcha rather than only when submitting a solution, and the provider records it on the session at that point. Previously a session that was allowed without a challenge, or abandoned before the user solved one, carried no session id at all. An escalated session now inherits the id from the session it escalated from.

## 5.8.5
### Patch Changes

- be25974: Two optional per-site settings are now passed through to the client. Sites that
  do not set them are unaffected.

## 5.8.4
### Patch Changes

- f4e4a83: chore(deps): roll up the open dependabot bumps (react 19.3, mongoose 9.10, @polkadot/util 14, redis 6, cron-parser 5, react-i18next 17 with i18next 26, @scure/base 2, cypress 16, rollup/babel plugin majors, vitest 4.1.11, angular 20.3.28, js-yaml)
- c386199: Carry each detector bundle's `payloadLayout` from its pool entry through to the decoder.
  
  Pool bundles now ship an extra opaque per-bundle value alongside the private key and inner config, and the decoder needs it to read what that bundle's detector produced. The pool loader reads it from `{id}.json`, the persist and admin-push paths keep it, and the frictionless decrypt passes it to `decodePayload` along with the key.
  
  Bundles without one — pools built before this — behave exactly as before, so a provider can be updated ahead of its pool.
  
  Covered by pool tests that the value survives load, persist and reload, and by the existing decrypt tests.
- d4e9425: Replace `any` with real types: the PoW challenge id validator now takes a `string`, and scheduled task result `data` is `Record<string, unknown>`.
- 0be8838: Look up user callbacks on `window` without `any`, so each callback is type-checked against the arguments it is actually called with. Only a leading `window.` is now stripped from a callback name. The `error-callback` render option type now accepts the `Error` it is called with.
- Updated dependencies [f4e4a83]
- Updated dependencies [d710b7f]
- Updated dependencies [ae121df]
  - @prosopo/locale@3.4.3
  - @prosopo/util-crypto@13.5.32
  - @prosopo/util@3.3.10

## 5.8.3
### Patch Changes

- 028a158: Add optional field `dz` to detector payload
- 3958046: Keep a detector bundle binding for as long as its payload is accepted
  
  The `detectorSessionId → bundleId` binding held the only key able to read a
  detector payload, and expired after 60 seconds. The frictionless flow accepts a
  payload for ten minutes (`DEFAULT_MAX_TIMESTAMP_AGE`). For nine of those ten
  minutes the provider would therefore accept a payload it had already discarded
  the means to decrypt: `resolveDecryptAttempts` returns an empty key list, the
  decrypt loop never runs, the score is forced to 1 and the caller is challenged
  despite nothing having been measured about them.
  
  Sixty seconds is ample for the assign → submit gap in the normal case — it is
  around 1.5s — but it only has to stall once to be lost, and a backgrounded
  mobile tab is enough.
  
  The two values are now one value. `DEFAULT_MAX_TIMESTAMP_AGE` moves from a
  private constant in `frictionlessTasks` to `@prosopo/types`, the only package
  both the provider and the database can see, and `DETECTOR_BUNDLE_TTL_SECONDS` is
  derived from it instead of being written down a second time. A unit test pins
  the relationship so they cannot drift apart again.
  
  The TTL cannot now outlive the payload-age check, so this does not widen the
  window in which any payload is usable. Bundle selection is unaffected: which
  bundle a caller receives is derived from their IP and a server secret, not from
  this binding's lifetime.
- 028a158: Add optional session field `dz`.
- Updated dependencies [864ddde]
  - @prosopo/locale@3.4.2

## 5.8.2
### Patch Changes

- 477b4e7: Persist cv and sq from detector payload, and refresh the decoder bundle
- e4d6f06: Persist cg and sm opaque payload keys

## 5.8.1
### Patch Changes

- 0c1f301: feat(types,provider): report `host` in `/details`
  
  `providerDetailsSchema` grows an optional `host`, and the `/details` handler
  populates it from `config.host`, falling back to the request's hostname when
  that is unset — the same shape `/healthz` already uses.
  
  `/details` already reports the version and Redis readiness; it just did not
  say which node answered. Callers that want the answering node's identity can
  now read it there instead of inferring it from a liveness endpoint.
  
  The field is optional on purpose. A fleet is mixed-version part-way through a
  rolling deploy, so a required field would fail validation against a node that
  has not been upgraded yet. Consumers should treat it as absent-or-string.
  Purely additive: nothing existing changes shape.
- 32d286d: Persist b from detector payload

## 5.8.0
### Minor Changes

- af267c2: Web Bot Auth verifier and an authenticated frictionless flow for pre-verified agents.
  
  **`@prosopo/web-bot-auth`** — a new package: an RFC 9421 HTTP Message Signatures verifier built on `@noble/curves/ed25519`, with no Cloudflare dependency. It parses `Signature-Agent` in both its bare-string and dictionary forms, resolves the signer's JWKS at `/.well-known/http-message-signatures-directory` honouring the response's cache-control TTL, and verifies the Ed25519 signature over the RFC 9421 signature base.
  
  **Provider fast path.** `/captcha/frictionless` returns `captchaType: authenticated` when a non-`deferToVerify` `AccessPolicyType.Allow` rule matches the request's user scope, and writes a session with `serverChecked: false`, `agent: true` and the issuing IP frozen for verify-time binding. Decrypt, bot score and the decision machine are all skipped. A verified `Signature-Agent` is one way to qualify — the userScope gains a `webBotAuthAgent` field, set only when signature verification succeeded so a rule scoped to a signer can never be matched by a spoofed header — but an IP CIDR, JA4, user agent, ASN or country rule qualifies the same way. A `Block` or `Restrict` on the same match set always wins, because severity outranks Allow.
  
  **`/client/authenticated/verify`.** A separate router with mandatory IP binding — the operator must forward the client IP (`API.AUTHENTICATED_IP_REQUIRED`) and it must match the one the session was issued to (`API.AUTHENTICATED_IP_MISMATCH`), so a leaked token cannot be replayed from elsewhere. Single use is enforced through `serverChecked`, and `captchaType` is checked so an ordinary captcha token cannot be redeemed on this route. `clientSessionId` correlation goes through the same `isClientSessionMismatch` helper as pow / image / puzzle, so the authenticated path cannot drift from the others.
  
  **Surface.** `AccessPolicyType.Allow` and `CaptchaType.authenticated`; `webBotAuthAgent` on the user scope (indexed, normalised at parse time to a lowercase scheme+host with no trailing slash); `Session.agent` / `Session.webBotAuthAgent` for the Traffic view's "pre-verified pass" filter; `submitAuthenticatedCaptchaVerify` on `ProviderApi` and the matching branch in `@prosopo/server.verifyProvider`; `AuthenticatedBadge` and a dispatch branch in `procaptcha-frictionless`.
  
  Three fixes the new end-to-end coverage turned up, each of which broke the flow outright:
  
  - `ipMatchesSession` compared the operator's parsed IP against the session's composite halves with `===`. A session read back from Mongo carries BSON (`Decimal128`, or `Long` on pre-migration records), not the `bigint` the type claims, so the comparison was false for every session that had been through the database — every legitimate redemption was rejected as `API.AUTHENTICATED_IP_MISMATCH`. Both halves are now normalised before comparison, and an unparseable half fails closed rather than defaulting to `0n`, so garbage still cannot match garbage.
  - `serverChecked` was never written onto the authenticated session, so "never set" and "consumed" were distinguishable only by an absence. It is now written as `false` at issuance.
  - `serverChecked` was missing from `SESSION_PROJECTION`. Left out, the single-use check reads `undefined` and an authenticated token verifies an unlimited number of times.

### Patch Changes

- 929d99b: Default `trafficFilter.abuserScoreThreshold` to 0.2.
  
  The mongoose default was `0`. The abuser score runs 0..1 with 0 meaning "clean", so a `0` threshold applies the `abuser` category to every IP carrying any non-zero score, which is the widest the field can be set. A site that had never opened the traffic filter got that by default.
  
  `trafficFilterAbuserScoreThresholdDefault` moves from 0.5 to 0.2 and `@prosopo/types-database` now reads it instead of its own literal, so the zod default, the mongoose default and the provider's runtime fallbacks (`checkTrafficFilter`, `enrichDnsEvent`) all resolve to one number.
  
  `trafficFilter` is optional on `ClientSettingsSchema` and no create-site path sends one, so the mongoose default is what a new site key actually gets — the zod default only applies once a caller supplies a `trafficFilter` object.
  
  Existing sites keep whatever value is stored; only records with no value are affected.
- 934fa5d: feat(types,provider): carry the client's `b` signal map on DetectorResult
  
  `DetectorResult` grows an optional `b?: Record<string, string[]>`, and
  `getBotScore` forwards it, following the same shape as the existing `g`, `i`,
  `sw`, `md`, `bn` and `fs` fields: read off the decoded payload, passed through
  untouched, absent for clients that predate it.
  
  Typing it is the whole change. Without it the field arrives on the provider
  untyped and any rule reading it has to assert its shape at the call site.
  
  The map is keyed by signal name with a short list of strings per key. It is
  empty for the great majority of sessions, so anything consuming it should
  treat absent and empty as the same thing. Adding a key is a client-side
  change and needs no deploy here — an existing decoder passes through keys it
  predates rather than dropping the ones it knows, which is the property that
  lets the two sides move independently.
- 27f525e: Stop the puzzle difficulty ladder silently replacing a site's own puzzle settings.
  
  An escalated puzzle session samples its render settings from a difficulty band, and a sampled band sets every knob — decoy count, edge darkness, hole darken, piece scale and tolerance. While that is happening the site's configured `puzzle` block and `puzzleTolerance` are not consulted at all. For a site using escalation that is the intent; for a site that deliberately configured an easier puzzle it means the settings it saved never render, which reads as "my settings aren't being saved".
  
  Two changes:
  
  `puzzleMaxDifficulty` is a new client setting — the puzzle counterpart to `imageMaxRounds`. It caps how far automatic escalation may climb the ladder, and `0` pins the site to level 0, the documented "nothing escalated" case where the session is left bare and the site's own settings render every time. It defaults to `MAX_AUTO_ESCALATION_LEVEL`, so sites that never set it keep the behaviour they have.
  
  Separately, the paths that measured nothing about a client — `MISSING_TOKEN`, `MISSING_HEAD_HASH` and `DECRYPTION_FAILED` — no longer feed the ladder. Each sizes its challenge from a fixed constant chosen to be short ("prove you're human quickly", per their own comments), not from any signal the client produced, but those constants sit above the default baseline of `DEFAULT_SOLVED_COUNT` and so scored as an escalation. A site whose CSP blocks the detector bundle sends no token on every request, so every one of its users was permanently escalated. `OLD_TIMESTAMP` deliberately keeps the ladder: its round count comes from `timestampDecayFunction`, which scales with staleness and is a real graduated measurement.
  
  Explicit router and traffic-filter overrides are unaffected in both cases — an operator naming a value still gets it.

## 5.7.0
### Minor Changes

- d288371: Let a site choose where a challenge opens, and which button triggers it.
  
  - `placement: "popup" | "float"`, also `data-placement`. `popup` is the default and unchanged. `float` opens the challenge directly above the widget and keeps it pinned there as the page scrolls, leaves the page usable behind it, and dismisses on Escape or an outside click. An invisible widget always uses popup.
  - `bind: "#selector"`, also `data-bind`. The matching host-page button triggers that one widget, in visible or invisible mode. The click's default action is prevented so a submit button does not post the form before a token exists.
  - `execute(widgetId?)`. Called with no argument every widget responds, as before. Called with the id `render()` returns, only that widget runs. Implicitly rendered invisible buttons now trigger only their own widget.
  
  Behaviour changes for existing widgets:
  
  - Escape now closes the image and puzzle challenge in both placements. For the image captcha this runs the cancel path, which fires `onClose` and restarts frictionless.
  - Image and puzzle now present on one shared `ChallengeSurface`. Both were already portalled to `document.body`, so neither moves in the page, but the markup around them changed: the outer layer keeps `prosopo-modalOuter` for the image captcha and also carries `prosopo-challenge-surface`, and a new `prosopo-challenge-content` element sits between it and `prosopo-modalInner`. A direct-child selector such as `.prosopo-modalOuter > .prosopo-modalInner` no longer matches, and the centring transform now lives on `prosopo-challenge-content` rather than on `prosopo-modalInner`.
  
  `createConfig` takes a named options object.

### Patch Changes

- 6f57ee9: chore(deps): bump the npm-minor-and-patch group across 1 directory with 3 updates
- Updated dependencies [6f57ee9]
  - @prosopo/util@3.3.9

## 5.6.0
### Minor Changes

- 80f73c1: Sites can now control when the widget starts working.
  
  By default the widget runs bot detection, starts the behavioural collectors and calls `/frictionless` as soon as it mounts. Rendering with `data-start-mode="manual"` (or `startMode: "manual"` in the render options) keeps all of that off the page load: the checkbox still appears immediately, at its final size, so nothing shifts, but the widget does nothing else until one of two things happens.
  
  - The site calls `window.procaptcha.start()`, optionally with a widget id, or dispatches a `procaptcha:start` event on `document`. The frictionless flow runs and the widget then waits for a click exactly as it does today.
  - The visitor clicks the checkbox. The frictionless flow runs and whichever challenge the provider chooses opens straight away, carrying that click's position, so the visitor is never asked to click twice.
  
  Both triggers are one-shot: whichever comes first wins and the other is ignored. `window.procaptcha.execute()` also starts a manual widget, opening its challenge immediately. Widgets in the default `auto` mode are unaffected.
- 8a670d3: Remove the provider-side context validation path.
  
  The provider read a per-context baseline out of `clientcontextentropies` on the frictionless path and compared a session's head hash against it. The task that wrote that collection was removed from the provider on 2026-08-21, so the read has returned `undefined` ever since and the branch has been dead in every deployment since then. Computing and applying the baseline now happens off-provider.
  
  Removed: `contextAwareValidation.ts`, the decision-machine branch that used it, `getClientContextEntropy` on the provider and its database method, the `clientContextEntropy` table registration, the unused `getRoundsFromSimScore` helper, and the `contextAwareEnabled` parameter threaded into image verification — which logged and then did nothing, its return commented out.
  
  Also removes the per-site `settings.contextAware` block that configured it, along with `ContextAwareSchema`, `IContextAware`, `IContexts`, `ContextConfigSchema`, `contextAwareThresholdDefault` and `expandContexts`, the legacy `default`/`webview` context keys and their helpers, and `FrictionlessReason.CONTEXT_AWARE_VALIDATION_FAILED`. The site-key registration CLI no longer writes a `contextAware` default into new sites.
  
  `ContextType`, `contextTypeFromSession` and `deviceContextTypes` stay — the off-provider work keys on them. `ClientContextEntropyRecord` and its schema stay for the same reason; only the provider's use of them goes.
  
  No behaviour change: every path removed here was already inert.

### Patch Changes

- 89dd38a: chore(deps): batch the outstanding dependabot bumps into one upgrade
  
  Rolls up dependabot PRs #3112, #3127-#3134 and #3159. Majors: `mongoose`
  8 -> 9, `bson` 6 -> 7, `@noble/curves` 1 -> 2, `@polkadot/util-crypto`
  13 -> 14, `@typegoose/auto-increment` 4 -> 5, `@babel/preset-env` 7 -> 8,
  `@types/jsdom` 21 -> 30, `@types/bcrypt` 5 -> 6, `@actions/github` 6 -> 9,
  `testcontainers` 11 -> 12. The rest are minor/patch.
  
  Code changes the majors forced:
  - `@noble/curves` v2 requires `.js` specifiers and renamed the point API,
    so `secp256k1.ProjectivePoint.fromHex(...).toRawBytes()` becomes
    `secp256k1.Point.fromBytes(...).toBytes()`, `RistrettoPoint` becomes
    `ristretto255.Point`, and `abstract/utils` moves to `utils.js`.
  - mongoose 9 drops `RootFilterQuery` (now `QueryFilter`), no longer sets
    `background: true` on schema indexes by default, and no longer declares
    `id` on `Document`, which un-hid a mismatch between
    `updateDappUserCommitment`'s `Hash` parameter and the `string` `id` it
    filters on.
  - mongoose 9 rejects an aggregation-pipeline update (an array) unless the
    call passes `updatePipeline: true`, so the six pipeline writes in
    `ProviderDatabase` now opt in explicitly.
  - mongoose 9's `castUpdate` throws on a `$setOnInsert` key inside `$set`.
    `storeUserImageCaptchaSolution` passed its record straight in as the
    update, and mongoose's `moveImmutableProperties` mutates that object on
    an upsert -- adding the very `$setOnInsert` key the record then carried
    into `CentralDbStreamer.streamImageRecord`. Image records stopped
    reaching the central DB (the streamer is fire-and-forget, so it only
    logged) and signup verification returned 500. The update is now an
    explicit `$set` over a shallow copy.
  - `@prosopo/database` moves from mongodb 6.20 to 7.5 to match the driver
    mongoose 9 pulls, so bson 7 is the only copy resolvable in the package.
  - `vitest`/`@vitest/coverage-v8` go to 4.1.11 alongside dependabot's
    `@vitest/spy` bump; leaving them at 4.1.10 installed a second copy of
    `@vitest/spy` and broke type inference in the provider test utils.
- Updated dependencies [1b77849]
- Updated dependencies [89dd38a]
  - @prosopo/util-crypto@13.5.31
  - @prosopo/locale@3.4.1
  - @prosopo/util@3.3.8

## 5.5.3
### Patch Changes

- a62b994: Context-aware validation buckets by device type, not just webview.
  
  Context-aware validation compares a session's head SimHash against a baseline
  for its context. That context was `default | webview`, which puts a phone and
  a desktop in the same bucket — and those two emit genuinely different
  `<head>`s, so the blended baseline matches neither well. Contexts are now the
  device family crossed with the webview flag: `desktop`, `desktop-webview`,
  `mobile`, `mobile-webview`, `tablet`, `tablet-webview`.
  
  `desktop-webview` is included deliberately. Desktop webviews are a real and
  notably fraudulent population here (see the Twickets desktop-webview rules),
  and folding them into the plain `desktop` baseline would let exactly the
  traffic we want excluded define what "normal desktop" looks like.
  
  **Classification.** `deviceTypeFromUserAgent` in `@prosopo/types` is a
  dependency-free UA classifier, deliberately not ua-parser-js: this module is
  imported by the browser bundles, and the off-provider entropy sweep has to
  bucket stored sessions *identically* or it writes baselines the decision
  machine never looks up. One shared function keeps the two sides in lockstep.
  Tablets are matched before phones because an iPad's UA carries a
  `Mobile/<build>` token and an Android tablet is exactly "Android without
  Mobile". Known gap, documented at the call site: an iPadOS 13+ Safari in
  desktop mode identifies as a Mac and lands in `desktop` — nothing in the UA
  separates it from a real Mac, and both sides make the same call, which is
  what matters for the lookup.
  
  **Back-compat.** `default` and `webview` remain valid `ContextType` members,
  so settings already stored against them keep parsing. `expandContexts` maps a
  legacy `default` onto the three non-webview families and a legacy `webview`
  onto the three webview families, at the threshold they were saved with; an
  explicit device entry always wins over the legacy entry covering it. Nothing
  downstream of settings parsing branches on the legacy keys, and no data
  migration is required.
  
  **Behaviour change.** A request whose context is not configured now skips
  context validation instead of borrowing another context's baseline.
  Previously, configuring a single context validated *every* request against it
  — with six contexts that would measure desktop traffic against a tablet
  baseline and reject real users wholesale. `isContextConfigured` is the new
  guard; `determineContextType` now takes the raw request UA alongside the
  webview flag.
  
  New site-key registrations default to all six device contexts.
- a447afa: Per-sitekey `imageMinRounds` alongside the existing `imageMaxRounds`.
  
  Every source of an image round count — access-policy rules, traffic-filter categories, routing machines, the staleness curve, and the provider's own heuristics — is now clamped into `[imageMinRounds, imageMaxRounds]` via `clampImageRounds`, so the sitekey's settings override its rules in both directions rather than only capping them. `imageMinRounds` defaults to 2, matching the floor that was previously hard-coded, so existing sitekeys are unaffected.

## 5.5.2
### Patch Changes

- 458cf17: Let a site disable image or puzzle under frictionless, and give the puzzle a difficulty ladder.
  
  Adds `frictionlessTypes: { image, puzzle }` to `ClientSettingsSchema`. PoW is deliberately not toggleable: it is the decision machine's terminal fallback and the only type with no interaction requirement, so a site with both of these off still has a way to challenge. This replaces the practice of expressing "no image" as a `frictionlessImageThreshold` nobody can reach — the rung is a score boundary, and a site that wants image off should not have to encode that as an unreachable threshold.
  
  Enforcement is a single seam. `downgradePuzzleIfUnavailable` is replaced by `coerceToEnabledCaptchaType`, which folds render-availability together with the site's enabled-type constraint; the old helper fell back to image unconditionally, which on an image-disabled site would have served exactly the type the customer asked us never to serve. It is applied at the two points a session's captchaType is decided — `sendCaptcha` (after the routing machine, so it is the last word) and `buildEscalation` — which transitively covers the score ladder, the no-measurement gates, access-policy Restrict rules, traffic-filter category policies, routing-machine actions and detector-generated rules. Coercion only ever narrows, so it cannot hand a user a harder challenge than was asked for. A PoW escalation is not an escalation, so a site with both interactive types disabled no longer escalates a verified PoW solve at all.
  
  An image captcha expresses severity as a round count; a puzzle has none, so on an image-disabled site every escalation would otherwise collapse into an identical challenge. `PUZZLE_DIFFICULTY_LEVELS` is an ordered ladder mapped from that same round-count currency by `severityToPuzzleDifficulty`, expressed as rounds *above* the site's ordinary count so it means the same thing across sites. Each level is a band per knob rather than a fixed config, sampled per challenge: fixed values are learnable, and adjacent bands overlap so a single observed render does not identify the level a session was placed in. Level 0 samples nothing, leaving a site's own configured `puzzleTolerance` / `puzzle` settings in force — escalation should not silently rewrite configuration. Automatic escalation is capped below the hardest level, because with image disabled there is no fallback modality for a user who genuinely cannot solve it.
  
  Sampling reuses the stratified interleaved draw already used for piece size, extracted to `stratifiedSampler`, with one cursor per knob — a shared cursor would make the knobs advance in lockstep and let a solver infer the whole config, and hence the level, from a single value. Draws are server-side and per-challenge, never seeded from client-supplied input, so a request cannot be replayed to reproduce a render. The invariant the ladder walks toward — the real cutout staying the deepest region on the frame — is now enforced in `resolvePuzzleRenderSettings`, the only point the final pair is known, since site settings and a traffic-filter policy each set one half without sight of the other and can invert it through individually valid overrides.
  
  Also closes two paths that issued image challenges without honouring the sitekey's `imageMaxRounds`: `buildEscalation` took a router-supplied round count entirely unbounded, and `sendCaptcha` skipped its clamp whenever the routing context carried no ceiling. Both now fall back to the schema default rather than leaving the count unbounded.

## 5.5.1
### Patch Changes

- 0a88895: Project the session fields callers read, and let routing machines set puzzle overrides.
  
  `getSessionRecordBySessionId` lists its fields explicitly but declared a full `Session` return type. That type lie let callers read fields the projection never selected — they get `undefined`, with no error anywhere. This is the fourth time it has shipped: after the tcp-probe fields (verify-time TCP decide rules received `undefined` and never fired) and `clientMetaData` (#3141), this round found the entropy fingerprints plus the `g`/`i`/`sw`/`md`/`bn`/`fs` flags — which silently disabled the origin-session fallback in `getSessionRecordWithOriginFallback` *and* made it issue a redundant second query on every escalation, since every `needsX` check was trivially true and the origin read back `undefined` too — along with `ruleType` (fed into `DecisionMachineInput` by all three verify paths, so any decide rule gating on the matched access rule was dead), `powDifficulty` and `isProtect`.
  
  Adds the 13 missing fields, then makes it structural: the projection is now `SESSION_PROJECTION` and the return type is derived from it as `ProjectedSession`, so reading an unprojected field is a compile error. The other three projected queries were audited and are correct; `getClientRecord` is safe by construction for the same reason, its return type being `Pick`-narrowed to match.
  
  Separately, `RoutingMachineOutput` gains `puzzleTolerance` and `puzzle`, so a routing machine that inherits a trafficFilter `challenge` policy can reproduce it exactly. `getPuzzleCaptchaChallenge` re-derives its overrides from a live trafficFilter verdict, which a machine-chosen puzzle has no counterpart for, so the values are persisted on the session and layered in there. Both are bounded by the same field validators the portal uses.
  
  Also: `deriveTrafficPolicies` forwards a site's per-category `trafficFilter` policies to routing and decision machines, so a machine can tell "the operator rejects this egress class" from "the operator deliberately accepts it"; `sendCaptcha` now persists the router's `reason`, which previously never reached the session on the route phase and was invisible in the portal; and `runArtifactExport`'s schema generic is corrected from `z.ZodSchema<T>` (which pins Input === Output === T, so any `.default()` in the tree made `T` unify with the input shape) to `z.ZodType<T, z.ZodTypeDef, unknown>`.

## 5.5.0
### Minor Changes

- eb34de6: Add a puzzle band to the frictionless flow.
  
  `settings.frictionlessThreshold` becomes an object with two rungs instead of a single number:
  
  ```
  frictionlessThreshold: {
    frictionlessPuzzleThreshold: 0.5,
    frictionlessImageThreshold: 1.0,
  }
  ```
  
  Scores at or below the puzzle rung still pass silently to PoW and scores at or above the image rung still get an image captcha, but everything in between — suspicious without being conclusive — now gets a puzzle rather than being lumped in with the worst traffic.
  
  The puzzle rung defaults to the value `frictionlessThreshold` already had, so no site's silent-pass boundary moves. Putting both rungs on the same value opts out of the middle band.
  
  A bare number is still accepted wherever the setting is read or parsed, and means what it always meant (the puzzle rung), so records written before this release keep working while they are migrated. Unlike the puzzle rung, the image rung is not capped at 1: the score it is compared against is a total that server-side penalties add to.
  
  Image challenges served on the score path are now sized by how many signals fired, rather than a fixed count.

## 5.4.0
### Minor Changes

- 4b1cb19: Correlate a site-supplied session id across render and verify.
  
  A site can now hand the widget its own session identifier — Protect's JTI, or any per-user session id it already holds — and have the provider confirm at verify time that the token was earned in that same session. Render it with `data-sessionid="..."` or `renderOptions.sessionId`, resolved the same way `mode` and `language` already are, so implicit, explicit and invisible-button renders all pick it up. Pass the same value as the new trailing `clientSessionId` argument to `ProsopoServer.isVerified`.
  
  The widget attaches it to the solution as `clientMetaData.clientSessionId`. It is persisted on the captcha record (PoW, puzzle and image alike) and mirrored to a new top-level `clientMetaData` key on the session record — an object rather than a flat field, because more render-time metadata is expected to land there. It survives the PoW→image/puzzle escalation handoff, since the escalated widget is mounted with the same config.
  
  At verify, when the value is supplied and the solve does not carry exactly that value — including carrying none at all, which is what a token minted outside the site's session looks like — the token is disapproved with the new `ResultReason.CLIENT_SESSION_MISMATCH` (`API.CLIENT_SESSION_MISMATCH`, translated in all 31 locales), recorded on both the captcha record and the session.
  
  Omitting the id preserves existing behaviour, so this is opt-in and backward compatible. The verify request field is `clientSessionId` rather than `sessionId` because `VerificationResponse.sessionId` already means the provider's own frictionless session; same-named request and response fields meaning different things would be a trap for integrators.

### Patch Changes

- Updated dependencies [4b1cb19]
  - @prosopo/locale@3.4.0

## 5.3.0
### Minor Changes

- b30ad41: Return the verified record's `sessionId` on the verify endpoints.
  
  `VerificationResponse` gains an optional `sessionId`, populated by the image, PoW and puzzle verify paths from the challenge/commitment record they looked up. It lets a caller correlate its own logs with the provider's: the sessionId is carried in neither the procaptcha token nor the verify request body, so the provider is the only party that can supply it. Absent when no record was found, or when the flow carried no session. Not tier-gated, since it is a correlation handle rather than a scoring signal.

## 5.2.6
### Patch Changes

- 68a9b41: chore(deps): bump the npm-minor-and-patch group across 1 directory with 36 updates
- ce5a3d7: Fix the reload button on the image captcha closing the challenge instead of loading a new one. Reload now asks the frictionless wrapper for a fresh session and re-mounts the widget so a new challenge opens straight away, and the checkbox click position is carried over to the replacement solve
- Updated dependencies [68a9b41]
  - @prosopo/locale@3.3.1
  - @prosopo/util@3.3.7

## 5.2.5
### Patch Changes

- 6411f64: feat(provider,types): surface tcp-probe + ipInfo on routing raw
  
  `RoutingMachineRawSignals` gains the 9 raw TCP-handshake fields
  (`synNs / synackNs / ackNs / observedTtl / tcpMss / tcpWscale /
  tcpOptsFlags / tcpOptsOrder / tcpWindow`) and the per-request
  `ipInfo` payload. Callsites that build a routing raw — the
  frictionless entry, its dedup replay branch, and the PoW submit
  post-pow hop — spread `req.ipInfo` alongside the existing
  `rawTlsSignalsForSession(req)`, gated on the discriminated-union
  success branch so the routing machine never sees an
  `isValid:false` error payload.
  
  Route-time `ipInfo` is separate from the existing decide-kind
  `input.ipInfo` (persisted on the Session record at verify time).
  The DM helper is being updated in the captcha-private
  decision-machines package to resolve both channels through one
  matcher surface.

## 5.2.4
### Patch Changes

- c629c01: Randomise puzzle piece size, silhouette family, and decoy depth. New per-client `puzzle.pieceScale.{min,max}` and `puzzle.decoyHoleDarken` settings on `ClientSettingsSchema`; defaults preserve behaviour where possible.

## 5.2.3
### Patch Changes

- 7faca4d: Add TLS timings into session doc
- c971ef7: fix(provider,types,types-database): drop the `s` field from `Session`,
  `DetectorResult`, and the mongoose `SessionRecordSchema`. The client
  no longer emits it, so the server-side wiring is redundant.
  
  Stop reading position 18 out of the decrypted client payload in
  `getBotScore`. Prune every `s`/`ss`/`sv` local, log field, and
  `createSession` argument in `frictionlessTasks.ts`, the origin-fallback
  merger in `captchaManager.ts`, the frictionless handler, and
  `submitPoWCaptchaSolution.ts`. Two `s`-focused unit tests removed.
  
  Backward-compatible: older clients still send position 18, the new
  server just ignores it. Existing Mongo docs keep their `s` values;
  mongoose stops projecting or writing the field. No migration needed.

## 5.2.2
### Patch Changes

- ae475a5: Add optional `s` field on `Session`.

## 5.2.1
### Patch Changes

- 35f640f: Render puzzle captcha imagery on the provider instead of sending the answer to the client.
  
  The challenge used to carry `targetX`/`targetY` and the widget drew the target box straight from them, so any HTTP client could echo the coordinates back as its solution and pass without a browser. The provider now synthesises a background procedurally, cuts the notch into the pixels, and returns the background and piece as data URIs; the target and the tolerance never leave the server.
  
  Backgrounds come from the new `@prosopo/puzzle-assets` package and are single-use — reusing one across two challenges would let an attacker diff the composites and recover both notch positions.

## 5.2.0
### Minor Changes

- 234c737: Ship raw iOS WKWebView DOM signals (`sw`, `md`, `bn`, `fs`) alongside the classifier verdict `isWebView`.
  
  The four booleans that `classifyIosWebViewFromSignals` folds into `isWebView` are now decrypted off the client payload (positions 14-17) and surfaced individually on `DetectorResult` and in the "decryptPayload result" info log. Short-acronym keys match the existing `g`/`i` wire convention. Backwards-compatible: `isWebView` at position 4 is untouched; older catcher clients that don't emit positions 14-17 log the fields as `undefined`.
  
  Motivation: real iOS 17.7.x devices appear to expose one or more of these APIs even on stock WKWebView (unlike the iOS 18 Simulator the classifier was audited against), collapsing iOS Twickets `webView:true` from 97.6% to 0.2% post-v3.7.8. Shipping the raw signals lets server-side rules retune the aggregation from live traffic in OpenObserve without a catcher release.
  
  Note: `decodePayload.js` (obfuscated production build) still needs to be rebuilt to parse positions 14-17 out of the delimited payload and expose them as `result.sw`/`result.md`/`result.bn`/`result.fs`. Until that ships, the fields log as `undefined`.

## 5.1.2
### Patch Changes

- ee5d250: Add a diagnostic admin endpoint `AdminApiPaths.GetSession` that returns
  a session's current Mongo + Redis views verbatim, plus a cypress
  consistency suite that walks a session through frictionless → pow →
  pow-submit and asserts the two stores agree on `captchaType`,
  `bundleId`, and `deleted` at each stage. Backs a class of prod bugs
  where the two stores drifted (dedup evicting mid-flow, escalations not
  propagating to Redis, etc.) surfacing as `INCORRECT_CAPTCHA_TYPE` 400s
  on the client rather than as store-consistency errors.
  
  Also adds a frontend-error-path unit test covering the case where the
  client sends a `detectorSessionId` whose bundleId is no longer in the
  in-memory pool (rotation / TTL). Asserts the handler does NOT evict
  and does NOT rebind — reuse response served with the cached sessionId
  unchanged; any downstream OAEP failure surfaces cleanly via the DM's
  empty-BDP path.

## 5.1.1
### Patch Changes

- cec44bb: Add optional `i` field on `Session`.

## 5.1.0
### Minor Changes

- 0def557: feat(traffic-filter): per-category policy with `block` or `challenge` action; challenge overrides captcha type + params at request time.

## 5.0.4
### Patch Changes

- 216f8cd: Record the access rule that actually fired on the record it acted on, so the
  audit page can name the exact policy behind a block rather than echoing its
  optional free-text description.
  
  Access rules are ephemeral — client rules carry a TTL and are reaped by
  Mongo's `expiry` index — so an audit row can't answer "which policy blocked
  me?" by joining to the live rules collection: by the time anyone looks, the
  rule is usually gone. `describeMatchedRule` snapshots the matched rule (policy
  type, captcha type, `deferToVerify`, description, rule group, and its scope
  conditions in record form) onto `Session.matchedRule` at enforcement time.
  
  Previously only the request-time block middleware recorded any rule identity,
  and only as a hash, a field-name list and a description. It is now written by
  every access-policy path: the block middleware, the frictionless entry (block,
  auto-ban, forced captcha type, and score-only restrict alike), and the
  verify-time hard-block check in the PoW / image / puzzle flows — which is where
  `deferToVerify` rules land, and where "why was I rejected?" was least obvious.
  
  `checkForHardBlock` now returns the whole `AccessRule` rather than just its
  policy half; the runtime value was always the full rule.

## 5.0.3
### Patch Changes

- 16dbab0: chore(deps): bump ip-address from 10.0.1 to 10.5.0
  
  The @angular/core and @angular/common bumps in the angular integration demo are
  not listed here: that demo sits below the root `integration/*` workspace glob, so
  changesets does not know it and errors on a changeset naming it.
- 063e69d: Add optional `g` field on `Session`.
- Updated dependencies [16dbab0]
- Updated dependencies [9091a78]
- Updated dependencies [d5e104b]
  - @prosopo/util@3.3.6
  - @prosopo/locale@3.3.0

## 5.0.2
### Patch Changes

- d6cb841: feat(provider,database,types): session chain — escalations reference origin, DM-input reads walk back for missing fields
  
  Adds `originSessionId` to the Session schema and populates it on escalation sessions in `submitPoWCaptchaSolution.buildEscalation`. Adds `CaptchaManager.getSessionRecordWithOriginFallback` — a session reader that, when the record is an escalation missing an inherently-origin-populated field (`simdReadings`, `dnsEvent`, `entropyMathRandom*`, `entropyCrypto*`, `entropyWallClockOffsetMs`), reads the origin session and fills the gap. Escalation-owned fields (`captchaType`, `sessionId`, `score`, `ipInfo`, `headers`, etc.) are never overridden.
  
  The three `serverVerify*CaptchaSolution` methods now use the walker instead of the raw `getSessionRecordBySessionId`, so decision-machine inputs on escalated puzzle / image sessions see the origin's SIMD readings and DNS event.
  
  Fixes the write-time race between (a) the origin's fire-and-forget SIMD attach via `scheduleMongoSimdReadingsUpdate` on pow-submit, and (b) `buildEscalation`'s immediate Mongo read — which left ~97% of escalation sessions with no `dnsEvent` and ~97% with no `simdReadings`, in turn tripping decide-machine deny rules (SIMD_ABSENT etc.) on legit escalation flows.
  
  Non-escalation sessions and older escalation records without `originSessionId` fall through as a no-op — no behavior change. Extra Mongo read only fires when the escalation is actually missing a fallback-eligible field.

## 5.0.1
### Patch Changes

- 2aabe73: Remove the client-controlled `detectorUnavailable` frictionless bypass. A client could set the flag and be handed a PoW challenge without any detection running. The flag is gone from the wire format, the API client and the widget; the only remaining bypasses are provider-side (maintenance mode, empty detector bundle pool).
  
  The frictionless decision machine now gates on payload presence after the access-rule ladder: no token serves a 3-round image captcha, a token without its head hash serves a 2-round one.
- bcef918: Adds a per-email submission-count rate limit on the verify pipeline. Site operators can now cap how many server-checked captcha submissions any one normalised email (Gmail dot / `+tag` tricks collapsed across providers) may back before further submissions from that address are rejected with `API.SPAM_EMAIL_COUNT_EXCEEDED`.
  
  - New `spamFilter.emailRules.maxEmailSubmissionCount` (int, min 1, optional) on `ClientSettingsSchema`.
  - New `metadata.emailNormalised` field on all three captcha records (image / PoW / puzzle) — written alongside `metadata.email` whenever `storeMetadata` is on. Backed by a partial index (`spamEmailCount_partial`) on each collection.
  - New DB method `countCommitmentsByNormalisedEmail(dappAccount, emailNormalised)` sums the three per-collection counts so limits span captcha types.
  - Puzzle verify gains a `spamFilter` parameter to bring it to parity with img/pow for the count check.
  - English + all 31 non-English locales gain the `API.SPAM_EMAIL_COUNT_EXCEEDED` translation.
  - Fixes silent-drift bug: `UserSettingsSchema.spamFilter.emailRules` was missing `maxEmailSubmissionCount` on the mongoose side, which strict mode would have dropped on `$set`.
- Updated dependencies [bcef918]
  - @prosopo/locale@3.2.9

## 5.0.0
### Major Changes

- 787017b: chore(detector): remove the legacy detector-key rotation machinery
  
  Nothing has read these keys since the detector moved to per-session provider
  bundles — the decrypt paths resolve a bundle's own keypair instead. Rotating
  them was already a no-op, so the whole surface is removed rather than left
  looking live.
  
  **Breaking — the admin API loses two endpoints:**
  
  - `POST /v1/prosopo/provider/admin/detector/update` (`AdminApiPaths.UpdateDetectorKey`)
  - `POST /v1/prosopo/provider/admin/detector/remove` (`AdminApiPaths.RemoveDetectorKey`)
  
  Also removed: `ProviderApi.updateDetectorKey` / `.removeDetectorKey`;
  `ClientTaskManager.updateDetectorKey` / `.removeDetectorKey`;
  `IProviderDatabase.storeDetectorKey` / `.getDetectorKeys` / `.removeDetectorKey`;
  the `detector` Mongo collection and its `DetectorRecordSchema` / `DetectorSchema`
  / `DetectorKey` types; the `UpdateDetectorKeyBody` / `RemoveDetectorKeyBodySpec`
  / `UpdateDetectorKeyResponse` API types; and the rate-limit config for both
  paths.
  
  The `detector` collection itself is left in place on existing deployments — no
  migration drops it. It can be dropped manually once the pool rollout is
  confirmed.

### Minor Changes

- 787017b: feat(detector): serve the detector only from per-session provider bundles; PoW fallback
  
  The detector now lives ONLY in the provider-served, precomputed pool bundles — there is no detector bundled into the widget and no legacy detector-key pool. Each session's bundle encrypts everything it produces (bot score, SIMD readings, behavioural data) with its own RSA keypair + inner ChaCha20-Poly1305 cipher; the provider decrypts each payload with that exact bundle, resolved per session.
  
  - `DetectorBundlePool`: loads precomputed `{id}.js`/`{id}.json` bundle pairs from disk, uniform-random per-session selection, hot-swap `replace()` for the admin push channel.
  - The pool is ALWAYS initialised at boot (a missing/empty dir yields an empty pool), collapsing the old three states into two: bundles present ⇒ per-session serving; no bundles ⇒ always PoW.
  - Redis short-TTL `detectorSessionId → bundleId` binding; the resolved `bundleId` is promoted onto the durable session record so later hops (SIMD attach, PoW/puzzle/image solution submit) decrypt with the same bundle.
  - Client: removed the inlined `@prosopo/detector` runtime import (now type-only). When no provider bundle can be obtained/run, the client signals `detectorUnavailable` and the provider serves a PoW challenge.
  - All server decrypt paths (score, SIMD readings, behavioural data) resolve the session's bundle and pass its inner cipher; the legacy key-pool brute force and its env fallback are removed from the detection paths. Decrypt failures fail closed (treated as bot ⇒ PoW).
- 787017b: feat(detector-pool): persist pushed pools, stamp releases, fix the failed-decrypt path
  
  - `ReplaceDetectorPool` gets a dedicated 128 MB body limit (~86 MB for a
    100-bundle pool); every other route keeps the 1 MB backstop.
  - A pushed pool is now written to the pool directory (staged + renamed) so it
    survives a restart instead of living only in process memory. The response
    reports `persisted` so an unpersisted push can be alarmed on. The provider
    containers gain a host-mounted volume for it — the pool is never baked into
    the image, which is public on Docker Hub.
  - Bundles carry the release they were built from; providers skip bundles from
    another release (`PROSOPO_DETECTOR_POOL_RELEASE`). The widget carries no
    detector of its own, so nothing else tied the two together.
  - Failed decryption is now its own decision (`DECRYPTION_FAILED`, 3 image
    rounds) evaluated before every other check. Previously the synthetic
    `userAgent: undefined` / `baseBotScore: 1` / `timestamp: 0` that
    `decryptPayload` substitutes made these sessions land in USER_AGENT_MISMATCH
    (6 rounds), or a 401 on sitekeys with `autoBanScoreThreshold` set.
    `timestampDecayFunction` loses its now-unreachable `decryptionFailed` arm.

### Patch Changes

- 6f19cde: Add unit and type tests for the shared types: request sanitisation, client settings defaults, test site keys, captcha dataset types, decision-machine counters and procaptcha tokens.

## 4.10.0
### Minor Changes

- 270a8d8: Add unit and type tests for `@prosopo/ipinfo`, with the injection seams needed to write them.
  
  - `IpapiBackend` accepts an injected `fetch` and a configurable `timeoutMs`; `MaxMindBackend` accepts an injected `openReader`; `IpInfoService` accepts injected backends.
  - `parseAbuserScore` no longer throws when the upstream omits `abuser_score`. The field is declared required by the response type but is not validated on the wire, and a missing value used to turn an otherwise successful lookup into a generic "Network or parsing error".
  - `IPInfoResult.isValid` is now the literal `true` rather than `boolean`, making `IPInfoResponse` an actually discriminated union. Previously `if (!res.isValid)` narrowed to nothing, so `res.error` did not compile and consumers had to cast.
  - The backends, their config types and the injection seams are re-exported from the package entrypoint, along with `isNonRoutable`.

### Patch Changes

- 103318c: feat(traffic-filter): add `datacenterNameDenylist` alongside the existing allowlist
  
  Operators can now name datacenter / provider / ASN organisations they want
  force-included in the datacenter block, mirroring the shape of
  `datacenterNameAllowlist`. Denylist entries take precedence over the
  `providerType === "isp"` short-circuit and over the allowlist for the same
  name, so operators can opt named providers back into the datacenter rule when
  upstream classifies them as ISP.
  
  Same case-insensitive / whitespace-trimmed matching, same three name sources
  (`datacenterName`, `providerName`, `asnOrganization`), same
  `MAX_DATACENTER_ALLOWLIST_ENTRIES` / `MAX_DATACENTER_ALLOWLIST_ENTRY_LENGTH`
  validators. Missing or empty denylist preserves existing behaviour.
  
  Wired through the mongoose `ClientSettings.trafficFilter` schema, the zod
  `TrafficFilterSchema`, `checkTrafficFilter`, and `enrichDnsEvent.countDc` so
  the denylist is honoured on both the primary rule and the DNS-asymmetry
  scoring. Unit tests cover the ISP-bypass override, the allowlist-precedence
  edge case, category-suppression interaction, and the extras path.
- e14fce6: chore(deps): bump vite to 6.4.3 and mongoose to 8.24.1, and adjust types for the mongoose 8.24 Document/ObjectId changes
- Updated dependencies [2c47bb7]
- Updated dependencies [0e1171c]
- Updated dependencies [e14fce6]
  - @prosopo/util@3.3.5
  - @prosopo/locale@3.2.8

## 4.9.12
### Patch Changes

- a0cb39e: fix(traffic-filter): default skipExtrasOnValidDnsPath to true

## 4.9.11
### Patch Changes

- b9ca0e7: feat(decision-machine): thread puzzle fields and forward checkbox coords on escalation
  
  - Add optional `coords` and `puzzleEvents` to `DecisionMachineInput` so decision machines can gate on entry-point telemetry and puzzle drag trails.
  - Populate `coords` on the pow, puzzle and image `decide()` inputs. Puzzle also passes `puzzleEvents`. Image gains `behavioralDataPacked` / `deviceCapability` — previously always undefined, which silently disabled the global synthetic-mouse-timing check on the one captcha type it targets.
  - Extend `ProcaptchaEscalationHandler` with an optional `coords` argument so the PoW widget can forward its trusted checkbox click through the PoW→image/puzzle escalation. The frictionless wrapper prefers escalation coords over pending retry coords. Puzzle and image widgets already accept `startCoords`, so the escalated widget now seeds the salt with the real (x, y) instead of (0, 0).

## 4.9.10
### Patch Changes

- 0a4f902: fix(server): dispatch verify by captchaType so puzzle tokens hit the puzzle endpoint
  
  Puzzle tokens were silently failing server-side verification. `ProsopoServer.verifyProvider` only had two branches — `challenge` present → PoW verify, absent → image verify — but puzzle tokens carry a challenge too, so they were routed to `/VerifyPowCaptchaSolution` and 404'd on the pow record lookup (`captchastorage.puzzlecaptchas.serverChecked` stayed 0/N in prod). Customers using the puzzle flow got `verified: false` on legitimate solvers.
  
  Fix in two parts:
  
  - `@prosopo/types`: adds `captchaType?: CaptchaType` to `ProcaptchaOutputSchema` and appends `Option(str)` to `ProcaptchaTokenCodec`. The pre-existing binary layout is preserved in a frozen `ProcaptchaTokenCodecV1`, and `decodeProcaptchaOutput` falls back to it for tokens minted by client bundles that predate this field.
  - `@prosopo/server`: `verifyProvider` now dispatches on `captchaType` (puzzle → `submitPuzzleCaptchaVerify`, pow → `submitPowCaptchaVerify`, image → `verifyDappUser`) with per-type `cachedTimeout` recency checks. The legacy challenge heuristic is kept as a fallback for old tokens with a `warn`-level log so ops can see the tail-off.
  - `@prosopo/procaptcha-pow` / `procaptcha-puzzle` / `procaptcha`: each Manager now sets the correct `captchaType` on the object passed to `encodeProcaptchaOutput`.
  
  Backwards compatibility: pow and image tokens minted by any prior client bundle continue to verify. Puzzle tokens minted by old bundles still fall through to the pow branch and 404 — same behaviour as before — until the customer upgrades both the client bundle and `@prosopo/server` together.

## 4.9.9
### Patch Changes

- Updated dependencies [b500d56]
  - @prosopo/locale@3.2.7

## 4.9.8
### Patch Changes

- 85e8857: Record both the top-frame URL and the widget's own iframe URL on frictionless sessions.
  
  Previously the client only sent one field (`currentUrl`), which for embedded widgets resolved to the top-frame URL — so we lost visibility into which iframe endpoint the session was actually loaded through. Now the client sends both:
  
  - `currentUrl`: the top-frame URL (same resolution rules as before — same-origin iframes read `window.top.location.href` directly; cross-origin iframes fall back to `document.referrer`).
  - `iframeUrl`: the widget's own frame URL when embedded. Undefined when the widget IS the top frame (nothing to distinguish).
  
  Both fields are sanitised client- and server-side (origin + path only; query string, fragment and any embedded credentials stripped). The provider persists both on the `Session` record and re-uses them on post-PoW escalation sessions. Only `currentUrl` is gated in the frictionless decision machine (unchanged — missing `currentUrl` still forces an image captcha); `iframeUrl` is recorded for analytics.
  
  Both fields are also surfaced to the decision machines as raw signals: `RoutingMachineRawSignals` gains an optional `iframeUrl` populated from the freshly decrypted frictionless payload on the `route` phase, from the persisted Session record on the `postPow` phase, and from the cached Session in the dedup replay path — matching how `currentUrl` is already threaded through.
  
  Additionally, sessions carry a new computed boolean `isProtect`, set at session-creation time when the widget iframe was served from `protect.<tenant>` and embedded in a page on the same tenant (subdomain-of matching, dot-boundary safe — see `isProtectDeployment` in `@prosopo/util`). Persisted only when true (same pattern as `isEscalation`) and backed by a sparse `{isProtect, createdAt}` index so analytics can cheaply retrieve Protect sessions without re-parsing URLs. Post-PoW escalation sessions inherit the flag from the origin session.
- Updated dependencies [85e8857]
  - @prosopo/util@3.3.4

## 4.9.7
### Patch Changes

- 8bde5df: Persist `isEscalation: true` on Session records minted by the post-PoW routing machine.
  
  The escalation path in `submitPoWCaptchaSolution.buildEscalation` creates a follow-up session (image or puzzle) whenever the router decides the PoW-verified user still needs a stronger challenge. Analytics couldn't previously separate those escalated sessions from cold frictionless sessions since both shared the same shape — every downstream count that wanted to reason about "did we escalate this user?" had to reverse-engineer the origin/escalation link from the redis cache mapping.
  
  The field is optional on the schema and only written when true, so ordinary frictionless sessions stay slim and older records still parse.

## 4.9.6
### Patch Changes

- b3f351b: fix(procaptcha): random provider re-selection + backoff on error fallback
  
  When a provider errored, the widget retried the same DNS-routed endpoint immediately and in a tight loop. A fleet of widgets whose provider was unhealthy could therefore accidentally DDoS the provider fleet — retrying the same (possibly-down) endpoint as fast as the event loop allowed.
  
  The error-fallback path now:
  
  - **Re-selects a different provider on retry.** The first attempt still hits the DNS-routed endpoint (unchanged happy path, preserves session stickiness). On a retry the widget picks a random provider straight from the provider list (`getRandomProviderFromList`), weighted by provider capacity and excluding the URL that just failed. In development the list holds only the single local provider, so a retry simply re-targets that provider.
  - **Backs off between retries.** `providerRetry` now waits an exponential-backoff-with-full-jitter delay (0.5s → 1s → 2s → 4s …, capped at 10s) before retrying, so a down provider is no longer hammered and a fleet of clients that all errored at once don't reconverge into a thundering herd.
  
  Applies to the image, PoW and puzzle managers and the frictionless detection flow. New shared `ProviderSelectRetryContext` type; `BotDetectionFunction` gains an optional retry-context argument.
- 17bc76e: feat: switch handshake timings from milliseconds to microseconds
  
  Milliseconds bucket fast handshakes (local proxies, same-DC clients) to 0/1 and destroy the distribution shape we need for proxy detection. `time.Now()` on Linux is ~1μs precise via vDSO — μs is the honest resolution ceiling.
  
  Wire changes (must land together with the paired chaddy release):
  
  - Headers consumed by `handshakeTimingMiddleware`: `x-tls-tcp-to-chello-ms` / `x-tls-chello-to-handshake-ms` → `x-tls-tcp-to-chello-us` / `x-tls-chello-to-handshake-us`.
  - Request augmentation, `HandshakeTiming` fields, decision-machine input, `Session` shape (Zod + Mongoose schemas): `tcpToChelloMs` / `chelloToHandshakeMs` → `tcpToChelloUs` / `chelloToHandshakeUs`.
  - New sessions in `captchastorage.sessions` will now write `tcpToChelloUs` / `chelloToHandshakeUs` in μs. Historical `*Ms` fields on existing session records remain as-is (not migrated) — analytics that read both must range-scan by field name.
  
  Rollout: deploy paired chaddy image (emits `-Us` headers) simultaneously; the deploy-order window drops timing signal but no data corruption is possible (mismatched header names simply resolve to `undefined`).

## 4.9.5
### Patch Changes

- 6cb3218: feat(provider): relax captcha-flow rate limits 5x and log 429s
  
  - Default rate limits for the captcha-flow endpoints (get/submit image, PoW, frictionless and puzzle challenges, plus the verify endpoints) are now 5x more permissive. The previous defaults were rate limiting legitimate widget traffic.
  - The provider now logs a warning whenever a request is rejected with a 429, including the path, IP and site key, so operators can alarm on sustained rate limiting.

## 4.9.4
### Patch Changes

- de12b31: feat(provider): capture and persist per-TLS-connection handshake timings
  
  Adds `handshakeTimingMiddleware` that reads two new headers forwarded by the chaddy Caddy plugin and threads the values through to the frictionless session store, so every persisted Session document carries them alongside `ipInfo` / `headers` / the entropy fingerprints.
  
  - `X-TLS-TCP-To-Chello-Ms` — server-observed ms from TCP accept to first ClientHello byte
  - `X-TLS-Chello-To-Handshake-Ms` — server-observed ms from ClientHello to handshake complete
  
  Elevated values indicate the client's ClientHello traversed a proxy chain before reaching Caddy — the CH bytes only reach the terminating TCP stack after every hop, so the deltas inflate with the full client-to-exit RTT rather than just the last-mile RTT.
  
  Middleware wires in immediately after `ja4Middleware` in `startProviderApi`. Both fields are optional throughout (`tcpToChelloMs?: number`, `chelloToHandshakeMs?: number`) on `Session`, `SessionSchema`, and the Mongoose model, so pre-migration documents parse and dev requests that skipped TLS still write cleanly. `express.d.ts` extends `AugmentedRequest` and `Express.Request` with the same two optional fields. No handlers are modified beyond the frictionless captcha challenge path; persisting on the other captcha-type storage paths (image / PoW / puzzle direct) is a follow-up.
  
  Depends on chaddy plugin support for emitting the two headers.
- 770954b: feat(provider): surface handshake timings and currentUrl to routing machines
  
  Extends `RoutingMachineRawSignals` with three optional fields so operator-authored routing machines can read them alongside JA4, headers, UA, and SIMD:
  
  - `tcpToChelloMs?: number`
  - `chelloToHandshakeMs?: number`
  - `currentUrl?: string`
  
  Threaded through every raw-signal construction site — the frictionless hot path, the dedup routing replay, `submitPoWCaptchaSolution`, and the postPow routing context construction. Timing values come from the current request (per-connection, fresh at every entry). `currentUrl` comes from the freshly decrypted frictionless payload at the `route` phase and from the persisted Session at the `postPow` phase, since the submit request's Referer is the captcha iframe rather than the host page.
  
  Follows the earlier PR that added the middleware capture and Session persistence for the two timing fields; this PR completes the surface by making them visible to operator-authored routers.

## 4.9.3
### Patch Changes

- 18d0287: fix(procaptcha-frictionless,procaptcha-pow,procaptcha-puzzle,procaptcha-react): auto-recover from `CAPTCHA.NO_SESSION_FOUND` on the inner widget without asking the user to click the checkbox a second time, and without dropping the click coordinates that would otherwise land in the solution salt as `(0, 0)`.
  
  Motivation. The in-flight dedupe added in the previous change only collapses `/captcha/{type}` POSTs that overlap in flight. A duplicate POST that fires ~1 s after the first has already settled (observed on iPhone WKWebView, incident 2026-07-01 21:23 UTC) still lands on a consumed session and returns `NO_SESSION_FOUND`. The pre-existing recovery for that case was a `setTimeout(restart, 100)` that tore the whole widget down and lost the checkbox click position.
  
  - `ProcaptchaProps` gains two optional props: `onSessionInvalidated(x?, y?)` and `startCoords: { x, y }`. Widgets not mounted under a recovery-aware parent still fall back to `frictionlessState.restart()`.
  - `procaptcha-pow`, `procaptcha-puzzle`, and `procaptcha-react` widgets now track the last `manager.start(x, y)` coords in a ref (either from the checkbox click or from `startCoords`) and, on the first `CAPTCHA.NO_SESSION_FOUND`, invoke `onSessionInvalidated(x, y)` instead of calling `restart()`. A per-instance ref makes it strictly one-shot — a second failure falls back to the existing restart path so a persistently broken session doesn't loop.
  - `ProcaptchaFrictionless` wires `onSessionInvalidated` through to each inner widget: it stashes the retry coords in a ref, re-runs its own `start()` (which re-invokes `/frictionless` and mints a fresh sessionId), then re-mounts the inner widget with `autoStart={true}` and `startCoords={x, y}`. The inner widget auto-fires `manager.start(x, y)` on mount so the eventual submit still embeds the real checkbox click position in the salt.
  - The recovery decision (one-shot fire, coord validation — `(0, 0)` and partial pairs are discarded because they're what an `autoStart` mount or an untrusted pointer event emits rather than a real click, and the consume-and-clear pending-coords ref) is extracted into `sessionInvalidatedRecovery.ts` with dedicated unit tests.

## 4.9.2
### Patch Changes

- 7a434e0: feat(provider): escalate verified PoW solves with missing coordinates to an image captcha. Every current widget embeds the checkbox click position in the solution salt, so a verified solve that arrives without coordinates didn't come through the official widget path. Such session-linked solves are now escalated to an image captcha via the existing post-PoW routing/escalation mechanism instead of being approved outright. Adds the `MISSING_COORDINATES` FrictionlessReason.
- Updated dependencies [f9e8c94]
  - @prosopo/locale@3.2.6

## 4.9.1
### Patch Changes

- 8986976: feat(provider): return compiled source in getAllDecisionMachines so the live code on each provider is auditable in a single call
- 970bca2: feat(provider): record the page URL a frictionless session originated from and require it
  
  The frictionless client now reports the page it was rendered on (built from `window.location.origin + pathname`) in the challenge request, and the provider stores it on the session as `currentUrl`. The value is reduced to scheme + host + path on both the client and the provider (`sanitisePageUrl`): the query string, fragment and any embedded `user:pass@` credentials are stripped so URL-borne secrets (tokens, reset codes, session ids) are never persisted. A session whose request carries no usable page URL is treated as a bot signal and forced down the image-captcha path (`FrictionlessReason.MISSING_CURRENT_URL`).
- Updated dependencies [970bca2]
  - @prosopo/util@3.3.3

## 4.9.0
### Minor Changes

- 1111ff2: Add a Prometheus `/metrics` endpoint to the provider/pronode API and instrument the captcha pipeline with a full metrics suite via `prom-client`. The endpoint is served on the existing internal API port (added to `PublicApiPaths`), gated by `PROSOPO_METRICS_ENABLED` (default on), and scraped by Vector over the internal docker network.
  
  Exposes: HTTP request counts/durations by route/method/status; captcha issued and verify outcomes by type/result/source; frictionless routing decisions; bot-score distribution and triggered detectors; blocked-request, domain-validation and spam-email outcomes; maintenance-mode and redis-readiness gauges; and default Node process metrics. High-cardinality identifiers (site key, user, IP, session) are kept out of labels and remain in the structured logs.

### Patch Changes

- b166037: fix(provider): length-bound and sanitise request inputs across the provider API endpoints.
  
  - Add shared zod helpers in `@prosopo/types` (`INPUT_LIMITS`, `boundedString`, `safeText`, `safeLine`): every request string field is now length-bounded, and human freetext additionally rejects control characters (null bytes etc.). Typing fields as strings already blocks Mongo operator injection; the control-character rejection covers the remaining log/header-injection vectors.
  - Apply the helpers across the provider request schemas (image/pow/puzzle captcha challenge & solution bodies, frictionless challenge, server verify, DNS event ingestion, sitekey register/remove, detector-key and decision-machine admin bodies, and the spam-email check). Tokens, signatures, behavioural/simd readings and decision-machine source get generous caps; accounts/site-keys/hashes/ids get tight ones.
  
  - Lower the provider API body-parser cap from 50 MB to 1 MB (`express.json` in `startProviderApi.ts`) as a coarse oversized-payload backstop before parsing.
  
  Email and IP fields are treated as length-bounded strings (email keeps its existing format check where present).
- Updated dependencies [b9f5eca]
- Updated dependencies [849af99]
- Updated dependencies [a5ba27b]
- Updated dependencies [d1fbde3]
- Updated dependencies [a26e9d0]
  - @prosopo/util-crypto@13.5.30
  - @prosopo/util@3.3.2

## 4.8.0
### Minor Changes

- 12cd0a6: Replace client-side weighted-random provider selection with static DNS endpoints.
  
  - Removed the `providerSelectEntropy` field from `DetectorResult`, `Session`, the
    Mongoose `SessionRecordSchema` (including its standalone index), and every
    call-site that threaded it through frictionless / image / pow / puzzle flows.
  - Removed `FrictionlessManager.hostVerified` and its decision-machine call site
    — there's nothing to verify when the DNS layer picks the host.
  - `getRandomActiveProvider(env)` now returns the per-environment static DNS
    endpoint (`pronode.prosopo.io` family) instead of fetching the provider list
    and weighted-selecting. The entropy parameter is gone.
  - `getProcaptchaRandomActiveProvider` is now a thin re-export so widget packages
    keep importing from `procaptcha-common`.
  - `FrontendProvider.datasetId` is dropped; `CaptchaRequestBody.datasetId` is
    optional. The server falls back to its own most-recently-uploaded dataset
    (`env.datasetId`, populated from `db.getMostRecentDatasetId()` at startup) —
    clients can't pin a dataset under DNS routing because they don't know which
    pronode they'll hit.
  - Removed dead `setProviderLoader` / `prefetchProviders` / `selectWeightedProvider`
    plumbing from `@prosopo/load-balancer`. The server's cacheFile-based loader
    setup in `startProviderApi` goes with them.
  - `getRandomActiveProvider` now hits `/healthz` on the global hostname once per
    page load, reads the responding pronode's identity from the JSON body, and
    pins subsequent captcha calls to that pronode (`https://pronodeN.prosopo.io`)
    so session creation and submission land on the same backend. Falls back to
    the dual-stack global hostname when `/healthz` is unreachable.
  - `/healthz` now returns `{ ok: true, host: <pronode-identity> }` instead of
    `"OK"` to support the above pinning.
  - CORS preflight is now cached for 24h (`maxAge: 86400`) — previously the
    browser refired an OPTIONS preflight before every captcha call because
    the custom `Prosopo-Site-Key` / `Prosopo-User` headers make the request
    non-simple and the default `maxAge` is 5s.
- 12cd0a6: Add ipv4-only / ipv6-only provider DNS routing via `data-ipv4` / `data-ipv6`.
  
  Dapps that need to pin captcha traffic to a single IP stack can now do so:
  
  ```html
  <div class="procaptcha" data-sitekey="..." data-ipv4="true"></div>
  ```
  
  What happens under the hood:
  
  - The widget reads `data-ipv4` / `data-ipv6` (or the matching `ipv4` / `ipv6`
    booleans on `ProcaptchaRenderOptions` / explicit `render(...)`) and threads
    them through `ProcaptchaConfigSchema`.
  - `pickIpMode(config)` resolves them into an `IpMode` (`"ipv4"` / `"ipv6"` /
    `undefined`); `ipv4` wins if both are set.
  - The frictionless / image / pow / puzzle managers pass the `IpMode` into
    `getProcaptchaRandomActiveProvider`, which calls `/healthz` on the matching
    single-stack global hostname (`ipv4.pronode.prosopo.io` or
    `ipv6.pronode.prosopo.io`) and pins subsequent captcha calls to
    `ipv4.pronodeN.prosopo.io` / `ipv6.pronodeN.prosopo.io`. The dual-stack
    cache and the single-stack caches are kept separate.
  - `convertHostedProvider` now accepts an optional `IpMode` and, when set,
    selects the matching `ipv4` / `ipv6` sub-object from the provider-list JSON.
    Top-level `ipv4` / `ipv6` keys are skipped by default so existing dual-stack
    callers keep working.
  - New helpers in `@prosopo/load-balancer`: `IpMode`, `stripIpModeLabel`,
    `getProviderHostname`.
  
  Coordinated with the matching `captcha-private` change that publishes the
  `ipv4` / `ipv6` sub-objects to S3.

## 4.7.4
### Patch Changes

- bb98af1: Add `DecisionMachineKind` (`routing` | `decision`) to separate routing and decision artifacts on the same provider.
  
  - New `DecisionMachineKind` enum in `@prosopo/types`.
  - `DecisionMachineArtifact` and the Mongoose `DecisionMachineArtifactRecordSchema` gain an optional `kind` field; the unique compound index becomes `(scope, dappAccount, kind)` so a routing machine and a decision machine can coexist for the same scope/dapp.
  - `ProviderApi.updateDecisionMachine` accepts an optional `kind` 10th arg; the `apiUpdateDecisionMachineEndpoint` admin handler reads `decisionMachineKind` from the request body and forwards it.
  - `ClientTaskManager.updateDecisionMachine` and the artifact-listing returns include `kind`.
  - `ProviderDatabase.getDecisionMachineArtifact` filters by `kind` when supplied; `upsertDecisionMachineArtifact` defaults missing `kind` to `Routing` for backward compatibility on existing rows.
  - `DecisionMachineRunner` keys its in-memory cache by `(scope, kind, dappAccount)` and selects the appropriate artifact for `runDecisionMachine` (kind=`decision`), `runRoutingMachine` (kind=`routing`) and `runCounterMachine` (kind=`routing`).
  - `DecisionMachineArtifactRecordSchema.captchaType` enum now includes `CaptchaType.puzzle` alongside `pow`/`image`.

## 4.7.3
### Patch Changes

- 89ab6fc: Extend verify-phase `DecisionMachineInput` with the session-derived fields the internal scorer/router already uses: `score`, `threshold`, `scoreComponents`, `decryptedHeadHash`, `userSitekeyIpHash`, `providerSelectEntropy`, `simdReadings`, `frictionlessReason`, `ruleType`, `webView`, `iFrame`. All fields are optional; existing decision-machine artifacts continue to work. Populates the new fields from `sessionRecord` at the three verify call sites (`powTasks`, `imgCaptchaTasks`, `puzzleTasks`).
  
  Also move the `autoBanScoreThreshold` check in `runDecisionMachine` to after all score-based penalties (webView, oldTimestamp, unverifiedHost) are applied. Previously the check ran against the pre-penalty score (`baseBotScore + lScore`), meaning thresholds above 1.0 were unreachable for clients whose detector saturates at 1.0 even when the post-penalty sum (the value the bot-score-above-threshold branch sees) comfortably exceeded the operator-set threshold. The check now operates on the full scored sum, matching the semantic operators expect from an "auto-ban threshold" knob. UA-mismatch and context-aware short-circuits still run first since neither touches the score.
- 0f3750b: Add optional `entropyMathRandomFingerprint`, `entropyCryptoFingerprint`, `entropyWallClockOffsetMs` and `entropyMathRandomFirst` fields on `Session` (Zod + Mongoose) and the frictionless `decryptPayload` → `setSessionParams` → `createSession` chain. Sparse compound index `{ siteKey, entropyMathRandomFingerprint, createdAt: -1 }` for query support.

## 4.7.2
### Patch Changes

- edcd450: Validate salt-encoded coords in PoW and puzzle verification and add a `CAPTCHA_INVALID_SALT` result reason. Invalid input now produces a disapproval rather than a partial write.
- 5295c4b: Traffic-filter `datacenterNameAllowlist` now matches `datacenterName`, `providerName`, or `asnOrganization` (was: `datacenterName` only). Lets the allowlist reach IPs where upstream sets `is_datacenter: true` without populating `datacenter.datacenter`.
  
  New opt-in `trafficFilter.skipExtrasOnValidDnsPath` (default `false`): when on and `dnsEvent.pathValid === true`, skip the filter evaluation on the DNS peer and resolver IPs.
- Updated dependencies [edcd450]
  - @prosopo/util@3.3.1
  - @prosopo/locale@3.2.5

## 4.7.1
### Patch Changes

- 46fedf4: Auto-start image/puzzle widget after PoW escalation so the user does not need to click the checkbox a second time.

## 4.7.0
### Minor Changes

- dde23e8: Internal bot-detection signal improvements.

### Patch Changes

- 3a46191: feat(traffic-filter): allowlist datacenter operators by name
  
  Apple's iCloud Private Relay exits from datacenter IPs, so sites with
  `blockDatacenter: true` were dropping legitimate Safari traffic. ipapi
  already reports the operator name verbatim in `datacenter.datacenter`
  — expose it on `IPInfoResult.datacenterName` and let `TrafficFilter`
  carry an optional `datacenterNameAllowlist` so operators can opt the
  relay traffic through without disabling the rest of the rule. Match
  is case-/whitespace-insensitive; the allowlist only suppresses the
  datacenter check, so a VPN/Tor/Proxy/Abuser hit on the same IP still
  blocks. New field is wired through Zod (capped 50 × 128 chars) and
  the Mongoose client settings schema so it persists.

## 4.6.1
### Patch Changes

- 4626340: perf(provider): cut p95 on /captcha/frictionless and /captcha/image
  
  Replaces the `$match → $sample` random-captcha lookup with an indexed
  range scan over a new `{datasetId, solved, randomKey}` compound index;
  reorders the `sampleContextEntropy` aggregation so `$sample` runs
  before `$lookup`; batches three pairs of independent awaits in the
  frictionless handler via `Promise.all`. Adds an integration test
  asserting via `.explain()` and wall-clock timing that the new paths
  are quantifiably faster. The legacy aggregation remains as a fallback
  in `getRandomCaptcha` so deployment can precede the
  providerBackfillCaptchaRandomKey rollout.

## 4.6.0
### Minor Changes

- 55b1388: Bit-level granular PoW difficulty via target-threshold check. `solvePoW` (client) and `validateSolution` (server) now compare the hash as a 256-bit big-endian integer against `target = 2^(256 - round(4 * difficulty))`, shared via `targetForDifficulty` / `hashMeetsDifficulty` in `@prosopo/util`. Integer difficulties produce *identical* behaviour to the legacy hex-prefix check (d=4 ≡ 16 leading zero bits ≡ threshold 2^240), so existing clients, configs, anomaly detectors, and stored records are unchanged. Fractional values quantise to bit-level granularity: each 0.25 step ≡ 1 bit ≡ 2× work, so providers can tune d=4.25, d=4.5, d=4.75 to fill the 16× gap between today's d=4 and d=5 — useful for landing on a sensible mobile UX. `powDifficulty` in `ClientSettingsSchema` and `RoutingMachineOutputSchema` drops `.int()`; wire format (nonce as `u32`, difficulty as `number`) is unchanged.

### Patch Changes

- Updated dependencies [55b1388]
  - @prosopo/util@3.3.0

## 4.5.0
### Minor Changes

- 9b91e85: Log + persist access-policy block decisions. When `blockMiddleware` 401s a request, the inspector now emits a structured `"Access policy block"` log line carrying the matched rule's identity (`ruleHash`, `ruleType`, `ruleDescription`, `policyType`) and the request's user-scope (ja4 / ip / userAgent / userId / countryCode / asn), and writes a synthetic `Session` record with `blocked: true`, `deleted: true`, `reason: ACCESS_POLICY_BLOCK`, and the same rule fields surfaced on three new optional columns (`ruleHash`, `ruleType`, `ruleDescription`). Persistence is fire-and-forget and any Mongo failure is swallowed-and-logged so the 401 response is never delayed. The new fields are gated by `blocked: true` so legit sessions stay untouched, and two sparse indexes (`{siteKey, blocked, createdAt}`, `{ruleHash}`) keep the per-rule and per-client block aggregations the Traffic page will query off the existing sessions collection without bloating the index on normal traffic.
- c80a05b: Split `solutionTimeout` (challenge issuance → user submission) from `verifiedTimeout` (submission → dapp's /verify call) on `UserSettings`. Historically `verifiedTimeout` gated both windows in `verifyRecency` (at /pow|puzzle/solution submit) and in `serverVerifyPowCaptchaSolution` (at /verify), even though its doc comment only described the latter. Adds `solutionTimeout` to `ClientSettingsSchema` (zod) and `UserSettingsSchema` (mongoose) with `DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT` (60s) as default. `submitPoWCaptchaSolution` and `submitPuzzleCaptchaSolution` now use `solutionTimeout` for the recency check and fall back to `verifiedTimeout` for pre-existing client records so behaviour is preserved until those records are backfilled. The `/verify` path is unchanged. Operators can now tighten `verifiedTimeout` (e.g. 20s) to invalidate stale solutions at verify time without also shrinking the user's solve budget.

## 4.4.1
### Patch Changes

- f69724f: Expose `ipInfo` to the verify-phase decision machine. The frictionless DM already gets the full `IPInfoResponse`; the verify-phase DM was only receiving `countryCode`, so rules that need `isDatacenter`, `isVPN`, `isAbuser`, `asnNumber` etc. couldn't run at submission time.
  
  `DecisionMachineInput` now carries an optional `ipInfo` field (alongside `countryCode`, which is kept for backwards compatibility). The three verify-phase call sites — `powTasks`, `puzzleTasks`, `imgCaptchaTasks` — forward `challengeRecord.ipInfo` / `solution.ipInfo` into the input.
  
  This unblocks rules like:
  ```
  if (input.behavioralDataPacked &&
      !input.behavioralDataPacked.c1.length &&
      !input.behavioralDataPacked.c2.length &&
      !input.behavioralDataPacked.c3.length &&
      input.ipInfo?.isDatacenter) return Deny;
  ```
  which catches the datacenter-class bots (Sparkle, Versatel, OVH) that submit empty `behavioralDataPacked` — observed at 100% empty-bDP across a 21-row Sparkle sample, versus 1–3% in genuine traffic.
- 3973078: Track every lifecycle timestamp on every captcha type, and switch the dapp-verify recency check from issuance→verify to **submit→verify** with the window sourced from per-client settings.
  
  ### Lifecycle timestamps
  
  `StoredCaptcha` (the base shared by PoW, Puzzle, and Image/UserCommitment) gains three new fields:
  
  - `submittedAtTimestamp` — set once on the first user-submission write, never overwritten.
  - `verifiedAtTimestamp` — set once when the dapp first calls /verify, never overwritten.
  - `failedAtTimestamp` — set once on the first non-approved terminal state, never overwritten.
  
  `lastUpdatedTimestamp` keeps its "last write of any kind" meaning. The new fields use `$ifNull` in aggregation-pipeline updates so the stamp lands only on the first transition — concurrent or repeat writes are no-ops on the lifecycle stamps.
  
  ### Submit→verify window
  
  The dapp-verify recency check used to be `now - challengeTimestamp <= timeout`. The window was issuance→verify, which gave bots room to stockpile pre-solved solutions and redeem them many seconds (sometimes minutes) later from the time they reached the provider.
  
  The check is now `now - challengeRecord.submittedAtTimestamp <= clientSettings.verifiedTimeout`. The window measures from the moment the user's solution actually arrived. Combined with the new lifecycle fields, this tightens the stockpile attack surface.
  
  ### Settings move
  
  `verifiedTimeout` moves to `ClientSettingsSchema` (per-client, operator-set via the portal). Default stays at 120000ms for back-compat; auto-submit dapps should set it to ~10000ms.
  
  Removed from request bodies entirely:
  
  - `ServerPowCaptchaVerifyRequestBody`
  - `ServerPuzzleCaptchaVerifyRequestBody`
  - `SubmitPowCaptchaSolutionBody`
  - `SubmitPuzzleCaptchaSolutionBody`
  
  The client field was client-controlled and unsigned — any caller could raise the recency ceiling. It's now server-determined.
  
  `ProviderApiInterface.submitPow/PuzzleCaptchaSolution` lose their `timeout` parameter (no longer forwarded). The verify wrappers keep their `recencyLimit` parameter for caller back-compat but the value is no longer transmitted; server reads from the client settings instead.
  
  ### Migration
  
  Pre-PR records with `userSubmitted=true` but no `submittedAtTimestamp` will fail the new recency check. The submit window is short (120s default verifiedTimeout) so the migration cliff is naturally bounded — records in flight at deploy time expire within ~2 minutes.
  
  348 provider unit tests + 28 database tests pass.

## 4.4.0
### Minor Changes

- bc3813d: Surface dnsEvent observations across the verify and frictionless flows. Each verify path now enriches the session's dnsEvent IPs once and passes the result to the traffic filter, decision machine, IP validation, and usage counters. Adds `scoreComponents.dnsAsymmetry` (Zod + TS interface + mongoose) computed from resolver / peer ipInfo plus path validity, with the score patched onto the session at DNS event ingest time so it weights subsequent reads. Adds `CounterDimension.peerIp` for rate-limit keys keyed on the dnsEvent peer IP.

### Patch Changes

- 4d05e3f: Add `ipInfo` and `parsedUserAgentInfo` to the Zod `UserCommitmentSchema` so the provider stops silently stripping them on the write path. Mirrors the existing fields on `PoWCaptchaStoredSchema` and `SessionSchema`.

## 4.3.1
### Patch Changes

- b03dad1: Thread `shadowDomPenalty: boolean` from the catcher's encrypted detection payload through `decryptPayload` and persist it on `Session.scoreComponents` so the flag is queryable in Mongo without inferring it from `baseScore=1 ∧ ¬triggeredDetectors`. Field is optional on the wire (position 6); older catcher bundles omit it and `shadowDomPenalty` stays undefined.

## 4.3.0
### Minor Changes

- 2392aaf: Integrate the prosopo/dns sidecar against the procaptcha provider.
  
  - New admin endpoint `POST /v1/prosopo/provider/admin/dns/event` ingests batched DNS observation events from the sidecar (auth: admin sr25519 JWT) and merges resolver / peer IPs onto the matching Session record under a new `Session.dnsEvent` field.
  - Frictionless response carries a per-session `dns_url` when the pronode has `DNS_EVENT_SUBZONE` + `DNS_EVENT_HMAC_SECRET` set. The HMAC path mirrors the sidecar's Rust implementation so both sides agree without shared per-request state.
  - The frictionless bundle fires one no-cors GET to `dns_url` on detection completion (fire-and-forget; failures never affect the captcha flow).
  - `dns_url` is included on the `reuse_session` short-circuit path too, not only the new-session path — otherwise repeat visits from the same user/IP/sitekey combination silently dropped the observation hop.
  - Deploy compose entry for the sidecar plus a Caddy `layer4` SNI-passthrough block so the sidecar terminates TLS itself (no Cloudflare token needed). Caddy image must be rebuilt with the `caddy-l4` plugin.

### Patch Changes

- a1d60db: Add optional internal ML labelling fields (label/labelReason/labelledBy/labelledAt) to captcha records.
- Updated dependencies [6ca1125]
  - @prosopo/util@3.2.15

## 4.2.1
### Patch Changes

- 6c26669: Add per-site honeypot trap. When enabled, the provider attaches an encoded question (morse or semaphore, base64-wrapped) in the `x-prosopo-meta` response header on frictionless responses. The widget renders the value into an off-screen hidden input with `name="email_confirm"`; bots that auto-fill text inputs populate it and the value rides back on the solution submit as `clientMetaData.hp`, which is persisted on the `StoredCaptcha` record. Falls back to a random phrase from `PROSOPO_HONEYPOT_PHRASE_BANK_PATH` when no custom question is configured.
- f7f9ec5: feat(provider,widget): reserved always-pass / always-fail test site keys
  
  Add two fixed, well-known reserved site keys (`ALWAYS_PASS_SITE_KEY` /
  `ALWAYS_FAIL_SITE_KEY`) that force a deterministic captcha verdict for CI/CD and
  integration testing, constant across production, staging and development.
  
  - `@prosopo/types`: shared constants + `getTestSiteKeyMode`, imported by both the
    provider and the widget.
  - `@prosopo/provider`: short-circuits the `submit*` and `verify` endpoints (verify
    runs before the signature check, so no dapp secret is needed), serves an
    invisible PoW session from the frictionless handler, and bypasses domain
    middleware. Works in every environment with no DB record.
  - `@prosopo/procaptcha-common` / `-react` / `-frictionless`: render a prominent
    `TestModeBanner` warning (always pass/fail) plus a console warning so a test key
    can never ship to production unnoticed.
  
  always-pass verifies at both the submit and verify layers; always-fail fails at
  both. Safe in production by design: the override only weakens protection for a
  dapp that deliberately opts in, mirroring reCAPTCHA's public test keys.

## 4.2.0
### Minor Changes

- 20cae63: feat(provider): re-route after PoW using decrypted behavioural data
  
  PoW solutions are now re-evaluated by the routing machine after submission.
  Previously the routing decision was made up-front on a thin set of signals;
  behavioural data only becomes available (decrypted server-side) once the
  user submits their PoW solution, so a user with weak behavioural signals
  could still earn a token by solving PoW alone.
  
  The submit endpoint now runs the routing machine a second time in a new
  `postPow` phase, feeding in the decrypted behavioural data, the originating
  session's score, request headers, JA4, and IP info. If the router escalates,
  the provider mints a fresh session (carrying the original session's risk
  profile) and returns `escalation: { captchaType, sessionId }` on the
  `PowCaptchaSolutionResponse`. The `verified` flag is forced to `false` on
  escalation — the user isn't done until they clear the follow-up.
  
  On the client, `ProcaptchaFrictionless` accepts the escalation via a new
  internal `onEscalate` prop on the PoW widget and mounts the chosen image
  or puzzle widget in place, splicing the new sessionId into the
  `FrictionlessState`. The handoff is internal to the frictionless → pow
  flow — dapps integrating Procaptcha see no API change.
  
  `RoutingMachineInputBase.phase` widens from `"route"` to
  `"route" | "postPow"` so decision-machine configs can distinguish the two
  passes.

### Patch Changes

- 4d9923e: feat: optional `storeMetadata` site setting persists `/verify` metadata
  
  Adds a per-site-key boolean `storeMetadata` (default `false`) to
  `ClientSettingsSchema` / `UserSettingsSchema`. When enabled, the provider
  writes the dapp-server-forwarded metadata that arrives on the image, PoW
  and puzzle `/verify` endpoints onto the corresponding captcha record under
  a new `metadata` sub-document (`{ email?: string }` today; more fields
  will be added here as the verify payload grows).
  
  `providedIp` stays top-level — existing data and indexes already use it,
  and it predates this setting.
  
  Off by default. Existing spam-email checks still inspect the submitted
  email unconditionally — this setting only gates **storage** of metadata
  so the submitted values can be sampled later to judge whether traffic is
  mostly spam.

## 4.1.4
### Patch Changes

- d351362: fix: replace `$or + $expr` unstored-records sweep with a `pendingStage` sentinel
  
  The `StoreCommitmentsExternal` background job fetches "records that still
  need to be shipped to the central DB" via
  `{ $or: [ { storedAtTimestamp: { $exists: false } }, { $expr: { $lt: [$storedAtTimestamp, $lastUpdatedTimestamp] } } ] }`.
  `$expr` is unindexable (per-doc computation) and combined with `$or`
  defeats the planner entirely — production was running this every sweep
  as a `IXSCAN { _id: 1 }` collection scan, examining ~673K powcaptcha
  docs, ~240K usercommitments docs, and ~60K sessions docs per pass. On
  the worst-affected nodes this thrashed the WiredTiger cache (10h of
  cumulative app-thread blocking on disk reads in 43h of uptime) and made
  every other Mongo lookup (including the frictionless session dedup
  queries) slow by eviction — manifesting as traffic-correlated provider
  latency starting 2026-05-26.
  
  Replace the query semantics with a `pendingStage: true` sentinel:
  
  - New optional `pendingStage` field on `StoredCaptcha` and `Session`
    (Zod + TS + Mongoose schemas).
  - New tiny partial index per collection:
    `{ pendingStage: 1 }` with `partialFilterExpression: { pendingStage: true }`.
    Indexes only the rows that need staging — typically a tiny rolling set,
    ~20 KB for a 700K-row collection with 100 pending rows in local tests.
  - Write paths (`storeXxx`, `updateXxx`, `markXxxChecked`, approve /
    disapprove, `checkAndRemoveSession`, `recordSessionSimdReadingsIfAbsent`,
    `storePendingImageCommitment`) set `pendingStage: true` alongside the
    existing `lastUpdatedTimestamp` bump.
  - `markXxxStored` and the per-record streamer mark-stored callbacks
    `$unset: { pendingStage: 1 }` alongside the `storedAtTimestamp` write,
    guarded by `lastUpdatedTimestamp: { $lte: ts }` so an in-flight update
    doesn't get its pending flag cleared by an older stage completion.
  - `markXxxStored` bulk methods accept an `asOfTimestamp` argument; the
    sweep passes the time it fetched the batch so the guard is correct
    across the full ship-then-mark round trip.
  - `getUnstoredXxx` queries become `{ pendingStage: true }` sorted by
    `_id` — uses the new partial index, examines only pending docs.
  
  Local verification on a 700,100-doc test collection: old query ~549 ms
  examining 700,100 docs; new query 0 ms examining 100 docs. Index storage
  ~20 KB.

## 4.1.3
### Patch Changes

- e2711ae: feat(provider): add `autoBanScoreThreshold` client setting and frictionless auto-ban
  
  Adds an optional `autoBanScoreThreshold` to `ClientSettingsSchema`. When set,
  the frictionless decision machine blocks any request whose detector score is
  at or above the threshold with HTTP 401 instead of issuing an image or PoW
  challenge — useful for clients receiving floods of image solves from sessions
  scoring at or above 1.
  
  The check runs first in `runDecisionMachine`, before the existing
  user-agent / context-aware / webview / timestamp / threshold gates, so score
  bumps applied by those gates cannot bypass it. Blocked sessions are persisted
  via `registerBlockedSession` with the new `FrictionlessReason.AUTO_BAN_SCORE`
  reason.
  
  Undefined threshold = disabled; existing clients are unaffected.
- 5786629: fix(provider): persist DISALLOWED_WEBVIEW outcome and broaden detection in image captcha verify
  
  The webview check in `verifyImageCaptchaSolution` did an early return that
  left the commitment stuck at `Approved` in the database and never marked
  the session as `serverChecked` / `disapproved`, even though the API
  correctly returned `verified: false`. This made the DB state misleading
  and broke any downstream consumer reading commitment status directly.
  
  The check also only fired when `scoreComponents.webView > 0`, which is
  only set when the frictionless flow took the webview branch. Webview
  users who reached the image captcha via another branch (UA mismatch,
  context-aware failure, timestamp, bot score) had `session.webView: true`
  but no `scoreComponents.webView`, so the verify-time block missed them.
  
  - Convert the early return to the same `failStatus` /
    `commitmentUpdates.result` pattern used by every other check in the
    function, so the commitment and session are properly persisted as
    disapproved with reason `DISALLOWED_WEBVIEW`.
  - Trigger on `session.webView === true` OR `scoreComponents.webView > 0`.
  - Add `ResultReason.DISALLOWED_WEBVIEW` and the English locale entry.
  - Add unit tests for score-based detection, boolean-only detection, and
    the `disallowWebView=false` passthrough.
  
  Closes #3396.
- Updated dependencies [6567ce0]
- Updated dependencies [5786629]
  - @prosopo/util@3.2.14
  - @prosopo/locale@3.2.4

## 4.1.2
### Patch Changes

- Updated dependencies [72a1218]
  - @prosopo/util@3.2.13

## 4.1.1
### Patch Changes

- 91958da: Puzzle captcha + maintenance mode hardening, plus a refactor of the
  frictionless handler into focused modules.
  
  - **Puzzle captcha now records checkbox-click coordinates like POW.** Adds an
    optional `salt` field to `SubmitPuzzleCaptchaSolutionBody`; the puzzle
    widget hashes the click coords into the salt and the server decodes them
    into the puzzle record's `coords` field on submit. New `start(x, y)`
    parameters on `procaptcha-puzzle` Manager + widget.
  - **Fix puzzle "No session found" caused by stale Redis dedup.** The
    `/frictionless` dedup path is now Mongo-authoritative — Redis is no
    longer consulted as a session source. A concurrent `/captcha/{type}`
    invalidation could previously race a fire-and-forget Redis repopulation
    in the `/frictionless` dedup branch, leaving Redis pointing at a
    Mongo-deleted session for the full 1-hour TTL. Stale pointers are now
    evicted lazily.
  - **Maintenance mode operates without MongoDB.** `/frictionless` and
    `/captcha/{pow,puzzle}` short-circuit to dummy responses before any DB
    call, and `Environment.isReady()` tolerates a Mongo connect failure when
    `MAINTENANCE_MODE=true` so the provider can start with Mongo down.
  - **Refactor `getFrictionlessCaptchaChallenge.ts` into focused modules** under
    `getFrictionlessCaptchaChallenge/` (handler, sessionDedup, shortCircuit,
    accessPolicy, decisionMachine, decryptSimdReadings, constants). Original
    import path preserved via a re-export shim.
  - **Move `RedisWriteQueue` from `@prosopo/provider` to `@prosopo/database`**
    (where the Redis connection itself lives), and clear residual Redis
    session keys at provider startup via `Environment.cleanup()` so a
    previously-crashed run can't leak stale dedup pointers.
  - Adds puzzle-type branch to access-policy handling in `/frictionless`.
- Updated dependencies [53bfd45]
  - @prosopo/locale@3.2.3

## 4.1.0
### Minor Changes

- 6a741ce: Move `FrictionlessReason` into `@prosopo/types` and add a new
  `ResultReason` enum covering the values previously inlined as string
  literals on `result.reason` (API.CAPTCHA_PASSED, API.VPN_BLOCKED,
  EMAIL_INVALID, etc.). Provider task code now references the enums so the
  canonical list of selection/result reasons lives in one place and can be
  imported by non-server packages (portal, audit tooling) without pulling
  in `@prosopo/provider`. The previous `FrictionlessReason` export from
  `@prosopo/provider` is preserved as a re-export for backwards
  compatibility.
  
  `CaptchaResult.reason`, `StoredCaptcha.result.reason`, `Session.result.reason`
  are now typed `ResultReason | undefined`; `Session.reason` is typed
  `FrictionlessReason | undefined`. The runtime zod schema stays permissive
  (`string().optional().transform(v => v as ResultReason | undefined)`) so
  operator-authored decision-machine output and old MongoDB records still
  parse without throwing; the strict enum is preserved on the TS surface
  via the transform.

## 4.0.0
### Major Changes

- 8bb7286: Move `captchaType` from client (`data-captcha-type` / render-options prop)
  to a server-side site-key setting; the bundle now calls `/frictionless`
  for all flows. Renames the bundle's universal mount component from
  `FrictionlessCaptcha` to `BundleCaptcha` to reflect that it is no longer
  frictionless-specific — the server decides which concrete challenge type
  to render.

### Minor Changes

- d865319: Add puzzle captcha (drag-to-target challenge) as a new captcha type:
  provider endpoints, manager + widget package, types, demo pages, and
  a `puzzleTolerance` site setting.
- 753304b: Extend the existing decision-machine artifact with a new `route` phase that
  selects the concrete captcha type during the frictionless flow. Per-sitekey
  JS sources (Dapp > Global priority) can now override the ladder's image/pow
  baseline based on Redis-backed usage counters keyed by IP and userAccount.
  
  Adds:
  
  - `RoutingMachineInput`, `RoutingMachineOutput`, `CounterSpec`,
    `CounterWindow` etc. in `@prosopo/types`.
  - A `usageCounters` primitive in the provider (Lua INCR + TTL-on-first;
    bulk MGET) and fire-and-forget served/solved counter writes at the
    three captcha types.
  - `DecisionMachineRunner.route()` and `.getRequiredCounters()` alongside
    the existing `decide()` veto. Artifact cache is now shared across all
    runner instances and busted on admin PUT for immediate propagation.
  - `applyRouter` helper in the frictionless flow which falls back to the
    ladder baseline on any machine/Redis failure.
  
  Back-compat: existing post-PoW verify-phase machines keep working
  unchanged. A single artifact can export both `route` and `verify` /
  `decide`.

### Patch Changes

- 3c0be68: Add a new admin-only endpoint `POST /v1/prosopo/provider/admin/counters/clear-all`
  for deleting per-sitekey usage counters from Redis. Intended for manual
  testing of routing decision machines and staging-environment resets — not
  part of the hot path.
  
  - `ClearAllCountersBody` (optional `dapp`) and `ClearAllCountersResponse`
    (`success`, `deletedCount`, `scope`) zod schemas in `@prosopo/types`,
    plus `AdminApiPaths.ClearAllCounters` and a 10/60s rate limit.
  - `UsageCounters.clearAll(dappAccount?)` in the provider, using Redis
    `SCAN` + `DEL` in 500-key batches. Returns null on Redis failure so
    callers can surface the underlying error.
  - `ApiClearAllCountersEndpoint` wired through `ApiAdminRoutesProvider`.
  - `ProviderApi.clearAllCounters(jwt, dappAccount?)` client method.
- f9ea09d: Drop flat ipinfo fields (`vpn`, `countryCode`, `tor`, `proxy`, `datacenter`, `abuser`, `geolocation`) from captcha records — persist the full `IPInfoResponse` payload as `ipInfo` instead
  
  The provider's `ipInfoMiddleware` already calls `ipInfoService.lookup()` on every captcha request and attaches the result to `req.ipInfo`. Persisting that whole payload on every captcha record means the portal sees the *exact* response the traffic filter consulted, with no cherry-picked-field translation layer in between. Adding a new flag in the future (e.g. `isMobile`) requires zero schema changes — it's already in the payload.
  
  - `StoredCaptcha` interface: removed `vpn`, `countryCode`, `geolocation`. Keeps `ipInfo?: IPInfoResponse`.
  - `PoWCaptchaStoredSchema` zod validator: same removals, adds `ipInfo` (validated as `any()` since `IPInfoResponse` is a discriminated union narrowed at read time).
  - PoW, Puzzle, UserCommitment mongoose schemas in `@prosopo/types-database`: same removals. UserCommitment now also has `ipInfo` (previously only PoW + Puzzle did). Replaced `{ countryCode: 1 }` index with `{ "ipInfo.countryCode": 1 }` + `{ "ipInfo.isVPN": 1 }`.
  - `IProviderDatabase` interface: `storePowCaptchaRecord` / `storePuzzleCaptchaRecord` / `storePendingImageCommitment` now take `ipInfo?: IPInfoResponse` in place of `countryCode?: string`.
  - Provider call sites (`getPoWCaptchaChallenge.ts`, `getPuzzleCaptchaChallenge.ts`, `getImageCaptchaChallenge.ts`, `submitImageCaptchaSolution.ts`) pass `req.ipInfo` directly. The earlier "prefer session.countryCode, fallback to req's countryCode" branching is gone — record `ipInfo` reflects what was true at challenge-issuance time.
  - Provider read sites (`powTasks.ts`, `puzzleTasks.ts`, `imgCaptchaTasks.ts`) narrow `record.ipInfo?.isValid` then read `.countryCode` for access-policy / decision-machine input — same effective value, derived from the persisted payload.
  - Lean projections in `provider.ts` switched from `countryCode: 1` to `ipInfo: 1`.
  
  Paired with [captcha-private#3339](https://github.com/prosopo/captcha-private/pull/3339), which updates the CHECK_IP_INFO backfill job (now writes the full payload, query becomes `{ ipInfo: { $exists: false } }`), the portal search models / aggregation pipeline (read nested `ipInfo.*`), and the anomaly detectors.
- f9ea09d: Drop flat `countryCode` / `geolocation` fields from Session records — persist the full `IPInfoResponse` payload as `session.ipInfo` instead
  
  Brings sessions in line with captcha records (PoW / Puzzle / UserCommitment), which already store the full payload. The provider's `ipInfoMiddleware` populates `req.ipInfo` at session-creation time; that whole payload now lives on the session, so consumers narrow on `session.ipInfo?.isValid` and read whichever sub-field they need (countryCode, isVPN, isMobile, isTor, ...).
  
  - `Session` interface + `SessionSchema` zod (`@prosopo/types`): replace `countryCode?: string` / `geolocation?: string` with `ipInfo?: IPInfoResponse`.
  - `SessionRecordSchema` mongoose (`@prosopo/types-database`): same.
  - `FrictionlessManager.setSessionParams` / `createSession`: accept `ipInfo` instead of `countryCode`.
  - `getFrictionlessCaptchaChallenge.ts` call sites (10 of them — `sendImageCaptcha`, `sendPowCaptcha`, `registerBlockedSession`, etc.) pass `req.ipInfo` instead of `countryCode`.
  - `CaptchaManager.isValidRequest()` return: drop dead `countryCode: sessionRecord.countryCode` field (no caller was destructuring it after the earlier refactor), surface `ipInfo: sessionRecord.ipInfo` instead for callers that want it.
  - Two new MongoMemory roundtrip tests in `ipInfoPersistence.integration.test.ts` cover Session.ipInfo (valid response + error response). `routingDecisionMachines.integration.test.ts` fixture updated to write the full payload.
  
  `RoutingContext.countryCode` is unchanged — that's a transient runtime struct fed into the routing machine, not a stored record. Callers of `setRoutingContext` already derive `countryCode` from `req.ipInfo.countryCode` at the API boundary.
  
  Paired with [captcha-private#3339](https://github.com/prosopo/captcha-private/pull/3339).
- 4aae4e6: Plumb the WASM SIMD CPU fingerprint readings (collected by the catcher
  client per https://blog.azerpas.com/writing/wasm-simd-fingerprinting/)
  through the captcha flow and onto the linked `Session` record.
  Collection-only — no scoring or classification yet.
  
  The readings are sent at the earliest moment they're available so the
  signal lands on the session as soon as possible:
  
  1. **Captcha-challenge GET** (PoW / Puzzle / Image) — the procaptcha
     Manager calls `frictionlessState.getSimdReadings(0)` (non-blocking
     cache check) and attaches it to the challenge-request body. The
     provider handler decodes and patches the linked session via
     `updateSessionRecord`.
  2. **Solution submission** (PoW / Puzzle / Image) — same non-blocking
     check on the submit body. Acts as a backup if the benchmark wasn't
     ready in time for the challenge GET.
  
  Frictionless init itself stays SIMD-free (benchmark is too slow to gate
  the first hop).
  
  Surface area:
  
  - `SimdReadings` discriminated union + `SimdOpReadingRecord` /
    `SimdOpCategory` in `@prosopo/types`, plus `simdReadingsCodec` shared
    encode/decode helpers so the browser SDK and the provider use the same
    pipe-safe wire format.
  - Optional `simdReadings: string()` on `CaptchaRequestBody`,
    `GetPowCaptchaChallengeRequestBody`, `GetPuzzleCaptchaChallengeRequestBody`,
    `CaptchaSolutionBody`, `SubmitPowCaptchaSolutionBody`, and
    `SubmitPuzzleCaptchaSolutionBody`.
  - `FrictionlessState.getSimdReadings` + `BotDetectionFunctionResult.getSimdReadings`
    so the catcher's prefetched benchmark is consumed at the request sites.
  - `ProcaptchaApiInterface.{getCaptchaChallenge, submitCaptchaSolution}` and
    the `ProviderApi.{getCaptchaChallenge, getPowCaptchaChallenge, getPuzzleCaptchaChallenge,
    submitCaptchaSolution, submitPowCaptchaSolution, submitPuzzleCaptchaSolution}`
    client methods accept the field.
  - Provider challenge + solution handlers decode via `decodeSimdReadings`
    and `updateSessionRecord` (Mongoose `Mixed`, Zod discriminated-union
    validation at the edge). The challenge-GET patch is fire-and-forget.
  
  Backward-compatible: older catcher clients omit the field at every layer;
  the session record omits it in turn.
- Updated dependencies [4aae4e6]
  - @prosopo/locale@3.2.2
  - @prosopo/util@3.2.12

## 3.16.1
### Patch Changes

- 819ed95: Adding invisible mode to session data

## 3.16.0
### Minor Changes

- 99dfb44: Pass back reason via verify calls

### Patch Changes

- f6a4402: API endpoint for removing site keys

## 3.15.0
### Minor Changes

- 3e54c0a: Rate limits by client

## 3.14.1
### Patch Changes

- 946a8ba: Abuser score threshold
- 5614814: Small config changes
- Updated dependencies [b94890c]
  - @prosopo/locale@3.2.1

## 3.14.0
### Minor Changes

- 42650db: Add better spam rules and move ipinfo service to local instead of external

### Patch Changes

- fc514dd: ability to block different types of traffic
- Updated dependencies [fc514dd]
- Updated dependencies [42650db]
  - @prosopo/locale@3.2.0

## 3.13.3
### Patch Changes

- Updated dependencies [a25dffa]
  - @prosopo/util@3.2.11

## 3.13.2
### Patch Changes

- Updated dependencies [346edd7]
  - @prosopo/util@3.2.10

## 3.13.1
### Patch Changes

- Updated dependencies [22bfee7]
  - @prosopo/util@3.2.9

## 3.13.0
### Minor Changes

- e6d9553: Add `registerSiteKeys` bulk endpoint (`POST /v1/prosopo/provider/admin/sitekeys/register`) that accepts an array of site key records, allowing multiple client records to be registered in a single request.

### Patch Changes

- Updated dependencies [e0fb3d6]
- Updated dependencies [f3f23e3]
  - @prosopo/util@3.2.8

## 3.12.3
### Patch Changes

- d5082a9: Don't require email type
- e1ea65f: Better spam email domain checking
- c316257: Adding sync fo sessions wrt captcha status
- Updated dependencies [e1ea65f]
  - @prosopo/util@3.2.7

## 3.12.2
### Patch Changes

- adb89a6: Disposable email checking
- Updated dependencies [adb89a6]
  - @prosopo/locale@3.1.29
  - @prosopo/util@3.2.6

## 3.12.1
### Patch Changes

- a90eb54: We know WHAT happens but we don't know WHY happens

## 3.12.0
### Minor Changes

- feaca02: Max image rounds

### Patch Changes

- 676c5f2: Use HTTPS in developmentwq

## 3.11.1
### Patch Changes

- 8148587: Clustering

## 3.11.0
### Minor Changes

- 7f6ffc5: Store behavioural for image challenges

## 3.10.2
### Patch Changes

- 93fa086: Add decision engine endpoints

## 3.10.1
### Patch Changes

- cde7550: enhance/frictionless-headers-db-field

## 3.10.0
### Minor Changes

- ad6d622: Separate types from mongoose schemas to avoid bundling mongoose in frontend

## 3.9.0
### Minor Changes

- ff58a70: Load the geolocation service at startup only

## 3.8.4
### Patch Changes

- d2431cd: Allow IP validation rules to be disabled

## 3.8.3
### Patch Changes

- bd6995b: Adding UAP based geoblocking rules

## 3.8.2
### Patch Changes

- 9633e58: Add captcha type to decision machine and run on image verification"

## 3.8.1
### Patch Changes

- f52a5c1: Adding decision machine to provider for behavior detection

## 3.8.0
### Minor Changes

- 1ee3d80: More API fixes

### Patch Changes

- 3acc333: Add JWT issuance to keypairs
- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- 7543d17: mouse movements bot stopping
- 3acc333: Release 3.3.0
- Updated dependencies [a53526b]
- Updated dependencies [3acc333]
- Updated dependencies [0a38892]
- Updated dependencies [a8faa9a]
- Updated dependencies [fe9fe22]
- Updated dependencies [3acc333]
  - @prosopo/util@3.2.5
  - @prosopo/util-crypto@13.5.29
  - @prosopo/locale@3.1.28

## 3.7.2
### Patch Changes

- 141e462: Capture correct event

## 3.7.1
### Patch Changes

- 345b25b: pow coord

## 3.7.0
### Minor Changes

- ce70a2b: Add context-aware entropy calculation for WebView and default contexts
  
  - Added ContextType enum to distinguish between WebView and default browser contexts
  - Implemented context-specific entropy calculation and storage
  - Created clientContextEntropy collection with automatic timestamp management
  - Removed legacy clientEntropy table in favor of context-specific approach
  - Added helper functions for context determination and threshold retrieval
  - Included comprehensive unit tests for context validation logic

### Patch Changes

- c2b940f: Properly save context type settings
- f6b5094: Allow different context to override default
- Updated dependencies [e01227b]
  - @prosopo/locale@3.1.27

## 3.6.4
### Patch Changes

- 7d5eb3f: bump
- Updated dependencies [7d5eb3f]
  - @prosopo/locale@3.1.26
  - @prosopo/util@3.2.4
  - @prosopo/util-crypto@13.5.28

## 3.6.3
### Patch Changes

- 93d92a7: little bump for publish all
- Updated dependencies [93d92a7]
  - @prosopo/locale@3.1.25
  - @prosopo/util@3.2.3
  - @prosopo/util-crypto@13.5.27

## 3.6.2
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep
- Updated dependencies [8ee8434]
- Updated dependencies [cfee479]
  - @prosopo/util-crypto@13.5.26
  - @prosopo/locale@3.1.24
  - @prosopo/util@3.2.2

## 3.6.1
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23
  - @prosopo/locale@3.1.23
  - @prosopo/util@3.2.1
  - @prosopo/util-crypto@13.5.25

## 3.6.0
### Minor Changes

- bb5f41c: Context awareness

### Patch Changes

- 15ae7cf: Change slider defaults
- 8ce9205: Change engine requirements
- b6e98b2: Run npm audit
- Updated dependencies [bb5f41c]
- Updated dependencies [8ce9205]
- Updated dependencies [df79c03]
- Updated dependencies [b6e98b2]
  - @prosopo/util@3.2.0
  - @prosopo/util-crypto@13.5.24
  - @prosopo/locale@3.1.22
  - @prosopo/config@3.1.22

## 3.5.11
### Patch Changes

- 8f1773a: Tweak config

## 3.5.10
### Patch Changes

- cb8ab85: head entropy for bot detection

## 3.5.9
### Patch Changes

- 43907e8: Convert timestamp fields from numbers to Date objects throughout codebase
- 7101036: Force consistent IPs logic
- Updated dependencies [005ce66]
  - @prosopo/util@3.1.7

## 3.5.8
### Patch Changes

- e5c259d: .

## 3.5.7
### Patch Changes

- Updated dependencies [b8185a4]
  - @prosopo/config@3.1.21
  - @prosopo/locale@3.1.21
  - @prosopo/util@3.1.6
  - @prosopo/util-crypto@13.5.23

## 3.5.6
### Patch Changes

- 5d11a81: Adding maintenance mode

## 3.5.5
### Patch Changes

- 494c5a8: Updated payload

## 3.5.4
### Patch Changes

- 08ff50f: Hot fix country code

## 3.5.3
### Patch Changes

- Updated dependencies [1e3a838]
  - @prosopo/config@3.1.20
  - @prosopo/locale@3.1.20
  - @prosopo/util@3.1.5
  - @prosopo/util-crypto@13.5.22

## 3.5.2
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [5659b24]
  - @prosopo/util-crypto@13.5.21
  - @prosopo/locale@3.1.19
  - @prosopo/util@3.1.4
  - @prosopo/config@3.1.19

## 3.5.1
### Patch Changes

- 52cd544: Integrity checks
- b117ba3: Hot fix country code
- 50c4120: Release 3.4.3
- Updated dependencies [50c4120]
  - @prosopo/util-crypto@13.5.20
  - @prosopo/locale@3.1.18
  - @prosopo/util@3.1.3
  - @prosopo/config@3.1.18

## 3.5.0
### Minor Changes

- e20ad6b: IP country overrides

### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
  - @prosopo/util-crypto@13.5.19
  - @prosopo/locale@3.1.17
  - @prosopo/util@3.1.2
  - @prosopo/config@3.1.17

## 3.4.1
### Patch Changes

- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- 11303d9: feat/pluggable-redis
- Updated dependencies [11303d9]
- Updated dependencies [18cb28b]
  - @prosopo/util-crypto@13.5.18
  - @prosopo/locale@3.1.16
  - @prosopo/util@3.1.1
  - @prosopo/config@3.1.16

## 3.4.0
### Minor Changes

- 6768f14: Update salt

### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
- Updated dependencies [6768f14]
  - @prosopo/util-crypto@13.5.17
  - @prosopo/locale@3.1.15
  - @prosopo/util@3.1.0
  - @prosopo/config@3.1.15

## 3.3.0
### Minor Changes

- 97edf3f: Adding dom manip checks

### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/util-crypto@13.5.16
  - @prosopo/locale@3.1.14
  - @prosopo/util@3.0.17
  - @prosopo/config@3.1.14

## 3.2.1
### Patch Changes

- 509be28: Fix IP conditions logic
- 008d112: Release 3.3.0
- Updated dependencies [008d112]
  - @prosopo/util-crypto@13.5.15
  - @prosopo/locale@3.1.13
  - @prosopo/util@3.0.16
  - @prosopo/config@3.1.13

## 3.2.0
### Minor Changes

- cf48565: Store additional details. Remove duplicate indexes.

### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [0824221]
  - @prosopo/util-crypto@13.5.14
  - @prosopo/locale@3.1.12
  - @prosopo/util@3.0.15
  - @prosopo/config@3.1.12

## 3.1.4
### Patch Changes

- 0d1a33e: Adding ipcomparison service with user features
- 0d1a33e: Adding ip comparison service
- 1a23649: Release 3.2.3
- Updated dependencies [0d1a33e]
- Updated dependencies [1a23649]
  - @prosopo/locale@3.1.11
  - @prosopo/util-crypto@13.5.13
  - @prosopo/util@3.0.14
  - @prosopo/config@3.1.11

## 3.1.3
### Patch Changes

- 657a827: Release 3.2.2
- Updated dependencies [657a827]
  - @prosopo/util-crypto@13.5.12
  - @prosopo/locale@3.1.10
  - @prosopo/util@3.0.13
  - @prosopo/config@3.1.10

## 3.1.2
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- 1249ce0: Be more lenient with random provider selection
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [809b984]
  - @prosopo/util-crypto@13.5.11
  - @prosopo/locale@3.1.9
  - @prosopo/util@3.0.12
  - @prosopo/config@3.1.9

## 3.1.1
### Patch Changes

- 1f980c4: Fix types mismatch in decryption
- 6fe8570: Release 3.2.0
- Updated dependencies [6fe8570]
  - @prosopo/util-crypto@13.5.10
  - @prosopo/locale@3.1.8
  - @prosopo/util@3.0.11
  - @prosopo/config@3.1.8

## 3.1.0
### Minor Changes

- 8bdc7f0: Using detector to select provider

### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
  - @prosopo/util-crypto@13.5.9
  - @prosopo/locale@3.1.7
  - @prosopo/util@3.0.10
  - @prosopo/config@3.1.7

## 3.0.10
### Patch Changes

- Updated dependencies [9eed772]
- Updated dependencies [ebb0168]
  - @prosopo/config@3.1.6
  - @prosopo/util@3.0.9
  - @prosopo/locale@3.1.6
  - @prosopo/util-crypto@13.5.8

## 3.0.9
### Patch Changes

- 6960643: lint detect missing and unneccessary imports
- Updated dependencies [d8e855c]
- Updated dependencies [6960643]
  - @prosopo/locale@3.1.5
  - @prosopo/util-crypto@13.5.7
  - @prosopo/util@3.0.8

## 3.0.8
### Patch Changes

- Updated dependencies [30e7d4d]
  - @prosopo/config@3.1.5
  - @prosopo/common@3.1.4
  - @prosopo/locale@3.1.4

## 3.0.7
### Patch Changes

- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
  - @prosopo/config@3.1.4
  - @prosopo/common@3.1.3
  - @prosopo/locale@3.1.3

## 3.0.6
### Patch Changes

- 828066d: remove empty test npm scripts, add missing npm test scripts
- df4e030: Revising UAP rule getters
- 91bbe87: configure typecheck before bundle for vue packages
- 91bbe87: make typecheck script always recompile
- 346e092: NODE_ENV default to "development"
- 5d36e05: remove tsc --force
- Updated dependencies [828066d]
- Updated dependencies [91bbe87]
- Updated dependencies [3ef4fd2]
- Updated dependencies [91bbe87]
- Updated dependencies [346e092]
- Updated dependencies [5d36e05]
  - @prosopo/common@3.1.2
  - @prosopo/config@3.1.3
  - @prosopo/locale@3.1.2

## 3.0.5
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/common@3.1.1
  - @prosopo/locale@3.1.1
  - @prosopo/config@3.1.2

## 3.0.4
### Patch Changes

- 93d5e50: ensure packages have @prosopo/config as dep for vite configs
- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- 93d5e50: fix missing dep for @prosopo/config
- 63519d7: Tests
- 3573f0b: standardise all vite based npm scripts for bundling
- 2d0dd8a: Integration tests for UAPs
- Updated dependencies [93d5e50]
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [efd8102]
- Updated dependencies [93d5e50]
- Updated dependencies [f29fc7e]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
  - @prosopo/locale@3.1.0
  - @prosopo/common@3.1.0
  - @prosopo/config@3.1.1

## 3.0.3
### Patch Changes

- b0d7207: Types for proper rotation

## 3.0.2
### Patch Changes

- f682f0c: Moving type and fixing i18n config
- Updated dependencies [f682f0c]
  - @prosopo/locale@3.0.2
  - @prosopo/common@3.0.2

## 3.0.1
### Patch Changes

- Updated dependencies [87bd9bc]
  - @prosopo/locale@3.0.1
  - @prosopo/common@3.0.1

## 3.0.0
### Major Changes

- 64b5bcd: Access Controls

### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/common@3.0.0
  - @prosopo/locale@3.0.0

## 2.10.0
### Minor Changes

- aee3efe: Add healthz endpoint

## 2.9.1
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/common@2.7.2

## 2.9.0
### Minor Changes

- 30bb383: Making sure verify works and derived accounts

### Patch Changes

  - @prosopo/common@2.7.1

## 2.8.0
### Minor Changes

- 8f0644a: Taking required functions from polkadot/keyring and polkadot/util-crypto in-house and removing WASM dependencies. Adding @scure JS-based sr25519 function instead.

### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/common@2.7.0

## 2.7.1

### Patch Changes

- Updated dependencies [04cc7ee]
  - @prosopo/common@2.6.1

## 2.7.0

### Minor Changes

- 6e1aef6: Add IP check when verifying

## 2.6.2

### Patch Changes

- 6ff193a: Change settings type

## 2.6.1

### Patch Changes

- 52feffc: Adjustable difficulty img captcha

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/common@2.6.0
  - @prosopo/locale@2.6.0
