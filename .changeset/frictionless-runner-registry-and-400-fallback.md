---
"@prosopo/provider": patch
"@prosopo/procaptcha-frictionless": patch
---

Stop `DecisionMachineRunner` retaining every instance, and re-roll the frictionless widget onto another provider on an unrecognised error.

`DecisionMachineRunner` enrolled itself in a module-level `Set` so an artifact upload could flush every runner's cache. That assumed runners were built once per process; they are built per request, and nothing pruned the set, so it grew for as long as the process lived and construction eventually began to fail. `WeakRef` did not bound it — the set held the wrapper, which outlives its referent. The registry is replaced by a generation counter: an invalidation bumps it, and a runner drops its cache when the value it carries no longer matches. Nothing holds a runner reference, so there is nothing to grow.

The widget compounded it. The HTTP client does not throw on a 400 with a JSON body, so a provider-side failure came back looking like a normal result, and the frictionless guard turned it into a terminal error — no fallback, no retry, no restart timer. One unhealthy provider stranded the user on its first response even when every other node was healthy. Errors whose key we do not recognise are now thrown, which hands them to the existing provider re-roll. Integration faults (site key, origin, captcha type) and policy denials still display as before: another provider returns the same answer, and for those the message is the point. Errors with no key at all are unchanged, since hard blocks arrive in that shape. A site's error callback now also fires once retries are exhausted, which it previously did not.
