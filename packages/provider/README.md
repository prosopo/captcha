
## Prerequisites

- nodejs
- yarn
- choose a Substrate node of your choice (e.g. contracts node)
- `git clone https://github.com/prosopo-io/protocol`
- `git clone https://github.com/prosopo-io/redspot`

A reasonable folder structure would be something like the following:
```
- redspot
- substrate
- protocol
- provider
```

## Install packages

```bash
yarn
```
## Setup contract node
```bash
cd substrate &&
cargo run --release -- --dev --tmp -lerror,runtime::contracts=debug
```

## Deploy contract node

Go to the [protocol](https://github.com/prosopo-io/protocol) repository and run the `deploy` script after you have set the deployer in an `env` file

Generate a mnemonic and address:

`yarn mnemonic`

*NOTE - you can use the development mnemonics instead of generating a new mnemonic*
- `bottom drive obey lake curtain smoke basket hold race lonely fit walk//Alice`
- `bottom drive obey lake curtain smoke basket hold race lonely fit walk//Bob`
- `bottom drive obey lake curtain smoke basket hold race lonely fit walk//Charlie`
- `bottom drive obey lake curtain smoke basket hold race lonely fit walk//Dave`
- `bottom drive obey lake curtain smoke basket hold race lonely fit walk//Ferdie`
- `bottom drive obey lake curtain smoke basket hold race lonely fit walk//Eve`

Put the deployer mnemonic in the `env` file.

```bash
DEPLOYER_MNEMONIC=... <-------here
PROVIDER_MNEMONIC=...
PROVIDER_ADDRESS=...
CONTRACT_ADDRESS=...
```

Deploy the contract.

`yarn deploy`

Copy the contract address to your `env` file.

```bash
DEPLOYER_MNEMONIC=some very long set of words that equate to a mnemonic
PROVIDER_MNEMONIC=...
PROVIDER_ADDRESS=...
CONTRACT_ADDRESS=... <-------here
```

## Symlink your Protcol artifacts

Inside your `provider` folder run the following command.
```bash
ln -s ../protocol/artifacts artifacts
```

## Run the Provider server

Populate the `env` file with `PROVIDER_MNEMONIC` and `PROVIDER_ADDRESS`. You can the register a provider either via the API or on the command line.

### Option 1. Register using the API

Start the server in dev mode with the API enabled
`yarn dev --api`

Try using the API. Create a `POST` to register a `Provider`:

Paste this into a [Postman](https://www.postman.com/downloads/) request or use curl on the command line.
```bash
curl --location --request POST '127.0.0.1:3000/v1/prosopo/provider_update/' \
--header 'Content-Type: application/json' \
--data-raw '{
"fee": 1,
"serviceOrigin": "http://localhost:8282",
"payee": "Provider",
"address": "YOUR PROVIDER ADDRESS"
}'
```

### Option 2. Register using the Command Line

Try registering a provider on the command line.

```bash
yarn dev provider_register \
--fee 10 \
--serviceOrigin https://localhost:8282 \
--payee Provider \
--address YOUR_PROVIDER_ADDRESS
````

Try staking on the command line.

```bash
yarn build \ 
&& yarn ts-node ./build/src/cli.js provider_stake \
--value 10 \
--address YOUR_PROVIDER_ADDRESS
```

Verify that your provider was registered by calling the `providers` endpoint or by checking in Polkadot Apps local node.

### Curl 
```
curl --location --request GET '127.0.0.1:3000/v1/prosopo/providers/'
["YOUR PROVIDER ADDRESS"]
```

### Polkadot Apps
Using [Polkadot apps](https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/contracts)

1. Click Add an existing contract
2. Enter the contract address and click to select the `prosopo.json` file in the artifacts folder as the `contract ABI`
3. Expand the contract to see the current value of `getProviders`. It should be `["YOUR PROVIDER ADDRESS"]`.
