---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
---

Store the whole-SYN fields the tcp-probe sidecar now reports.

The sidecar's handshake record grew from 80 to 104 bytes and the tail was reordered (prosopo/Protect#1167). chaddy was updated to read both layouts and to forward the new fields as their own headers (prosopo/chaddy#16, #17); this is the provider side of that, so the values have somewhere to land instead of being dropped at the middleware.

Twelve new fields on `Session`, all optional: `tcpOptsKinds`, `tcpOptsPresent`, `tcpOptsCount`, `tcpTsval`, `tcpTsecr`, `tcpFlags`, `tcpDataOffsetResv`, `tcpUrgPtr`, `ipIdent`, `ipTotalLen`, `ipFragFlags`, `ipTos`. They are surfaced on the decision-machine input the same way the existing TCP fields are, so routing and verify rules can read them.

`tcpOptsKinds` is stored decoded — the IANA kind number of each TCP option in wire order, `[2, 4, 8, 1, 3]` on an ordinary Linux SYN. The probe emits it packed into a u64, and a u64 reaches 2^64 while a JS number is exact only to 2^53, so the packed form could not be held without rounding; the rounding would land in the low bytes, which are the option kinds themselves. The array holds the same information and is queryable per position. It also replaces the old `tcpOptsOrder`, which packed 4 bits per option and so could not tell MSS from TCP Fast Open, or Window Scale from MD5, and could not represent MPTCP at all.

`tcpOptsFlags` and `tcpOptsOrder` are kept and still read. A pronode running an older chaddy still sends them, and years of rows hold them, so removing them would both lose the rollout window and break any routing rule already reading them. They go undefined on new sessions once the fleet is rolled.

`tcpTsval` and `tcpTsecr` are written only when the Timestamps option was actually on the SYN. A TSval of 0 is legal and a TSecr of 0 is expected, so neither can use zero to mean absent.

Six places named every one of these fields by hand — the middleware's copy onto the request, the session write, and four task files building the decision-machine bag. They now all go through one list, with a compile-time check that every field of `RawTlsSignals` is on it. That is not tidying: the Session projection comment in `@prosopo/types-database` records a field being missed in exactly this way, after which the rules reading it got `undefined` and silently never fired against real traffic.

Separately, the provider compose no longer defaults the sidecar to `prosopo/tcp-probe:latest`. The probe's reply is a bare fixed-size struct with no version in it, so the image tag is the only statement of which layout a host serves, and publishing `:latest` would change that on every pronode at the next pull with nobody running a deploy. The default is now the `0.1.1` both Protect inventories already pin.

Tests: the new headers all parse; a packed value above 2^53 decodes without losing its low bytes; the kind pairs the old encoding aliased stay distinct; a trailing end-of-option-list terminates the list rather than appearing in it; an all-zero packed value reads as absent rather than as an empty list; malformed and out-of-range values are ignored; the legacy header pair is still read; and a zero is kept rather than dropped, since `ipIdent` 0 and `tcpTsecr` 0 are real readings.
