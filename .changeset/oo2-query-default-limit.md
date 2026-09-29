---
---

Raise OpenObserve's default query row limit on oo2 from 1000 to 20000 so dashboard graphs stop showing missing chunks.

Dashboard panels send no row limit, so OpenObserve applied its default of 1000 and quietly dropped whole time ranges once a query went over it. Panels that bucket every 5 minutes and split by node or status passed that easily: "Host load1 per node" over 24h showed 6 of 24 hours. The data was all there; only the query results were cut.

The limit stays finite because it is also the only guard against a raw query with no LIMIT pulling billions of rows into memory.
