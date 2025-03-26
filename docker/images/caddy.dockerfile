FROM caddy:2-builder AS builder
RUN apk update && apk add gcc g++ make libpcap-dev libpcap
RUN CGO_ENABLED=1 xcaddy build \
    --with github.com/mholt/caddy-ratelimit \
    --with github.com/prosopo/chaddy \
    --with github.com/lolPants/caddy-requestid
FROM caddy:2
RUN apk update && apk add libpcap
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
