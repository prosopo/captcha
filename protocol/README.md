# Prosopo Protocol

Prosopo Protocol smart contract repository.

Created with `ink!` and the official [Substrate Contracts Workshop](https://substrate.dev/substrate-contracts-workshop).

## Prerequisites

Follow the [Substrate Develop a smart contract guide](https://docs.substrate.io/tutorials/smart-contracts/develop-a-smart-contract/) guide to install pre-requisites.

These are the steps for Ubuntu:

1. Install [Substrate dependencies](https://substrate.dev/docs/en/knowledgebase/getting-started)

2. Add Rust packages and dependencies

```bash
rustup default stable
rustup update
rustup update nightly
rustup target add wasm32-unknown-unknown --toolchain nightly
```

3. Setup a contracts compatible node. For example, [install the Substrate Contracts Node](https://github.com/paritytech/substrate-contracts-node/#installation).

4. [Install cargo-contract](https://github.com/paritytech/cargo-contract#installation)

## Build

Note: Use the `--release` flag to minimise contract size if the contract is too large to put on-chain.

Build the contract from within the `contracts/<contract_name>` folder.

```bash

cargo +nightly contract build
```

## Test

Run the tests using the following command from within the `contracts/<contract_name>` folder.

```bash
cargo +nightly test --no-default-features --features std --verbose -- --nocapture
```

Install [tarpaulin](https://crates.io/crates/cargo-tarpaulin) if you wish to see code coverage.

```bash
cargo install cargo-tarpaulin
```

Run with the following command to see code coverage metrics.

```bash
cargo +nightly tarpaulin --no-default-features --features std --verbose -- --nocapture
```

## Deploy

The contract can be deployed from the command line using `cargo-contract`:

```bash
cargo contract instantiate $WASM --args "$ARGS_OWNER $ARGS_PROVIDER_STAKE_DEFAULT" --constructor $CONSTRUCTOR --suri $SURI --value $ENDOWMENT --url '$ENDPOINT:$PORT'
```

Example values for the variables are given below

```bash
PROSOPO_ENDPOINT=ws://0.0.0.0
PROSOPO_PORT=9944
PROSOPO_SURI=//Alice
PROSOPO_WASM=./target/ink/prosopo.wasm
PROSOPO_CONSTRUCTOR=default
PROSOPO_ARGS_OWNER=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY # Alice's account
PROSOPO_ARGS_PROVIDER_STAKE_DEFAULT=2000000000000
PROSOPO_ENDOWMENT=1000000000000
```

## Deploy to rococo with proxy
1. convert the author account (our shared account) from ss58 format to u8[]
2. set the env variables to that author
3. build captcha contract
4. deploy captcha contract on jsapps
5. get address of captcha contract from jsapps
6. convert from ss58 to u8[]
7. put that u8[] in the env variable for proxy destination
8. build the proxy contract
9. deploy proxy contract
10. voila
