# Prosopo Provider

> NOTE: For a development environment, the easiest way to deploy the Prosopo contract and run the Provider node is via the [integration repository](https://github.com/prosopo/integration/). The following instructions explain how to set up the repositories manually.

## Prerequisites

- nodejs
- npm
- A connection to a substrate node
- A deployed Prosopo Protocol contract

### Development Environment

#### Setup a contract node

If you are setting up a development environment, run a development node. For example, the [Substrate Contracts Node](https://github.com/paritytech/substrate-contracts-node/#installation)

#### Deploy the Prosopo Protocol contract

See [protocol instructions](https://github.com/prosopo/protocol/#prosopo-protocol)

#### Live environment

If you are running in a test or live environment, use a node endpoint of your choice. Make sure you know the contract account of the Prosopo Protocol contract.

## Running a Prosopo Provider Node

The following instructions apply to the `provider` repo.

### Install packages

```bash
npm install
```

### Populate the Prosopo Provider Config

Place the required variables in the `prosopo.config.ts` file in the root of the `provider` repo.

| Param                                    | Description                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| PROTOCOL_CONTRACT_JSON_ABI_PATH          | The path to the protocol JSON file                                             |
| SUBSTATE_NODE_ENDPOINT                   | The substrate node endpoint, e.g. ws://localhost:9944                          |
| PROTOCOL_CONTRACT_ADDRESS                | The protocol contract address                                                  |
| CAPTCHA_SOLVED_COUNT                     | The number of solved captchas to send to the captcha frontend client           |
| CAPTCHA_UNSOLVED_COUNT                   | The number of unsolved captchas to send to the captcha frontend client         |
| CAPTCHA_SOLUTION_REQUIRED_SOLUTION_COUNT | The number of captchas required to calculate a solution to an unsolved captcha |
| CAPTCHA_SOLUTION_WINNING_PERCENTAGE      | The threshold percentage that determines whether a solution is found           |
| CAPTCHA_FILE_PATH                        | The path to the captcha dataset                                                |
| MONGO_USERNAME                           | MongoDB username                                                               |
| MONGO_PASSWORD                           | MongoDB password                                                               |
| MONGO_HOST                               | MongoDB host                                                                   |
| MONGO_PORT                               | MongoDB port                                                                   |
| DATABASE_NAME                            | Database name                                                                  |
| API_BASE_URL                             | Base URL for API, e.g. <http://localhost:9229>                                   |

#### Config

```typescript
const config = {
    contract: {
        abi: '<PROTOCOL_CONTRACT_JSON_ABI_PATH>',
    },
    networks: {
        development: {
            endpoint: '<SUBSTATE_NODE_ENDPOINT>', // e.g. ws://127.0.0.1:9944
            contract: {
                address: '<PROTOCOL_CONTRACT_ADDRESS>',
                name: 'prosopo',
            },
        },
    },
    captchas: {
        solved: {
            count: '<CAPTCHA_SOLVED_COUNT>',
        },
        unsolved: {
            count: '<CAPTCHA_UNSOLVED_COUNT>',
        },
    },
    captchaSolutions: {
        requiredNumberOfSolutions: '<CAPTCHA_SOLUTION_REQUIRED_SOLUTION_COUNT>',
        solutionWinningPercentage: '<CAPTCHA_SOLUTION_WINNING_PERCENTAGE>',
        captchaFilePath: '<CAPTCHA_FILE_PATH>',
    },
    database: {
        development: {
            storageType: 'mongo',
            endpoint: `mongodb://<MONGO_USERNAME>:<MONGO_PASSWORD>@<MONGO_HOST>:<MONGO_PORT>`,
            dbname: '<DATABASE_NAME>',
        },
    },
    assets: {
        absolutePath: '',
        basePath: '',
    },
    server: {
        baseURL: '<API_BASE_URL>',
    },
}
```

## Run the Provider server

### Set a provider mnemonic in prosopo.config.js

> Please note your `PROVIDER_MNEMONIC` environment variable must be set. You can check this with `echo $PROVIDER_MNEMONIC`

In a **development environment**, it's easiest to use a development mnemonic as they already have funds. So choose one of //Alice, //Bob, //Ferdie, etc.

```bash
    export PROVIDER_MNEMONIC=//Ferdie
