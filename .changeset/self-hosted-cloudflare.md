---
"@prosopo/scripts": patch
---

Document and support self-hosting on Cloudflare's free plan, for anyone without a server that has a public IP.

A Worker on the free `workers.dev` subdomain serves the widget and forwards API calls through a Workers VPC binding to a
Cloudflare Tunnel, so the provider can run on any machine with Docker: no domain, no open ports, no certificates.

- `docker/cloudflare/worker.ts` and `wrangler.jsonc`: the Worker. It also serves a demo page at `/` that shows whether
  the provider is reachable, renders the CAPTCHA and displays the response token. It sets `X-Forwarded-For` to the
  visitor's address, because without it the provider sees every visitor as the tunnel and per-IP limits apply to all of
  them together.
- `docker-compose.self-hosted.cloudflare.yml`: adds `cloudflared` and leaves Caddy out, since Cloudflare terminates TLS.
- `generateSelfHostedEnv.ts --cloudflare`: writes a `COMPOSE_FILE` that loads both compose files and a
  `CLOUDFLARE_TUNNEL_TOKEN` to fill in.
- `SELF_HOSTING.md`: a "No server? Run it on Cloudflare's free plan" section.
