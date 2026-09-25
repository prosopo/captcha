---
"@prosopo/types": patch
"@prosopo/provider": patch
---

The DNS event ingest endpoint now checks each event on its own. One malformed event used to make
the whole batch fail validation, so every good event sent alongside it was lost. Bad events are now
dropped and counted, the rest are stored, and the response reports how many were dropped. A single
warning names up to five of the dropped events and why they failed.
