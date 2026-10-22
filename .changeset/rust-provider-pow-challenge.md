---
---

Serve the PoW challenge route (`captcha/pow`) from the Rust provider, proven against the express app on a live store. Also corrects two places where the Rust read request headers differently from Node: repeated `Cookie` lines are joined with `"; "`, and a stored record keeps repeated `Set-Cookie` lines as `set-cookie.0`, `set-cookie.1`. No npm package changes.
