# Image to substitute env vars into vector.toml and start vector

# docker run -it --rm --env-file vector.env -v /home/geopro/bench/captcha5/vector.toml:/etc/vector/vector.toml prosopo/vector:latest

FROM timberio/vector:latest-debian

COPY vector.toml /etc/vector/vector.toml

ENTRYPOINT ["vector", "--config", "/etc/vector/vector.toml"]
