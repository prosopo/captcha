---
"@prosopo/util": minor
"@prosopo/load-balancer": patch
---

Add safeFetch, fetchResponse, fetchText and fetchJson, which return a Result instead of throwing and treat a 4xx or 5xx as a failure. The provider list now uses fetchJson, so an error page from the list endpoint fails clearly rather than being read as a provider list.
