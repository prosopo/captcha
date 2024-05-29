# Prosopo Dev Scripts Package

This package contains the scripts and configuration for setting up a development environment for Prosopo.

## Prerequisites

-   A unix-style environment (Linux, MacOS, WSL2)
-   [Docker](https://docs.docker.com/get-docker/)
-   [Node.js](https://nodejs.org/en/download/)

## Dev Setup

### Quickstart

```bash
git clone https://github.com/prosopo/captcha
cd captcha
npm i
npm run build:all
docker compose --file docker/docker-compose.development.yml up -d
cp demos/client-example-server/env.development demos/client-example-server/.env.test
cp demos/client-example/env.development demos/client-example/.env.test
cp dev/scripts/env.test .env.test
cp dev/scripts/env.test dev/scripts/.env.test
cp dev/scripts/env.test packages/cli/.env.test
cp dev/scripts/env.test packages/procaptcha-bundle/.env.test
npm run setup:all
```

In different terminals run

#### Terminal 1

```bash
npm run start:server
```

#### Terminal 2

```bash
npm run start:provider
```

#### Terminal 3

```bash
npm run start:demo
```

Go to [http://localhost:9230](http://localhost:3001) in your browser.

### In-depth

#### Set up Containers

Setup your containers by running the following command from the root of
the [scripts](https://github.com/prosopo/scripts) repository.

```bash
docker compose --file ./docker/docker-compose.development.yml up -d
```

##### Substrate Container Details

| Container Name                                                      | Description                                                                                   |
|---------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| prosopo/substrate-contracts-node:v0.41.18dp                         | Substrate contracts node version 0.41.18dp with no contracts. 18 decimal places.              |
| prosopo/substrate-contracts-node:v0.35                              | Substrate contracts node version 0.35 with no contracts.                                      |
| prosopo/substrate:dev-aura-aadbbed50ede27817158c7517f13f6f61c9cf000 | Substrate node with pre-deployed protocol at commit aadbbed50ede27817158c7517f13f6f61c9cf000. |
| prosopo/substrate-contracts-node:v0.25                              | Substrate contracts node version 0.25 with no contracts.                                      |
| prosopo/substrate-contracts-node:v0.24                              | Substrate contracts node version 0.24 with no contracts.                                      |

#### Install node modules

Install the node modules by running the following command from the root of the captcha workspace.

```bash
npm i
```

#### Build all packages

Build all packages by running the following command from the root of the captcha workspace.

```bash
npm run build:all
```

#### Deploy contracts (Optional)

If you want to deploy the Procaptcha protocol contract, you can do so by running the following command from the root
of the captcha workspace. Any .env files will be updated with the new contract addresses.

```bash
npm run deploy_protocol
npm run setup
```

Alternatively, run `npm setup:all` to run both of the above commands.

##### Env file

You must have a valid env file in `./dev/scripts/` for these commands to work. You can use the
file `./dev/scripts/env.development` as a template.

#### Set up a Provider and Register a Dapp

Providers are the nodes in the network that supply CAPTCHA. Run the following command from the root of the captcha
workspace to register a Provider and a Dapp in the Protocol contract and start the Provider API.

```bash
npm run setup && npm run start:provider
```

The **Protocol**  contract **must** exist on the substrate node for the setup script to run.

## Testing

### Run tests

Run all the tests using the following command from the root of the captcha workspace.

```bash
npm run test
```

## CLI

### Transfer Contract between networks

```bash
NODE_ENV=production npm run -w @prosopo/scripts -- cli transfer_contract --transfer-from '{"network":"rococo", "address":"..."}' --transfer-dapps=true --transfer-providers=true
```
