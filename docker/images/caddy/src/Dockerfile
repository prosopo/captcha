FROM caddy:2-builder AS builder
RUN apk update && apk add gcc g++ make libpcap-dev libpcap
RUN CGO_ENABLED=1 xcaddy build \
    --with github.com/mholt/caddy-ratelimit \
    --with github.com/prosopo/chaddy \
    --with github.com/lolPants/caddy-requestid
FROM caddy:2
RUN apk update && apk add libpcap
RUN apk add --no-cache curl
# Create a static directory for Caddy and write robots.txt inside the image
RUN mkdir -p /srv/static && \
    echo -e "User-agent: *\nDisallow: /" > /srv/static/robots.txt
COPY --from=builder /usr/bin/caddy /usr/bin/caddy

