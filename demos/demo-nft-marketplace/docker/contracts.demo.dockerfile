ARG BASE=paritytech
ARG TAG=latest

FROM ${BASE}/contracts-ci-linux:${TAG} as builder
RUN mkdir -p /usr/src/docker
COPY ./docker/contracts.deploy.demo.sh /usr/src/docker/
COPY ./docker/contracts.deploy.contract.sh /usr/src/docker/
COPY ./demos/demo-nft-marketplace/contracts/ /usr/src/build/contracts
ENV SUBSTRATE_ENDPOINT=ws://substrate-node
ENV SUBSTRATE_PORT=9944
ENV DEPLOYER_SURI=//Alice
ENV DEMO_CONTRACT_SOURCE=/usr/src/demos/demo-nft-marketplace/contracts
ENV DEMO_CONTRACT_WASM=./target/ink/demo_nft_contract.wasm
ENV DEMO_CONTRACT_CONSTRUCTOR=new
ENV DEMO_CONTRACT_ARGS_OWNER=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
ENV DEMO_CONTRACT_ENDOWMENT=0
WORKDIR /usr/src/demos/demo-nft-marketplace/contracts
RUN echo $(ls -lah /usr/src/build/contracts)
WORKDIR /usr/src/build/contracts
ARG ARCHITECTURE=x86_64
RUN /usr/local/rustup/toolchains/nightly-${ARCHITECTURE}-unknown-linux-gnu/bin/cargo metadata --format-version 1 --manifest-path Cargo.toml
#RUN cargo +nightly contract build
WORKDIR /usr/src
RUN chmod +x /usr/src/docker/contracts.deploy.demo.sh
CMD ["bash", "/usr/src/docker/contracts.deploy.demo.sh"]
