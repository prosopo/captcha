# @prosopo/load-balancer

Provider load balancer for Procaptcha

## Provider Selection Config

Each provider in the json has the following properties:

```typescript
{
  address: string;      // Provider account address
  url: string;          // Provider API endpoint
  datasetId: string;    // Dataset identifier
  weight?: number;      // Optional weight (1-100, defaults to 1)
}
```

### Weight Field

The `weight` field controls how often a provider is selected:

- **Range**: 1-100 (values outside this range are automatically coerced)
- **Default**: 1 (if not specified)
- **Type**: Integer (decimal values are rounded)
- **Effect**: Higher weight = more traffic

#### Examples

```json
{
  "provider1": {
    "address": "...",
    "url": "https://provider1.example.com",
    "datasetId": "...",
    "weight": 1
  },
  "provider2": {
    "address": "...",
    "url": "https://provider2.example.com",
    "datasetId": "...",
    "weight": 3
  }
}
```

In this example:
- Total weight = 4
- Provider 1 receives ~25% of traffic
- Provider 2 receives ~75% of traffic

## Overriding the provider list

By default the list is fetched from `provider-list.prosopo.io` for `staging` and `production`, and hardcoded to a local
provider for `development`. `PROSOPO_PROVIDER_LIST` replaces all of that with providers you name, in every environment.

This is what a [self-hosted](https://docs.prosopo.io/en/self-hosting/) deployment uses. It short-circuits both halves of
discovery — the `/healthz` call the widget makes to pick a node, and the list a verifier matches a token against — so
nothing reaches Prosopo.

Two forms are accepted. One or more comma-separated URLs:

```bash
PROSOPO_PROVIDER_LIST=https://captcha1.example.com,https://captcha2.example.com
```

...or the same JSON shape documented above, when you want to set weights or the `ipv4` / `ipv6` sub-lists:

```bash
PROSOPO_PROVIDER_LIST='{"one":{"address":"5Abc...","url":"https://captcha1.example.com","datasetId":"","weight":3}}'
```

Notes:

- Trailing slashes are stripped. A token embeds the provider URL it was minted against and `@prosopo/server` finds the
  issuer by exact string match, so `https://host/` and `https://host` must not be able to disagree.
- A malformed value is ignored and normal discovery resumes, rather than throwing. A deployment-time typo should not
  take down every captcha on the page — check your logs if an override seems to have no effect.
- The bare-URL form ignores `ipMode`. The `ipv4.` / `ipv6.` labels are a property of Prosopo's own DNS and prefixing
  them onto another host would resolve to nothing. Use the JSON form's sub-lists if you run single-stack sub-zones.
- Frontend builds bake the value in at bundle time; Node reads it at runtime.

`PROSOPO_PROVIDER_URL_DEVELOPMENT` still exists and still only applies when the environment is `development`. Prefer
`PROSOPO_PROVIDER_LIST`, which works in a production build.
