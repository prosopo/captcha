---
---

Raise the step time limits under 5 minutes in the actionlint, docker and package-scope workflows to 5. Tight limits trip on a slow runner rather than a real hang; the job limit still catches those.
