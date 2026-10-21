---
"@prosopo/api-express-router": patch
---

Port the API router to Rust on axum: the new `prosopo-api-router` crate mounts api-route endpoints as POST routes and answers failures with the same JSON error envelope, and ports the admin JWT auth middleware, its replay guard, the request logger and the request language layer. The TypeScript is unchanged.
