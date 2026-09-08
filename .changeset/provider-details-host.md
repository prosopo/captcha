---
"@prosopo/types": patch
"@prosopo/provider": patch
---

feat(types,provider): report `host` in `/details`

`providerDetailsSchema` grows an optional `host`, and the `/details` handler
populates it from `config.host`, falling back to the request's hostname when
that is unset — the same shape `/healthz` already uses.

`/details` already reports the version and Redis readiness; it just did not
say which node answered. Callers that want the answering node's identity can
now read it there instead of inferring it from a liveness endpoint.

The field is optional on purpose. A fleet is mixed-version part-way through a
rolling deploy, so a required field would fail validation against a node that
has not been upgraded yet. Consumers should treat it as absent-or-string.
Purely additive: nothing existing changes shape.
