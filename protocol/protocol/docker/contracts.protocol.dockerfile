FROM paritytech/contracts-ci-linux:latest as builder
RUN mkdir -p /usr/src/docker
COPY ./docker/contracts.deploy.protocol.sh /usr/src/docker/
COPY ./docker/contracts.deploy.contract.sh /usr/src/docker/
COPY ./protocol/contracts/ /usr/src/build/contracts
COPY ./protocol/crates/ /usr/src/build/crates
ENV SUBSTRATE_ENDPOINT=ws://substrate-node
ENV SUBSTRATE_PORT=9944
ENV DEPLOYER_SURI=//Alice
ENV PROTOCOL_CONTRACT_SOURCE=/usr/src/protocol/contracts
ENV PROTOCOL_CONTRACT_WASM=./target/ink/prosopo.wasm
ENV PROTOCOL_CONTRACT_CONSTRUCTOR=default
ENV PROTOCOL_CONTRACT_ARGS_OWNER=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
ENV PROTOCOL_CONTRACT_ARGS_PROVIDER_STAKE_DEFAULT=2000000000000
ENV PROTOCOL_CONTRACT_ENDOWMENT=1000000000000
WORKDIR /usr/src/protocol/contracts
RUN echo $(ls -lah /usr/src/build/contracts)
WORKDIR /usr/src/build/contracts
RUN /usr/local/rustup/toolchains/nightly-x86_64-unknown-linux-gnu/bin/cargo metadata --format-version 1 --manifest-path Cargo.toml
#RUN cargo +nightly contract build
WORKDIR /usr/src
RUN chmod +x /usr/src/docker/contracts.deploy.protocol.sh
CMD ["bash", "/usr/src/docker/contracts.deploy.protocol.sh"]
