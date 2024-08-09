FROM debian:stable-slim

# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends curl protobuf-compiler && rm -rf /var/lib/apt/lists/* && \
    curl -sL https://github.com/paritytech/substrate-contracts-node/releases/download/v0.24.0/substrate-contracts-node-linux.tar.gz -o /root/substrate-contracts-node-linux.tar.gz && \
    tar -xvf /root/substrate-contracts-node-linux.tar.gz -C /root && \
    mv /root/artifacts/substrate-contracts-node-linux/substrate-contracts-node /usr/local/bin/ && \
    rm /root/substrate-contracts-node-linux.tar.gz && rm -rf /root/artifacts && \
    apt-get autoremove -y && apt-get clean -y

EXPOSE 30333 9933 9944 9615

ENTRYPOINT ["/usr/local/bin/substrate-contracts-node", "--dev", "-d", "./chain-data", "--unsafe-ws-external", "--rpc-external", "--prometheus-external", "-lerror,runtime::contracts=debug"]
