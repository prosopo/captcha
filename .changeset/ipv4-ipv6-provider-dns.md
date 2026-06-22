---
"@prosopo/load-balancer": minor
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/types": minor
---

Add ipv4-only / ipv6-only provider DNS routing via `data-ipv4` / `data-ipv6`.

Dapps that need to pin captcha traffic to a single IP stack can now do so:

```html
<div class="procaptcha" data-sitekey="..." data-ipv4="true"></div>
```

What happens under the hood:

- The widget reads `data-ipv4` / `data-ipv6` (or the matching `ipv4` / `ipv6`
  booleans on `ProcaptchaRenderOptions` / explicit `render(...)`) and threads
  them through `ProcaptchaConfigSchema`.
- `pickIpMode(config)` resolves them into an `IpMode` (`"ipv4"` / `"ipv6"` /
  `undefined`); `ipv4` wins if both are set.
- The frictionless / image / pow / puzzle managers pass the `IpMode` into
  `getProcaptchaRandomActiveProvider`, which calls `/healthz` on the matching
  single-stack global hostname (`ipv4.pronode.prosopo.io` or
  `ipv6.pronode.prosopo.io`) and pins subsequent captcha calls to
  `ipv4.pronodeN.prosopo.io` / `ipv6.pronodeN.prosopo.io`. The dual-stack
  cache and the single-stack caches are kept separate.
- `convertHostedProvider` now accepts an optional `IpMode` and, when set,
  selects the matching `ipv4` / `ipv6` sub-object from the provider-list JSON.
  Top-level `ipv4` / `ipv6` keys are skipped by default so existing dual-stack
  callers keep working.
- New helpers in `@prosopo/load-balancer`: `IpMode`, `stripIpModeLabel`,
  `getProviderHostname`.

Coordinated with the matching `captcha-private` change that publishes the
`ipv4` / `ipv6` sub-objects to S3.
