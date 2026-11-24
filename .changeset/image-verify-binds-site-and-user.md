---
"@prosopo/provider": patch
---

Image captcha verification now refuses a token whose solved captcha belongs to a different site or user than the one asking. Before, a captcha solved on one site could be verified on any other site. The token is marked as used on its first verify whatever the outcome, so it cannot be tried at one site after another.
