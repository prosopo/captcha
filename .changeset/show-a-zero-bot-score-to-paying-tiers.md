---
"@prosopo/provider": patch
---

Report a bot score of zero to Pro and Enterprise instead of dropping the field.

`canClientSeeScore` tested `score && tier && tier !== Tier.Free`. A session with nothing wrong with it scores 0, which is falsy, so `score` was omitted from the siteverify response for exactly those users: a paying customer got a score for every suspicious visitor and no score at all for their cleanest ones, which reads as "no score available" rather than "no risk".

Invisible in production today because `Math.random() * 0.3` is added to every score, making an exact 0 all but impossible. Removing that noise — captcha-private#4433, where this was found — is what would have exposed it.

The function also returned `number | boolean | undefined` from its `&&` chain; it now returns `boolean`.
