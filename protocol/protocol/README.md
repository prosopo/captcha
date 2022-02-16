# Prosopo Protocol

Prosopo Protocol smart contract repository.

Created using Ink using the official [Substrate Contracts Workshop](https://substrate.dev/substrate-contracts-workshop).

## Prerequisites

Follow the [Substrate Contracts Workshop](https://substrate.dev/substrate-contracts-workshop) guide to install pre-requisits.

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

## Test

There are two sets of unit tests. Some use the standard test engine but most use the experimental engine. You can run the tests using the following commmands from within the `contracts` folder.

```bash
cargo +nightly tarpaulin --no-default-features --features std --verbose -- --nocapture
cargo +nightly tarpaulin --no-default-features --features std,ink-experimental-engine --verbose -- --nocapture
```

## Deploy

The protocol repository is implemented as a [redspot](https://github.com/patractlabs/redspot) project. You can install dependencies and then run a script to deploy the contract.

```bash
yarn && yarn deploy
```