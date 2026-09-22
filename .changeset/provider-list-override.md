---
"@prosopo/load-balancer": minor
"@prosopo/config": patch
---

Let a deployment supply its own provider list with `PROSOPO_PROVIDER_LIST`.

There was no supported way to point the widget at providers you run. The only lever was
`PROSOPO_PROVIDER_URL_DEVELOPMENT`, which is read solely when the environment is `development`, and the widget takes
that environment from `NODE_ENV` at build time. So redirecting a bundle meant building it as a development bundle:
unminified, ~1.9 MB across chunks instead of ~1.4 MB, with rate limiting implications if anyone copied the same setting
onto their provider. Building with `NODE_ENV=production` silently ignored the variable and sent the widget back to
Prosopo's fleet, with nothing in the output to say so.

`PROSOPO_PROVIDER_LIST` is environment-independent, so `production` stays correct everywhere. It short-circuits both
halves of discovery — the `/healthz` call that picks a node, and the list `@prosopo/server` matches a token against —
so a self-hosted deployment makes no request to Prosopo at all.

Two forms, because one node and several have different needs:

```bash
PROSOPO_PROVIDER_LIST=https://captcha1.example.com,https://captcha2.example.com
PROSOPO_PROVIDER_LIST='{"one":{"address":"5Abc...","url":"https://captcha1.example.com","datasetId":"","weight":3}}'
```

The JSON form is the exact shape `provider-list.prosopo.io` serves, parsed by the same `convertHostedProvider`, so
weights and the `ipv4` / `ipv6` sub-lists behave identically. The bare-URL form fills in placeholder `address` and
`datasetId`, neither of which is load-bearing on this path — the DNS-routed production path already passes a constant
for `address`, and clients stopped sending `datasetId`.

Because it returns a list rather than one URL, a multi-provider override gets weighted selection and real failover:
`getRandomProviderFromList` can now exclude a node that just errored and pick a different one, which with a single
development URL degraded to retrying the same node.

Details worth knowing:

- Trailing slashes are stripped. A token embeds the provider URL it was minted against and the verifier matches by
  exact string, so `https://host/` and `https://host` must not disagree.
- A malformed value is ignored and normal discovery resumes rather than throwing, so a deployment-time typo cannot
  take every captcha on a page down with it.
- The env read lives in its own module holding nothing else. Parsing needs `convertHostedProvider` from `balancer.ts`,
  and `balancer.ts` needs the read — putting both in one file would create an import cycle, which this package has
  already lost a release to when a cycle between chunks broke the widget at load.
- `PROSOPO_PROVIDER_URL_DEVELOPMENT` is untouched and still works for local development.

Verified by building a production bundle with the override set: `defaultEnvironment` stays `production`, the bundle is
minified, and the override is baked in.
