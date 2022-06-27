FROM debian:bookworm-slim AS builder

RUN apt-get update
RUN apt-get install -y \
    build-essential \
    clang \
    curl \
    git \
    libssl-dev \
    libudev-dev \
    llvm \
    pkg-config

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

RUN . ~/.cargo/env && \
    rustup default stable &&\
    rustup update &&\
    rustup update nightly &&\
    rustup target add wasm32-unknown-unknown --toolchain nightly

RUN git clone --depth 1 --branch higher-balances https://github.com/prosopo-io/substrate-contracts-node

WORKDIR /substrate-contracts-node

RUN . ~/.cargo/env && \
    cargo build --verbose --locked --release


FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get upgrade -y --only-upgrade libstdc++6

RUN apt-get install -y procps

RUN rm -rf /var/lib/apt/lists/*

COPY --from=builder /substrate-contracts-node/target/release/substrate-contracts-node /usr/local/bin

EXPOSE 30333 9933 9944 9615

USER root

CMD exec /bin/bash -c "substrate-contracts-node --dev -d ./chain-data --unsafe-ws-external --rpc-external --prometheus-external -lerror,runtime::contracts=debug"
