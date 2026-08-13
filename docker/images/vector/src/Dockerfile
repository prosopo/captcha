# Image to substitute env vars into vector.toml and start vector

# docker run -it --rm --env-file vector.env -v /home/geopro/bench/captcha5/vector.toml:/etc/vector/vector.toml prosopo/vector:latest

# Pinned, NOT `latest-debian`. Vector 0.57 made env-var interpolation opt-in
# (behind --dangerously-allow-env-var-interpolation), so under 0.57 every
# ${VAR} in vector.toml below is sent verbatim: the sink URI becomes the
# literal `${NODE_ENV:?err}_provider_node` stream and basic auth puts
# `${OO_USERNAME:?err}` in the Authorization header, so every write 401s.
# Vector still starts and reports healthchecks passing, so the only symptom is
# that nothing reaches OpenObserve. The floating tag meant a rebuild alone was
# enough to trigger it. 0.55 interpolates by default and fails loudly on an
# unset var. Do not add the 0.57 flag while pinned here: 0.55 does not
# recognise it (it has the inverse, --disable-env-var-interpolation) and will
# refuse to start.
FROM timberio/vector:0.55.0-debian

# The apt setup below pipes curl into a file and into apt-key-style steps;
# without pipefail a failed download is masked by the success of the last
# command in the pipe and the image builds with a broken repo list.
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

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

COPY vector.toml /etc/vector/vector.toml

ENV VECTOR_LOG_FORMAT=json

ENTRYPOINT ["vector", "--config", "/etc/vector/vector.toml"]
