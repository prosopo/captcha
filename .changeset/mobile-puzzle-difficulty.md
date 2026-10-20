---
"@prosopo/captcha-severity": patch
"@prosopo/provider": patch
---

Make the puzzle easier to solve on a phone.

Two changes. First, how we work out whether the user is on a phone at all: it
used to be read off the IP's mobile-carrier flag, which says what network the
address is on and not what device is holding it, so every phone on home Wi-Fi
or behind a VPN counted as a desktop. It is now weighed across everything the
request carries — the User-Agent, the `Sec-CH-UA-Mobile` and
`Sec-CH-UA-Platform` client hints, the carrier flag, the connection's MSS, the
in-app-browser flag, and the touch readings that arrive with a solved
challenge. Signals that disagree cancel out, so a desktop browser claiming a
phone's User-Agent still counts as a desktop, and a touchscreen laptop is no
longer mistaken for a phone.

Second, a phone is never asked for a placement more accurate than a fingertip
can give, nor handed a piece smaller than a fingertip covers. Both are applied
when the challenge is cut, so they hold whichever route set the difficulty —
the site's own setting, a traffic-filter policy, a routing machine, or
automatic escalation.
