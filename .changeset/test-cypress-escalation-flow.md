---
"@prosopo/cypress-shared": patch
---

test(cypress): cover the post-PoW route() escalation end-to-end. New spec drives a real frictionless session through PoW, installs a routing-kind decision machine that forces image escalation, asserts the PoW-submit response carries an escalation envelope with `captchaType: image`, and waits for the image-captcha modal to mount. Adds `installRoutingMachine` + `removeAllDecisionMachines` chainables on the shared cypress harness, plus a CI matrix step.
