---
"@prosopo/api-route": minor
"@prosopo/api-express-router": minor
"@prosopo/user-access-policy": minor
"@prosopo/provider": patch
---

API route tables can now be typed by their paths, endpoints can type their response data and declare an HTTP method, and `defineApiRoute` describes a route's path, method and schemas in one place that server and client can share. Get-missing-ids is the first route to use this.
