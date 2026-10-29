---
---

The provider's Caddy now turns away crawlers named in a list file instead of only Baidu. The list is mounted at `docker/caddy.d/crawler-user-agents.txt` and read by chaddy's new `crawler_list` matcher. Entries are user-agent text (matched in any case) or address ranges. `!` entries and requests signed with Web Bot Auth (`Signature-Agent`) are never blocked, so verified agents still reach the provider. With no list file, nothing is blocked. The Caddyfile now needs `prosopo/caddy` 2.5.11 or later, which adds the matcher.
