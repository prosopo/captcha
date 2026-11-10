---
"@prosopo/client-example-server": patch
---

The example server's login now only accepts a captcha result of exactly `true`, the same as signup. Before, any truthy value, such as the string `"false"`, let a login through.

The auto-increment plugin for user ids is now applied once, where the user schema is defined. Before, every new database connection added another copy of it to the shared schema, so a process with more than one connection numbered users in steps of two or more.
