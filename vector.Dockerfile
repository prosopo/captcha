# docker run -it --rm --env-file vector.env -v /home/geopro/bench/captcha5/vector.toml:/etc/vector/vector.toml prosopo/vector:latest

FROM timberio/vector:latest-debian

RUN apt-get update && apt-get install -y --no-install-recommends \
    gettext \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

VOLUME /config

# script for substituting env vars into the vector config
RUN cat <<EOF > /main.sh
#! /bin/bash

# ensure variables are set and no errors
set -eux

# substitute the env vars into the template toml config for vector
envsubst < /etc/vector/vector.toml > /etc/vector/vector-filled.toml

cat /etc/vector/vector-filled.toml

# start vector
# vector --config /etc/vector/vector-filled.toml
EOF

RUN chmod +x /main.sh

ENTRYPOINT ["/main.sh"]
