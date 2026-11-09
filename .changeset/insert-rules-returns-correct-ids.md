---
"@prosopo/user-access-policy": patch
---

Inserting access rules now returns the id of every inserted rule. It used to drop the first four ids of each batch and return the rest with their storage prefix still on, so the counts and ids logged by the insert endpoint were wrong.
