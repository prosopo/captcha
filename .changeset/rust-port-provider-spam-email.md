---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Port the provider's spam email check to Rust: the `spam/email` route with its spam list, parent-domain matching, SSRF refusal, and CNAME, MX and redirect checks. Checked against the real express app on live MongoDB with a stand-in DNS server. With it, every stage of the routes planned for the second rollout phase now runs in Rust. The TypeScript is unchanged.
