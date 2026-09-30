# Bump the caddy tag, digests and plugin versions together; the digests are the
# multi-arch index digests from `docker buildx imagetools inspect caddy:<tag>`.
FROM caddy:2.11.4-builder@sha256:401121e61853cb9c7df83cba43e532e49a68e30f32921c7bdcb7a4912168c067 AS builder
RUN apk add --no-cache gcc g++ make libpcap-dev libpcap
RUN CGO_ENABLED=1 xcaddy build v2.11.4 \
    --with github.com/mholt/caddy-ratelimit@v0.1.0 \
    --with github.com/prosopo/chaddy@v0.0.0-20260819161923-2a4ccd08e838 \
    --with github.com/lolPants/caddy-requestid@v1.1.2 \
    --with github.com/mholt/caddy-l4@v0.1.2
FROM caddy:2.11.4@sha256:0c994536bddb66445885237f1a5dcc1916bccea922661c76b4e9fc24061f9b52
RUN apk add --no-cache libpcap curl
# Create a static directory for Caddy and write robots.txt inside the image
RUN mkdir -p /srv/static && \
    echo -e "User-agent: *\nDisallow: /" > /srv/static/robots.txt
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
