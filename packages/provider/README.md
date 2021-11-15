
## Prerequisites

- nodejs
- yarn
- `git clone https://github.com/paritytech/substrate-contracts-node`
- `git clone https://github.com/prosopo-io/protocol`

## Install packages

```bash
yarn
```
## Setup contract node
A specific version of the contract node is [required](https://stackoverflow.com/questions/69826769/how-can-i-query-contract-info-with-the-latest-polkadot-js-and-substrate-contract/69831057#69831057) to work with polkadotjs.
```
git clone https://github.com/paritytech/substrate &&
cd substrate &&
git checkout 8d91b8e578065a7c06433cbd41ac059bf478a0bd &&
cargo build && 
./target/debug/substrate-contracts-node --dev --tmp --version
```

## Deploy contract node

Go to the [protocol](https://github.com/prosopo-io/protocol) repository and run the `deploy` script after you have set the deployer in an `env` file

Generate a mnemonic and address:

`yarn mnemonic`

Put the deployer mnemonic and address in the `env` file.

```
DEPLOYER_MNEMONIC=... <-------here
DEPLOYER_ADDRESS=... <-------here
PROVIDER_MNEMONIC=...
PROVIDER_ADDRESS=...
CONTRACT_ADDRESS=...
```

Deploy the contract.

`yarn deploy`

Copy the contract address to your `env` file.

```
DEPLOYER_MNEMONIC=some very long set of words that equate to a mnemonic
DEPLOYER_ADDRESS=0x123456123456123456123456123456123456
PROVIDER_MNEMONIC=...
PROVIDER_ADDRESS=...
CONTRACT_ADDRESS=... <-------here
```

## Run the Provider server

Populate the `env` file with `PROVIDER_MNEMONIC` and `PROVIDER_ADDRESS`

Start the server in dev mode
`yarn dev`

Try using the API. Create a `POST` to register a `Provider`:

```
curl --location --request POST '127.0.0.1:3000/v1/prosopo/provider_update/' \
--header 'Content-Type: application/json' \
--data-raw '{
"fee": 1,
"serviceOrigin": "http://localhost:8282",
"payee": "Provider",
"address": "YOUR PROVIDER ADDRESS"
}'
```

Verify that your provider was registered.

```
curl --location --request GET '127.0.0.1:3000/v1/prosopo/providers/'
```