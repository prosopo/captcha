# Dapp Example

This repository demonstrates how to call the Prosopo [Protocol](https://github.com/prosopo-io/protocol) contract from within a second contract.

> NOTE: The easiest way to deploy the Prosopo contract and Dapp-example contract is via the [integration repository](https://github.com/prosopo-io/integration/). The following instructions explain how to deploy the dapp-example manually.

## Prerequisites

### Deploy the Prosopo contract

Follow instructions in Prosopo [Protocol](https://github.com/prosopo-io/protocol)

### Install Prerequisites

Follow the [Substrate Contracts Workshop](https://substrate.dev/substrate-contracts-workshop) guide to install pre-requisites.

These are the steps for Ubuntu:
1. Install [Substrate dependancies](https://substrate.dev/docs/en/knowledgebase/getting-started)
2. Add Rust packages and dependancies)
```bash
rustup component add rust-src --toolchain nightly
rustup target add wasm32-unknown-unknown --toolchain nightly
```
3. Setup contract node
   A specific version of the contract node is [required](https://stackoverflow.com/questions/69826769/how-can-i-query-contract-info-with-the-latest-polkadot-js-and-substrate-contract/69831057#69831057) to work with polkadotjs.
```
git clone https://github.com/paritytech/substrate-contracts-node &&
cd substrate-contracts-node &&
git checkout 8d91b8e578065a7c06433cbd41ac059bf478a0bd &&
cargo build && 
./target/debug/substrate-contracts-node --dev --tmp --version
```

4. Install Binaryen
```bash
wget https://github.com/WebAssembly/binaryen/releases/download/version_101/binaryen-version_101-x86_64-linux.tar.gz
tar -xvzf binaryen-version_101-x86_64-linux.tar.gz
sudo cp ./binaryen-version_101/bin/* /usr/bin
```
5. Install the Ink CLI
```bash
cargo install cargo-contract --vers ^0.16 --force --locked
```

## Build

Note: Use the `--release` flag to minimise contract size if the contract is too large to put on-chain.

```bash
cargo +nightly contract build
```

## Deploy

The dapp-example repository is implemented as a [redspot](https://github.com/patractlabs/redspot) project. You can install dependencies and then run a script to deploy the contract.

```bash
yarn && yarn deploy
```