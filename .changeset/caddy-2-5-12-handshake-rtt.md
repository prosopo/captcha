---
---

`prosopo/caddy:2.5.12` picks up chaddy with the TLS handshake round trip (prosopo/chaddy#22).

Every TLS request now carries `X-TLS-Handshake-Rtt-Us`: the time from the server's handshake reply to the client's answer, in microseconds, measured once per connection. Sessions store it in `headers` straight away. prosopo/captcha#3681 also saves it as `tlsHandshakeRttUs`. No other header changes.
