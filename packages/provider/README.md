# Prosopo Provider

> NOTE: The easiest way to deploy the Prosopo contract and run the Provider node is via the [integration repository](https://github.com/prosopo-io/integration/). The following instructions explain how to set up the repositories manually.

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

### Setup contract node

These instructions will depend on the substrate node you choose. The following command is for https://github.com/paritytech/substrate

```bash
cd substrate &&
cargo run --release -- --dev --tmp -lerror,runtime::contracts=debug
```

### Deploy the contract

Once your substrate node is running, go to the [protocol](https://github.com/prosopo-io/protocol) repository and run the `deploy` script. The contract will be deployed by the `Alice` test account. Make sure to note the contract address.

```bash
yarn deploy
```

## Running the Provider Node

The following instructions apply to the `provider` repo.

### Install packages

```bash
yarn
```

### Populate the contract address and the deployer address

Put the contract address, and the deployer address in the `prosopo.config.ts` file in the root of the `provider` repo, either directly or as environment variables.

#### Env variables
```javascript
            contract: {
                address: process.env.CONTRACT_ADDRESS,
                deployer: {
                    address: process.env.DEPLOYER_ADDRESS
                }
            }
```

#### Directly in the config
```javascript
            contract: {
                address: 'the contract address',
                deployer: {
                    address: '//Alice'
                }
            }
```

### Symlink your Protcol artifacts

Assuming the `protocol` folder is next to the `provider` folder, inside your `provider` folder run the following command. Otherwise, adjust the command as necessary.
```bash
ln -s ../protocol/artifacts artifacts
```

This will make your contract artefacts available to the provider project.

## Run the Provider server

### Set a provider mnemonic in redspot.config.ts

> Please note your `PROVIDER_MNEMONIC` environment variable must be set. You can check this with `echo $PROVIDER_MNEMONIC`

It's easiest to use a development mnemonic as they already have funds. So choose one of //Alice, //Bob, //Ferdie, etc. and then set it using

```bash
    export PROVIDER_MNEMONIC=//Ferdie
```

You can now register a provider either via the API or on the command line.

### Register using the Command Line

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
{"accounts":["YOUR PROVIDER ADDRESS"]}
```

### Polkadot Apps
Using [Polkadot apps](https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/contracts)

1. Click Add an existing contract
2. Enter the contract address and click to select the `prosopo.json` file in the artifacts folder as the `contract ABI`
3. Expand the contract to see the current value of `getProviders`. It should be `["YOUR PROVIDER ADDRESS"]`.


## Command Line Interface

> Please note your `PROVIDER_MNEMONIC` environment variable must be set. You can check this with `echo $PROVIDER_MNEMONIC`

### Register a provider

```bash
yarn start provider_register --fee=10 --serviceOrigin=https://localhost:8282 --payee=Provider --address ADDRESS
```

| Param | Description |
| --------------- | --------------- |
| fee | The amount the Provider charges or pays per captcha approval / disapproval |
| serviceOrigin | The location of the Provider's service |
| payee | Who is paid on successful captcha completion (`Provider` or `Dapp`) |
| address | Address of the Provider |

### Update a provider and optionally stake

```bash
yarn start provider_update --fee=10 --serviceOrigin=https://localhost:8282 --payee=Provider --address ADDRESS --value STAKE_VALUE
```

Params are the same as `provider_register` with the addition of `value`

| Param | Description |
| --------------- | --------------- |
| value | The amount of funds to stake in the contract |


### Add a dataset for a Provider

```bash
yarn start provider_add_data_set --file /usr/src/data/captchas.json
```

| Param | Description |
| --------------- | --------------- |
| file | JSON file containing captchas |

File format can be viewed [here](https://github.com/prosopo-io/provider/blob/master/tests/mocks/data/captchas.json).

### De-register a Provider

```bash
yarn start provider_deregister --address ADDRESS
```

| Param | Description |
| --------------- | --------------- |
| address | Address of the Provider |

### Unstake funds

```bash
yarn start provider_unstake --value VALUE
```

| Param | Description |
| --------------- | --------------- |
| value | The amount of funds to unstake from the contract |

### List Provider accounts in contract

```bash
yarn start provider_accounts
```

### Other commands ###

A full list of CLI commands can be viewed by running

```bash
yarn start --help
```

## API

Run the API server

```bash
yarn start --api
```

The API contains functions that will be required for the frontend captcha interface.

| API Resource | Function |
| --------------- | --------------- |
| `/v1/prosopo/random_provider/`| Get a random provider based on AccountId |
| `/v1/prosopo/providers/` | Get list of all provider IDs |
| `/v1/prosopo/dapps/` | Get list of all dapp IDs |
| `/v1/prosopo/provider/:providerAccount` | Get details of a specific Provider account |
| `/v1/prosopo/provider/captcha/:datasetId/:userAccount` | Get captchas to solve |
| `/v1/prosopo/provider/solution` | Submit captcha solutions |

## Tests

> Please note your `PROVIDER_MNEMONIC` environment variable must be set for the tests to run. You can check this with `echo $PROVIDER_MNEMONIC`
> Please note that running the tests causes many redspot warnings like  `WARN  Unable to find handler for subscription=state_storage::QaxXtKvT2LYdhf3D`. These can be ignored.

The tests are located in the [tests folder](https://github.com/prosopo-io/provider/tree/master/tests) and the structure mimics that of the main `src`. You can run the tests using the following command:

```bash
yarn test
```

To run the tests with coverage stats use:

```bash
yarn c8 yarn test
```

The tests use a mocked database engine however they connect to the **real** contract. You will need to deploy the contract and make the address available in an env variable called `CONTRACT_ADDRESS`. The easiest way to deploy the Prosopo contract and run the tests is via the [integration repository](https://github.com/prosopo-io/integration/).

Current test coverage is 90.9% of functions.
