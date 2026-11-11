---
"@prosopo/provider": patch
---

Keep the TCP stack signals (MSS, TTL, window, options and the rest) on two kinds of session that were dropping them.

The first is sessions on sites pinned to one captcha type, and the empty-pool fallback. They kept the raw tcp-probe record but not the fields the routing rules read, so every TCP rule was blind for those sites. The second is the record written when an access policy blocks a request. It had no TCP or TLS fields at all, so blocked traffic could not be compared with allowed traffic on its network stack.
