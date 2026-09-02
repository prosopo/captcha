---
"@prosopo/types": patch
"@prosopo/provider": patch
---

Extract the captcha-type severity ranking into `@prosopo/types` as `rankCaptchaType` / `isStricterCaptchaType`.

"Which captcha type is stricter" is one idea with several callers. The provider's traffic filter uses it to combine multiple `challenge` matches on a single request (`resolveChallengePolicy`), and the decision machines use it to resolve an undeclared middlebox against a site's vpn / datacenter policies (`resolveMiddleboxPolicy`, in the captcha-private `@prosopo/decision-machines` package). Each kept its own copy of the table. They agreed on the ordering — image > puzzle > pow > frictionless — but nothing held them to it, and the decision-machines copy carried a comment describing itself as "mirroring the provider's own CAPTCHA_TYPE_RANK", which is the duplication admitting itself.

The new module is a deliberate leaf with no runtime imports. It takes a **type-only** import of `CaptchaType` and keys its table by plain strings, because `captchaType.ts` imports zod to build its schemas — so referencing the enum as a value would pull zod into every consumer. That matters for the decision machines specifically: they are bundled standalone and published through an API whose `decisionMachineSource` field is capped at 65,536 characters, and a runtime dependency on the `@prosopo/types` barrel has breached that ceiling before. Keeping the module import-free lets esbuild shake the barrel down to the rank table alone — measured at +250 bytes per machine with no zod in any bundle.

`isStricterCaptchaType` is strictly-greater, so an equal rank keeps the incumbent. Callers reduce left to right and the competing policies can carry different render tunables (`solvedImagesCount`, `powDifficulty`, `puzzleTolerance`), so a tie has to resolve to the first consistently rather than by table order. That was previously implicit in both copies and is now pinned by tests.

No behaviour change — the ordering and the tie-break are identical to what both call sites already did.
