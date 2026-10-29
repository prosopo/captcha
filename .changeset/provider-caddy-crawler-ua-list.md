---
---

The provider's Caddy now turns away any crawler on a deployment-supplied list, not just Baidu. The list comes in through two environment variables: `CADDY_CRAWLER_UA_REGEX` (user agents to block) and `CADDY_AGENT_UA_REGEX` (AI agents acting for a user, never blocked). Requests signed with Web Bot Auth (a `Signature-Agent` header) are never blocked, so the provider can still check them against a site's verified-agent rules. When neither variable is set, only Baidu is blocked, as before.
