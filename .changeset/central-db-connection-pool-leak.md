---
"@prosopo/database": patch
---

Stop leaking a mongoose connection pool on every failed database connect.

`MongoDatabase.connect()` assigns `this.connection` only once the connection
opens, so a connection that fails to open is unreachable from the instance and
`close()` can never reach it — while mongoose keeps its topology monitor, its
`minPoolSize: 5` pool and its entry in `mongoose.connections` alive and
retrying forever. `onError` now destroys that connection. `destroy` rather than
`close` because only `destroy` drops the `mongoose.connections` entry, which
would otherwise retain the object on its own. The teardown is guarded so that a
runtime `error` on an already-open connection is not mistaken for a failed
connect and does not tear down a working pool; the `error` listener stays
registered after `open` because an `EventEmitter` `error` with no listener
would take the process down.

Observed on a provider whose connects to the central DB were timing out: 524
failed connects an hour accumulated 5,819 ESTABLISHED sockets to the central
DB and 5,859 TLS sockets, and the resulting flood of driver DNS lookups
saturated libuv's four-thread pool — 8,812 `getaddrinfo` calls queued — so
every unrelated outbound lookup in the process backed up behind them. That
provider burned 3.45x the CPU of a healthy peer while serving 2.5x less
traffic, with event-loop p99 at 240ms against the peer's 27ms.

`getMongoConnectionOptions` also gains `connectTimeoutMS` and
`serverSelectionTimeoutMS` overrides, and `CentralDbStreamer` passes 45s for
both. The 10s default is sized for a database that is local or on the same
continent; the central DB is long-haul for every provider and genuinely distant
for some, where the TLS handshake alone measures 2-30s. Under the old ceiling
those providers could never connect at all, so the streamer burned a connect
attempt every cooldown forever and streamed no records — which is what fed the
leak above.
