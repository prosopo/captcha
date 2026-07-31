---
"@prosopo/api-route": patch
---

test(api-route): cover the endpoint contract, and export ApiRouteLimit

This package ships exactly one runtime value, so most of its business logic
lives in its types — notably the conditional signature of
`ApiEndpoint.processRequest`, which gives an endpoint with a schema its parsed
arguments and an endpoint without one no arguments at all. Both branches are
now covered by type tests, alongside runtime tests for the response status enum
(its strings cross the wire and are compared literally by clients) and for the
package's export surface.

Writing them surfaced a gap: `ApiRouteLimit` was declared but never re-exported,
so a consumer assembling an `ApiRouteLimits` record entry by entry had no way to
name what it was building and had to redeclare the shape. It is now exported.
