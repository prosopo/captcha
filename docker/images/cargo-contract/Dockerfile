FROM docker.io/library/debian:stable-slim

# set shell to bash and error on any failure, unset variables, and pipefail
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

# The version of the toolchain to install
ARG TOOLCHAIN_VERSION=1.77.0

# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends \
    # required for downloading the setup script for rust
    curl \
    # all deps for building cargo-contract
    gcc \
    g++ \
    pkg-config \
    openssl \
    libssl-dev && \
    rm -rf /var/lib/apt/lists/*

# Set rustup and cargo home dirs
ENV RUSTUP_HOME=/usr/local/rustup
ENV CARGO_HOME=/usr/local/cargo

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain ${TOOLCHAIN_VERSION} --profile minimal

# Add cargo to the PATH
ENV PATH=$PATH:$CARGO_HOME/bin:$RUSTUP_HOME

# The version of cargo-contract to install
ARG CARGO_CONTRACT_VERSION=4.1.1

ARG CARGO_CACHE=/cargo-cache

# Add the main script
COPY main.sh /main.sh

# Install wasm32 target
RUN rustup target add wasm32-unknown-unknown && \
    # Install clippy and rustfmt
    rustup component add rust-src && \
    rustup component add clippy && \
    rustup component add rustfmt && \
    # Install cargo-contract deps
    cargo install cargo-dylint dylint-link && \
    # Install cargo-contract
    cargo install --force --locked --version ${CARGO_CONTRACT_VERSION} cargo-contract && \
    # Cleanup deps for installing cargo-contract (almost everything except gcc, that's needed for contract compilation)
    apt-get remove --auto-remove -y curl pkg-config openssl libssl-dev g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    # Create cache dirs for cargo
    mkdir ${CARGO_CACHE} && \
    rm -rf ${CARGO_HOME}/registry && \
    rm -rf ${CARGO_HOME}/git && \
    ln -s ${CARGO_CACHE}/registry ${CARGO_HOME}/registry && \
    ln -s ${CARGO_CACHE}/git ${CARGO_HOME}/git && \
    # set permissions for the cargo-contract binary. This allows the user which invokes the container to read/write/exe to these dirs
    chmod -R a+wrx ${CARGO_HOME} && \
    chmod -R a+wrx ${RUSTUP_HOME} && \
    chmod -R a+wrx ${CARGO_CACHE} && \
    chmod +x /main.sh

# Set the entrypoint
ENTRYPOINT ["bash", "/main.sh"]
