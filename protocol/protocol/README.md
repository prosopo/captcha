# Prosopo
![Coverage Badge](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/forgetso/4e3350c273f5173afc45b6ce74a97cb2/raw/protocol__heads_main.json)

Prosopo smart contract planning repository.

Created using Ink using the official [Substrate Contracts Workshop](https://substrate.dev/substrate-contracts-workshop).

## Prerequisits

Follow the [Substrate Contracts Workshop](https://substrate.dev/substrate-contracts-workshop) guide to install pre-requisits.

These are the steps for Ubuntu:
1. Install [Substrate dependancies](https://substrate.dev/docs/en/knowledgebase/getting-started)
2. Add Rust packages and dependancies)
```bash
rustup component add rust-src --toolchain nightly
rustup target add wasm32-unknown-unknown --toolchain nightly
```
3. Install the Canvas node
```bash
cargo install canvas-node --git https://github.com/paritytech/canvas-node.git --tag v0.1.8 --force --locked
```
4. Install Binaryen
```bash
wget https://github.com/WebAssembly/binaryen/releases/download/version_101/binaryen-version_101-x86_64-linux.tar.gz
tar -xvzf binaryen-version_101-x86_64-linux.tar.gz
sudo cp ./binaryen-version_101/bin/* /usr/bin
```
5. Install the Ink CLI
```bash
cargo install cargo-contract --vers ^0.12 --force --locked
```

## Build

```bash
cargo +nightly contract build
```

## Test

```bash
cargo +nightly test
```