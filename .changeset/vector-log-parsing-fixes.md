---
"@prosopo/vector-docker": patch
---

Fix four log-parsing bugs in the Vector config that forwards service logs to OpenObserve:

- Redis logs were dropped entirely: the transform cleared the event before reading `.message`, so `string!(.message)` aborted on every line. It now reads the line first, and lines that don't match the standard Redis format (startup banner, blank lines) are kept instead of dropped.
- Caddy `request_id` was always null: it read `resp_headers` from the raw Docker envelope instead of the parsed access log. It now reads the parsed body.
- A log line that is valid JSON but not an object (a bare number, string, or array) lost its content: the object check was `!= null`, which is true for any JSON value, so the payload was silently discarded. It now checks `is_object`.
- The event timestamp was dropped when the event was rebuilt, so OpenObserve fell back to ingest time (wrong after a buffered backlog drains). The source timestamp is now preserved when the parsed body doesn't already carry one.
