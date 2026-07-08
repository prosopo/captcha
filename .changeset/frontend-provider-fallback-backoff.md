---
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/load-balancer": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha": patch
"@prosopo/types": patch
---

fix(procaptcha): random provider re-selection + backoff on error fallback

When a provider errored, the widget retried the same DNS-routed endpoint immediately and in a tight loop. A fleet of widgets whose provider was unhealthy could therefore accidentally DDoS the provider fleet — retrying the same (possibly-down) endpoint as fast as the event loop allowed.

The error-fallback path now:

- **Re-selects a different provider on retry.** The first attempt still hits the DNS-routed endpoint (unchanged happy path, preserves session stickiness). On a retry the widget picks a random provider straight from the provider list (`getRandomProviderFromList`), weighted by provider capacity and excluding the URL that just failed. In development the list holds only the single local provider, so a retry simply re-targets that provider.
- **Backs off between retries.** `providerRetry` now waits an exponential-backoff-with-full-jitter delay (0.5s → 1s → 2s → 4s …, capped at 10s) before retrying, so a down provider is no longer hammered and a fleet of clients that all errored at once don't reconverge into a thundering herd.

Applies to the image, PoW and puzzle managers and the frictionless detection flow. New shared `ProviderSelectRetryContext` type; `BotDetectionFunction` gains an optional retry-context argument.
