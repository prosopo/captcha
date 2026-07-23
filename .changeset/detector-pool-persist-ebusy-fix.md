---
"@prosopo/provider": patch
---

fix(detector-pool): persist into the pool directory instead of replacing it

The previous stage-and-rename persist was destructive against the provider's
bind-mounted pool directory: it deleted the mount's contents and then failed
with EBUSY renaming over the mount point, wiping the on-disk pool while still
reporting the push as successful. Now writes each bundle via a per-file temp +
rename within the directory and prunes removed bundles, never touching the
directory itself.
