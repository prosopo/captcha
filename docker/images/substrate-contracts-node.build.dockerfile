FROM docker.io/paritytech/ci-unified:latest AS builder

RUN git clone --depth 1 -b astar https://github.com/prosopo-io/substrate-contracts-node

WORKDIR /builds/substrate-contracts-node

RUN cargo build --verbose --locked --release

FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get upgrade -y --only-upgrade libstdc++6

RUN apt-get install -y procps

RUN rm -rf /var/lib/apt/lists/*

COPY --from=builder /builds/substrate-contracts-node/target/release/substrate-contracts-node /usr/local/bin

EXPOSE 30333 9933 9944 9615

USER root

CMD exec /bin/bash -c "substrate-contracts-node --dev -d ./chain-data --unsafe-rpc-external --rpc-external --prometheus-external -lerror,runtime::contracts=debug"
