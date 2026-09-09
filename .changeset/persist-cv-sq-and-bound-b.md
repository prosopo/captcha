---
"@prosopo/provider": patch
---

Persist `cv` and `sq` on the session record. Both were decoded from the detector
payload and copied onto the session params, but `createSession` had no entry for
them and dropped them before the write — the same hop where `b` was being lost.
Escalation sessions now carry them forward alongside `g` / `i` / `b`.

The client-supplied `b` signal map is bounded and stripped of keys Mongo cannot
store as field names before it reaches the record, so a malformed or oversized
payload can no longer fail the session insert and turn into a failed captcha
request.
