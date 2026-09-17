---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/provider": minor
---

Detector signals now travel in a single open field, `d`, instead of one named
field each.

Previously every signal the detector reported needed adding by hand in about a
dozen places — the decoder, two type files, the Mongoose schema, the read
projection, the session write path, the escalation copy, and each machine's
input — and missing any one of them dropped the signal with no error. Signals
were in fact being dropped that way: one was persisted but never reached a
decision machine at all, and three more were lost whenever a user was escalated
from PoW to another challenge.

Now the provider carries whatever the detector reported without knowing what it
is, and hands it to decision and routing machines as `input.d`. A rule can read
a signal that no release of `@prosopo/types` or `@prosopo/provider` has ever
heard of, so adding one no longer requires a release of either. Values keep
their types: a boolean arrives as a boolean and a number as a number.

The bag is client-controlled data that gets persisted, so it is sanitised and
capped on ingress — key names Mongo cannot store are dropped, values that are
not JSON are dropped, and there are limits on key count, string length, array
length, nesting depth and total size.

Two things to note when deploying. Sessions written before this change carry
the old named fields and no `d`, so queries and dashboards that read those
fields need a `d.` prefix; the sessions collection expires after a day, so the
overlap is short. And the sparse session index moves to a dotted path inside
the bag.
