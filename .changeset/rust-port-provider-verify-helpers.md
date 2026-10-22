---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/util": patch
---

Port the provider's verification helpers to Rust: the traffic filter (VPN, proxy, Tor, datacenter and other IP categories), a site's email spam rules, the DNS path asymmetry score and the frictionless score. Checked against the TypeScript over generated inputs. The types crate gains a JS regex wrapper that matches as Node does, including the corner cases where the Rust regex engine reads a pattern differently. The TypeScript is unchanged.
