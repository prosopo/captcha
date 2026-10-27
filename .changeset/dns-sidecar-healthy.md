---
"@prosopo/provider": patch
"@prosopo/types": patch
---

Decision machines now get `dnsSidecarHealthy`. It is `true` when the provider got an authenticated DNS event batch in the last 5 minutes. Rules that deny on a missing `dnsEvent` can check it first, so a broken DNS sidecar (e.g. an expired admin JWT) no longer denies every real user.
