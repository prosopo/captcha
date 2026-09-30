---
"@prosopo/provider": patch
---

Stop padding the `/frictionless` response. The tarpit pads the challenge, and that endpoint does not serve one.

`GetFrictionlessCaptchaResponse` is `{captchaType, sessionId, dns_url}` — a session envelope. The widget then fetches the challenge from `/captcha/pow`, `/captcha/image` or `/captcha/puzzle`, and each of those resolves its own traffic-filter verdict and pads there, which is where the original feature put it.

Padding the envelope as well charged a tarpitted session twice. Measured on one site over 6h: 418 of 868 padded responses (48%, 1.48 GB of 3.09 GB) were `/frictionless`, roughly one per padded challenge.

This restores the frictionless handler to its pre-tarpit state, so it also reverts the hoist that extended envelope padding to reused sessions and pinned-captcha-type sites. Nothing is lost from the feature: each of those sessions still fetches a challenge from a typed endpoint, which pads it.

Kept from the same work: `padBytes` on the Mongoose traffic-category schema, without which the setting could not persist at all, and the padding writer's handling of a fieldless or non-object body.
