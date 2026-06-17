---
"@prosopo/load-balancer": patch
"@prosopo/types": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/provider": patch
---

feat(load-balancer): ipv4/ipv6-only provider DNS via data-ipv4/data-ipv6

The provider list JSON shipped from S3 now carries sibling `ipv4` and
`ipv6` sub-objects alongside the dual-stack entries (produced by the
matching change in captcha-private's `providerListJson.ts` against the
`ipv4.<host>` / `ipv6.<host>` records that `addDnsRecords.yml` already
provisions). This change wires the selection through the SDK so dapps
can pin provider DNS resolution to a single stack:

- `load-balancer`: `convertHostedProvider` skips the new top-level
  `ipv4`/`ipv6` keys by default (existing dual-stack callers
  unchanged) and switches to the matching sub-list when an `IpMode`
  is passed. `loadBalancer` / `prefetchProviders` /
  `getRandomActiveProvider` accept an optional `IpMode`; the in-flight
  cache is now keyed by env + mode so the dual-stack and per-mode
  lists don't share entries. Custom loaders set via `setProviderLoader`
  receive `ipMode` as a second argument.
- `types`: `ProcaptchaRenderOptions` and `ProcaptchaConfigSchema` gain
  optional `ipv4` and `ipv6` booleans. `ipv4` wins if both are set.
- `procaptcha-bundle`: implicit render reads `data-ipv4` /
  `data-ipv6` from the host element (and from the invisible button
  variant) and threads them through `createConfig`.
- `procaptcha-common`: new `pickIpMode(flags)` helper;
  `getProcaptchaRandomActiveProvider` accepts the chosen `IpMode`.
- `procaptcha` / `procaptcha-pow` / `procaptcha-puzzle`: each manager
  passes `pickIpMode(currentConfig)` into the provider lookup.
- `procaptcha-frictionless`: `customDetectBot` binds the chosen
  `IpMode` into the `getRandomActiveProvider` callback handed to the
  detector, so the frictionless path also respects the dapp's
  preference; `prefetchProviders` is invoked with the same mode.
- `provider`: `startProviderApi`'s cacheFile loader forwards `ipMode`
  through to `convertHostedProvider`, so server-side callers can
  request the per-mode sub-list too.
