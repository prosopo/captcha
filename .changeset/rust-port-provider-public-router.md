---
"@prosopo/provider": patch
"@prosopo/api-express-router": patch
---

Port the provider's public routes to Rust: `/healthz` with its optional geo steering, the provider details, and the asset document page, together with what the express app does around every route (CORS, the JSON body limit and parsing, the client IP and host behind one proxy, ETags and 304s, and express's error pages). Checked against the raw answers of the real express app to 819 requests. The Rust refuses four kinds of JSON body the TypeScript reads (a lone surrogate escape, a number beyond the double range, nesting 128 deep or more, and a UTF-7 charset). The TypeScript is unchanged.
