---
---

CI build, test, install and bundle steps now get 30 minutes and their jobs 60, instead of limits as low as 5 minutes. A cold cache or a slow runner no longer fails a healthy run on time alone; the limits only exist to stop a hung job.
