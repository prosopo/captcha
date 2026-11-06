---
---

CI only, no package bump.

Jobs that start containers now print `docker ps -a` and the last 200 lines of every container's log when they fail or are cancelled, using the shared `container-logs` action. It runs before the containers are torn down. The logs go to the job console, where secrets are masked, never to an artifact.
