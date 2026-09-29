---
"@prosopo/web-bot-auth": patch
"@prosopo/provider": patch
---

Web Bot Auth signatures are now held to the replay window the spec requires. A signature must carry `created`, `expires` and `tag="web-bot-auth"`. It is rejected if it was created in the future (allowing 5s of clock skew) or if it stays valid for more than 24 hours. Before this, a signature with no `expires` could be replayed forever.

The signer key directory is fetched more carefully, since its URL comes from a request header:
- The URL must be https and a public hostname. IP literals, localhost and dotless hosts are refused, except in test and development.
- The fetch times out after 3s and does not follow redirects.
- The body is capped at 64KiB.
- The cache holds at most 1000 entries, each for at most 24 hours.
