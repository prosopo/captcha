FROM docker.io/paritytech/ci-linux:production AS builder

RUN git clone --depth 1 --branch polkadot-v0.9.40 https://github.com/paritytech/substrate

WORKDIR /builds/substrate

RUN cargo build --verbose --locked --release

FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get upgrade -y --only-upgrade libstdc++6

RUN apt-get install -y procps

RUN rm -rf /var/lib/apt/lists/*

COPY --from=builder /builds/substrate/target/release/substrate /usr/local/bin

EXPOSE 30333 9933 9944 9615

USER root

CMD exec /bin/bash -c "substrate --dev -d ./chain-data --unsafe-ws-external --rpc-external --prometheus-external -lerror,runtime::contracts=debug"
