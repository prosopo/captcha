---
"@prosopo/types": patch
"@prosopo/provider": patch
---

Decision machines can now see which page the captcha was rendered on. `currentUrl` (the top-frame page) and `iframeUrl` (the widget's own frame, when embedded) were already stored on the session and already read back from the database, but the verify-time path never passed them to the decision machine, so rules always saw them as undefined.

They are now forwarded on all three verify paths (image, PoW and puzzle). No behaviour changes on its own — it just makes the fields available to rules that need to treat an embedded widget differently from a first-party one.

Both values are reported by the client and are not checked against the request's Origin or Referer header, so a rule must not hand out an exemption on the strength of these fields alone.
