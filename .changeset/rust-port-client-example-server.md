---
"@prosopo/client-example-server": patch
"@prosopo/provider": patch
---

Port the client example server to Rust: the same signup, login and private routes, storing users exactly as the Node server does and verifying through the siteverify API or the Rust server library. Checked against the Node server by replaying recorded requests on a live MongoDB. The Node server is unchanged and is still what the docker image ships.
