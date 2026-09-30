---
"@prosopo/provider": patch
---

Stream the traffic-filter tarpit padding with backpressure, and spread it across the response body instead of a single leading field.

The padding is written in 64 KiB chunks that wait for the socket to drain, and is abandoned if the connection goes away, so provider memory stays flat while a padded response is in flight however slowly it is read.

It is also split into several members with generated keys, one before each real field, rather than one `pad` member at the front. The body is the same size and parses the same way; no consumer reads these fields.
