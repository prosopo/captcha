---
"@prosopo/types": patch
"@prosopo/provider": patch
---

Routing machines can now see which tier a site is on, and free-tier sites can be served icon order.

- `RoutingMachineInput` has a `tier` field: the tier of the account that owns the site key. Machines get it on both the first request and after a PoW solve.
- On free-tier sites, icon order counts as allowed unless the site's `captchaTypeFeatureFlags.iconOrder` is explicitly off. Paid sites keep it off unless the flag is on. Nothing serves icon order unless something asks for it, such as a routing rule or the site owner choosing it, so this changes nothing for a free site on its own.

Together these let a routing rule send a share of free-tier traffic to icon order without turning the flag on for each site.
