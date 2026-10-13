---
"@prosopo/provider": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/user-access-policy": patch
---

Make the Web Bot Auth agent pass work end to end. Driving a signing agent through the demo site turned up six things that stopped an allowed agent getting through, or let a blocked one past:

- A site set to a fixed captcha type (PoW, image, puzzle, icon order), or a provider with no detector bundles, served its challenge before the signature was checked. A verified agent's Allow and Block rules are now applied first.
- An agent with an existing challenge session for the same user, IP and site got that session back. A matching Allow rule now replaces it with a fresh authenticated session.
- An agent whose page sent no detector token failed with "Failed to store session". The session now gets a generated token, the way the other no-detector paths do.
- A provider that sees clients as IPv4-mapped IPv6 (`::ffff:1.2.3.4`) rejected every verify, because the site forwards the plain `1.2.3.4`. The IP check now treats the two as the same address.
- Deleting or filtering access rules by `webBotAuthAgent` sent Redis an unescaped URL, which is a query syntax error, so nothing was deleted. Removing an Agent Trust rule in the portal left it in force.
- The widget issued the token at page load and never refreshed it. In invisible mode it drew the badge and fired the callback before the user did anything; it now draws nothing and issues the token on execute(). In both modes the pass now expires and renews like a solved PoW, so an agent that takes more than three minutes to fill a form no longer fails with "not recent".

Rejected signatures are now logged with the reason.
