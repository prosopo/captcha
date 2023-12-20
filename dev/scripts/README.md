# Prosopo Dev Package

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
npm run bd dev
docker compose --file docker/docker-compose.development.yml up -d
cp ./dev/env.development ./dev/.env.development
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

Go to [http://localhost:3001](http://localhost:3001) in your browser.

### In-depth

#### Set up Containers

Setup your integration containers by running the following command from the root of
the [scripts](https://github.com/prosopo/scripts) repository.

```bash
docker compose --file ./docker/docker-compose.development.yml up -d
```

This does the following:

1. Pulls and starts a substrate node container containing pre-deployed [protocol](https://github.com/prosopo/protocol/)
2. Pulls and starts up a mongodb container.

##### Substrate Container Details

| Container Name                                                      | Description                                                                                   |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
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
npm run bd dev
```

#### Deploy contracts (Optional)

If you want to deploy your own protocol or dapp contract, you can do so by running the following command from the root
of the captcha workspace. Any .env files will be updated with the new contract addresses.

```bash
npm run deploy_protocol
npm run deploy_dapp
npm run setup
```

##### Env file

You must have a valid env file in `./packages/dev/` for these commands to work. You can use the
file `./packages/env.development` as a template.

#### Set up a Provider and Register a Dapp

Providers are the nodes in the network that supply CAPTCHA. Run the following command from the root of the captcha
workspace to register a Provider and a Dapp in the Protocol contract and start the Provider API.

```bash
npm run setup && npm run start
```

**Protocol** and **Dapp** contracts **must** exist on the substrate node for the setup script to run.

## Testing

### Run tests

Run all the tests using the following command from the root of the captcha workspace.

```bash
npm run test
```

### Workflow testing

The GitHub workflow runs the tests on an aura substrate node with 6s block times. A pre-deployed protocol contract is used
with the container prosopo/substrate:dev-aura-aadbbed50ede27817158c7517f13f6f61c9cf000. To test with this container, use
the docker compose file called `docker-compose.test.yml` in the scripts repository. Copy the template env.development
file to `.env.test` in the dev package so that the correct contract addresses are used.

```bash
docker compose --file ./docker/docker-compose.development.yml down
docker compose --file ./docker/docker-compose.test.yml up -d
cp dev/env.development dev/.env.test
NODE_ENV=test npm run test
```
