---
"@prosopo/provider": patch
---

Image captcha verification now refuses a token whose solved captcha belongs to a different site or user than the one asking. Before, a captcha solved on one site could be verified on any other site. The token is refused before it is marked as used, so presenting it at the wrong site does not spend it for the site it was solved for.
