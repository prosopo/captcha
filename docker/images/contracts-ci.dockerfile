FROM docker.io/library/debian:stable-slim

SHELL ["/bin/bash", "-c"]

ARG TOOLCHAIN_VERSION=1.77.0

RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    g++ \
    pkg-config \
    openssl \
    libssl-dev

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain ${TOOLCHAIN_VERSION} --profile minimal
RUN source ~/.cargo/env && \
    rustup target add wasm32-unknown-unknown
RUN source ~/.cargo/env && \
    rustup component add rust-src
RUN source ~/.cargo/env && \
    rustup component add clippy
RUN source ~/.cargo/env && \
    rustup component add rustfmt
RUN source ~/.cargo/env && \
    cargo install cargo-dylint dylint-link

ARG CARGO_CONTRACT_VERSION=4.1.1

RUN source ~/.cargo/env && \
    cargo install --force --locked --version ${CARGO_CONTRACT_VERSION} cargo-contract

RUN apt-get remove -y curl pkg-config openssl libssl-dev g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /src

ENV PATH="/root/.cargo/bin:${PATH}"

ENTRYPOINT ["bash", "-c"]
