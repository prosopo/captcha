FROM debian:stable-slim

RUN apt-get update && apt install -y curl protobuf-compiler

RUN curl -sL https://github.com/paritytech/substrate-contracts-node/releases/download/v0.24.0/substrate-contracts-node-linux.tar.gz -o /root/substrate-contracts-node-linux.tar.gz

RUN tar -xvf /root/substrate-contracts-node-linux.tar.gz -C /root

RUN mv /root/artifacts/substrate-contracts-node-linux/substrate-contracts-node /usr/local/bin/

RUN rm /root/substrate-contracts-node-linux.tar.gz && rm -rf /root/artifacts

RUN apt autoremove -y && apt clean -y

EXPOSE 30333 9933 9944 9615

ENTRYPOINT /usr/local/bin/substrate-contracts-node --dev -d ./chain-data --unsafe-ws-external --rpc-external --prometheus-external -lerror,runtime::contracts=debug
