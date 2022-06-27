FROM paritytech/contracts-ci-linux:latest as builder
RUN mkdir -p /usr/src/docker
COPY ./docker/contracts.deploy.dapp.sh /usr/src/docker/
COPY ./docker/contracts.deploy.contract.sh /usr/src/docker/
COPY ./dapp-example/contracts/ /usr/src/build/contracts
ENV SUBSTRATE_ENDPOINT=ws://substrate-node
ENV SUBSTRATE_PORT=9944
ENV DEPLOYER_SURI=//Alice
ENV DAPP_CONTRACT_SOURCE=/usr/src/dapp-example/contracts
ENV DAPP_CONTRACT_WASM=./target/ink/dapp.wasm
ENV DAPP_CONTRACT_CONSTRUCTOR=new
ENV DAPP_CONTRACT_ARGS_INITIAL_SUPPLY=1000000000000000000000
ENV DAPP_CONTRACT_ARGS_FAUCET_AMOUNT=1000000
ENV DAPP_CONTRACT_ARGS_HUMAN_THRESHOLD=80
ENV DAPP_CONTRACT_ARGS_RECENCY_THRESHOLD=180000
ENV DAPP_CONTRACT_ENDOWMENT=1000000000000
WORKDIR /usr/src/dapp/contracts
RUN echo $(ls -lah /usr/src/build/contracts)
WORKDIR /usr/src/build/contracts
#RUN cargo +nightly contract build
RUN /usr/local/rustup/toolchains/nightly-x86_64-unknown-linux-gnu/bin/cargo metadata --format-version 1 --manifest-path Cargo.toml
WORKDIR /usr/src
RUN chmod +x /usr/src/docker/contracts.deploy.dapp.sh
CMD ["bash", "/usr/src/docker/contracts.deploy.dapp.sh"]
