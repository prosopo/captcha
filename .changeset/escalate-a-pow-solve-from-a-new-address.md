---
"@prosopo/provider": patch
"@prosopo/types": patch
---

Escalate a PoW solve to an image captcha when it arrives from a different address than the challenge.

A PoW challenge is bound to the user account and the site key and to nothing about where the request came from, so a solved challenge can be carried to any host that wants a free pass. The issuing address is already on the record, so binding to it costs nothing: `verifyPowCaptchaSolution` now compares it against the address submitting the solve and escalates when they differ, under a new `IP_CHANGED` reason.

Escalation, not denial. A phone handing off between towers mid-solve is a real user and should pay a picture rather than be turned away. For the same reason IPv6 is judged on the /64 alone — the interface identifier in the low 64 bits rotates by design under RFC 8981, several times a day on one unchanged connection — and an address we could not read counts as unchanged.

Only applies where a session is linked, since escalation carries the originating session's risk profile forward. Missing coordinates still takes precedence as the reported reason when both fire.
