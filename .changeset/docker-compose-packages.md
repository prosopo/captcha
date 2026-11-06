---
"@prosopo/provider-compose": minor
"@prosopo/provider-mock-compose": minor
"@prosopo/oo-compose": minor
"@prosopo/client-example-server-compose": minor
"@prosopo/redis-compose": minor
"@prosopo/mongo-compose": minor
---

Group the provider, provider-mock, oo, client-example-server, redis and mongo compose files and Caddyfiles into one versioned package per stack, so a deploy can pin the exact bundle it runs. Each package lints its own files.
