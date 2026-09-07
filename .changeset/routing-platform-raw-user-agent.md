---
"@prosopo/provider": patch
---

fix(provider): give the routing machine the request user agent, not the hashed one

`decryptPayload` returns `userAgent` already hashed — it exists so
`runUserAgentMismatchCheck` can compare it against `hashUserAgent(request UA)`.
The frictionless handler was also passing that hash into `derivePlatform` and
`raw.userAgent` on the routing context, so every UA-derived signal the routing
machine sees was computed from a 32-character hex digest.

`platform.isApple` was therefore always false on the fresh frictionless path.
Not usually — always: the regex matches `iPhone` / `iPad` / `Macintosh`, and
every one of those contains a letter outside `[0-9a-f]`, so no hash can match.
The UA fallback inside `isMobile` was dead for the same reason and only worked
when ipInfo supplied the bit.

The dedup replay a few hundred lines above already read
`req.headers["user-agent"]` directly, so the two paths disagreed about the same
request. The fresh path now reads the header too. The hashed value is untouched
where it belongs — it still goes to the decision machine for the mismatch check.

Two live consequences, both of which restore intended behaviour:

- `pow-baseline-apple-passthrough` in the global routing machine could never
  fire on a fresh session. Apple devices on a PoW baseline fell through to the
  rate ladder and were escalated to image captchas on volume alone. This is
  what put a genuine iPhone — bot score 0.219 against a 0.5 threshold, zero
  triggered detectors — into an image challenge.
- `isUndeclaredMiddlebox` in the shared route checks gates on
  `isAppleUa(raw.userAgent)`, so the `UNDECLARED_VPN_TCP_STACK` escalation was
  unreachable on that path. It is not new or untested logic — it already fires
  on the paths that carry the real UA — it simply becomes reachable here too.

Rules classifying on `platform.osNameIn` / `browserNameIn` / `deviceTypeIn` were
misclassifying on this path for the same reason, and now resolve correctly.

Covered by a regression test that asserts the routing context receives the real
user agent and resolves `isApple` for an iPhone UA; it fails against the old
code with `isApple: false`.
