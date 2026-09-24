---
"@prosopo/api": patch
"@prosopo/types": patch
"@prosopo/server": patch
---

A site owner's `isVerified` call no longer hangs when the provider stops answering. Requests from `@prosopo/api` clients can now carry a timeout, and `@prosopo/server` sets one of 10 seconds for its verify calls. You can change it with the new `providerRequestTimeoutMs` config option. When the timeout fires, `isVerified` throws `API.BAD_REQUEST` with code 504 and the user is not verified. Before, the call waited for the platform default of about 300 seconds. Browser clients keep their current behaviour.
