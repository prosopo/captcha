---
"@prosopo/load-balancer": patch
"@prosopo/config": patch
---

Let the development provider URL be set with an environment variable.

In development the widget looked for its provider at a hardcoded
`https://localhost:9229`. That is right when the page and the provider share a
machine and wrong as soon as they do not: a phone or an iOS simulator loading
the demo over the LAN resolves `localhost` to itself, never reaches the
provider, and reports the site key as unregistered — which is a confusing way
to be told the request went nowhere.

`PROSOPO_PROVIDER_URL_DEVELOPMENT` now overrides it, so that case can be
pointed at the host actually running the provider. Unset, it still defaults to
`https://localhost:9229`, so existing setups are unaffected. Staging and
production resolve through their DNS-routed endpoints and ignore it.
