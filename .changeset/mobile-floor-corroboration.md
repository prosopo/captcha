---
"@prosopo/provider": patch
---

Follow-up to the mobile puzzle sizing. Two corrections.

The easier placement target and larger piece are now only given to a request
where something other than a request header says the user is on a phone — the
network, the in-app-browser flag, or the touch readings that come back with a
solved challenge. A User-Agent on its own still picks the milder difficulty
ladder, which is one step either way, but it no longer earns the full easing:
anyone can put `iPhone` in a User-Agent, and on a site that deliberately sets a
hard puzzle for suspicious traffic that would have been a free way out of it.

A mobile-carrier address and a small packet size were also being counted as two
separate pieces of evidence when the second mostly follows from the first. They
now count once between them, which stops a laptop tethered to a phone adding up
to a phone.
