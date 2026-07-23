---
"@prosopo/database": patch
---

test(database): prime CentralDbStreamer connection in beforeAll to remove startup race

`CentralDbStreamer` calls `ensureConnected` lazily on the first fire-and-forget stream, so `db.tables.<collection>` is populated by an async mongoose model registration that the tests don't await. On a fast CI runner the test's synchronous `tables.<collection>.findOne(...)` can execute before that registration lands, throwing `TypeError: Cannot read properties of undefined (reading 'findOne')` — observed intermittently on `puzzleCentralStreaming.integration.test.ts > streamPuzzleUpdate fetches the full record and streams it` (the failing case has an extra promise hop through `getFullRecord()`, which widens the race).

`beforeAll` in the two affected integration tests now awaits `db.connect()` directly (via the same cast style already used by `afterAll` for `db.close()`), guaranteeing `db.tables.*` is populated before any test reads from it. `MongoDatabase.connect()` is idempotent (base/mongo.ts:85) and mongoose's `connection.model(name, schema)` returns the existing model when re-registered with the same schema instance, so the streamer's later lazy `ensureConnected` call is safe.

Purely a test-race fix — no production code changes.
