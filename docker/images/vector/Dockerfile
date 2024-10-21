# Image to substitute env vars into vector.toml and start vector

# docker run -it --rm --env-file vector.env -v /home/geopro/bench/captcha5/vector.toml:/etc/vector/vector.toml prosopo/vector:latest

FROM timberio/vector:latest-debian

# Add Docker's official GPG key:
RUN apt-get update \
    && apt-get install -y ca-certificates curl \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo \
"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
$(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
    gettext \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY docker/images/vector/vector.toml /etc/vector/vector.toml

# script for substituting env vars into the vector config
RUN cat <<EOF > /main.sh
#! /bin/bash

# ensure variables are set and no errors
set -eux

# substitute the env vars into the template toml config for vector
envsubst < /etc/vector/vector.toml > /etc/vector/vector-filled.toml

cat /etc/vector/vector-filled.toml

# start vector
vector --config /etc/vector/vector-filled.toml
EOF

RUN chmod +x /main.sh

ENTRYPOINT ["/main.sh"]