```

You can now register as a Provider in the protocol contract either via the command line.

### Register using the Command Line

Try registering a provider on the command line.

```bash
npm run cli provider_register -- \
--fee 10 \
--origin https://localhost:9229 \
--payee Provider \
--address YOUR_PROVIDER_ADDRESS
```

Send a stake (`value`) and/or update one of the values previously set when registering (`fee`, `origin`. `payee`).

```bash
npm run cli provider_update -- \
--fee 10 \
--origin https://localhost:9229 \
--payee Provider \
--address YOUR_PROVIDER_ADDRESS \
--value 10
```

Verify that your provider was registered by calling the `/v1/prosopo/providers/` endpoint or by checking in Polkadot Apps local node.

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
npm run cli -- provider_register --fee=10 --origin=https://localhost:9229 --payee=Provider --address ADDRESS
```

| Param   | Description                                                                |
| ------- | -------------------------------------------------------------------------- |
| fee     | The amount the Provider charges or pays per captcha approval / disapproval |
| origin  | The location of the Provider's service                                     |
| payee   | Who is paid on successful captcha completion (`Provider` or `Dapp`)        |
| address | Address of the Provider                                                    |

### Update a provider and optionally stake

```bash
npm run cli -- provider_update --fee=10 --origin=https://localhost:9229 --payee=Provider --address ADDRESS --value STAKE_VALUE
```

Params are the same as `provider_register` with the addition of `value`

| Param | Description                                  |
| ----- | -------------------------------------------- |
| value | The amount of funds to stake in the contract |

### Add a dataset for a Provider

```bash
npm run cli -- provider_add_data_set --file /usr/src/data/captchas.json
```

| Param | Description                   |
| ----- | ----------------------------- |
| file  | JSON file containing captchas |

File format can be viewed [here](https://github.com/prosopo/provider/blob/master/tests/mocks/data/captchas.json).

### De-register a Provider

```bash
npm run cli -- provider_deregister --address ADDRESS
```

| Param   | Description             |
| ------- | ----------------------- |
| address | Address of the Provider |

### Unstake funds

```bash
npm run cli -- provider_unstake --value VALUE
```

| Param | Description                                      |
| ----- | ------------------------------------------------ |
| value | The amount of funds to unstake from the contract |

### List Provider accounts in contract

```bash
npm run cli -- provider_accounts
```

### Other commands

A full list of CLI commands can be viewed by running

```bash
npm run cli -- --help
```

## API

Run the Provider API server and image server

```bash
npm run start
```

The API contains methods required by the frontend captcha interface.

| API Resource                                                                             | Function                                   | Type | Parameters                                                         |
| ---------------------------------------------------------------------------------------- | ------------------------------------------ | ---- | ------------------------------------------------------------------ |
| `/v1/prosopo/random_provider/:userAccount/:dappContractAccount`                          | Get a random provider based on AccountId   | GET  | userAccount, dappContractAccount                                   |
| `/v1/prosopo/providers/`                                                                 | Get list of all provider IDs               | GET  |                                                                    |
| `/v1/prosopo/dapps/`                                                                     | Get list of all dapp IDs                   | GET  |                                                                    |
| `/v1/prosopo/provider/:providerAccount`                                                  | Get details of a specific Provider account | GET  | providerAccount                                                    |
| `/v1/prosopo/provider/captcha/:datasetId/:userAccount/:dappContractAccount/:blockNumber` | Get captchas to solve                      | GET  | datasetId, userAccount, dappContractAccount, blockNumber           |
| `/v1/prosopo/provider/solution`                                                          | Submit captcha solutions                   | POST | userAccount, dappAccount, requestHash, captchas, blockHash, txHash |

## Tests

You can run the Provider integration tests using the command `npm run test`. This will start a substrate container containing a predeployed [prosopo protocol contract](https://github.com/prosopo/protocol/#prosopo-protocol) and [dapp-example contract](https://github.com/prosopo/dapp-example#dapp-example). An in-memory mongo database will be used.

To run the tests with coverage stats use:

```bash
npx c8 npm run test
```
