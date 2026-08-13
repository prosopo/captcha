FROM caddy:2-builder AS builder
RUN apk update && apk add gcc g++ make libpcap-dev libpcap
RUN CGO_ENABLED=1 xcaddy build \
    --with github.com/mholt/caddy-ratelimit \
    --with github.com/prosopo/chaddy \
    --with github.com/lolPants/caddy-requestid \
    --with github.com/mholt/caddy-l4
FROM caddy:2
RUN apk update && apk add libpcap
RUN apk add --no-cache curl
# Create a static directory for Caddy and write robots.txt inside the image
# printf, not `echo -e`: the base image's /bin/sh is busybox ash, where echo's
# flags are undefined behaviour, so `-e` can end up in the file itself.
RUN mkdir -p /srv/static && \
    printf 'User-agent: *\nDisallow: /\n' > /srv/static/robots.txt
COPY --from=builder /usr/bin/caddy /usr/bin/caddy

