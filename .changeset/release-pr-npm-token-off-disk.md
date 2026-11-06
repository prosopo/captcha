---
---

The release PR workflow no longer writes the npm token into ~/.npmrc. The file now holds a ${NPM_TOKEN} placeholder that npm fills from the job environment, so the token does not stay on disk on self-hosted runners.
