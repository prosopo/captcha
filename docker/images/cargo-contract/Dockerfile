FROM docker.io/library/debian:stable-slim

SHELL ["/bin/bash", "-c"]

# The version of the toolchain to install
ARG TOOLCHAIN_VERSION=1.77.0

RUN apt-get update && apt-get install -y \
    # required for downloading the setup script for rust
    curl \
    # all deps for building cargo-contract
    gcc \
    g++ \
    pkg-config \
    openssl \
    libssl-dev

# Set rustup and cargo home dirs
ENV RUSTUP_HOME=/usr/local/rustup
ENV CARGO_HOME=/usr/local/cargo

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain ${TOOLCHAIN_VERSION} --profile minimal

# Add cargo to the PATH
ENV PATH=$PATH:$CARGO_HOME/bin:$RUSTUP_HOME

# Install wasm32 target
RUN rustup target add wasm32-unknown-unknown
# Install clippy and rustfmt
RUN rustup component add rust-src
RUN rustup component add clippy
RUN rustup component add rustfmt

# Install cargo-contract deps
RUN cargo install cargo-dylint dylint-link

# The version of cargo-contract to install
ARG CARGO_CONTRACT_VERSION=4.1.1

# Install cargo-contract
RUN cargo install --force --locked --version ${CARGO_CONTRACT_VERSION} cargo-contract

# Cleanup deps for installing cargo-contract (almost everything except gcc, that's needed for contract compilation)
RUN apt-get remove -y curl pkg-config openssl libssl-dev g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# set permissions for the cargo-contract binary. This allows the user which invokes the container to read/write/exe to these dirs
RUN chmod -R a+wrx ${CARGO_HOME}
RUN chmod -R a+wrx ${RUSTUP_HOME}

# Add the main script
COPY main.sh /main.sh
RUN chmod +x /main.sh

# Set the entrypoint
ENTRYPOINT ["bash", "/main.sh"]
