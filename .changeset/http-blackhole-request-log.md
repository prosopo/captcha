---
"@prosopo/http-blackhole": patch
---

fix(http-blackhole): make the per-socket request log unsubstitutable

`handleRequest` took the request log as a `WeakMap` parameter, which does not
actually constrain anything: `Map` is structurally assignable to `WeakMap`
(both satisfy get/set/has/delete, and neither narrows `Symbol.toStringTag` to a
literal), so a caller passing a strongly-keyed `Map` compiled cleanly and would
have retained every socket the process ever served — on a server that holds
every connection open by design.

The seam is now a `RecordRequest` callback, which admits no such substitution,
and the map itself is built by `createRequestLog` — a single construction site
the tests assert against directly, by registering a socket, dropping the only
strong reference and forcing collection with `--expose-gc`. Weakness is a
property of the class rather than of the type, so observing it is the only way
to prove it.

Also covers `src/index.ts`, which was previously untested: it starts listening,
registers both SIGINT and SIGTERM, exits zero on a clean shutdown, and ignores
a repeat signal.
