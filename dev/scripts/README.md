# Prosopo Dev Scripts Package

This package contains the scripts and configuration for setting up a development environment for Prosopo.

## Prerequisites

- A unix-style environment (Linux, MacOS, WSL2)
- [Docker](https://docs.docker.com/get-docker/)
- [Node.js](https://nodejs.org/en/download/)

## Dev Setup

### Quickstart

```bash
git clone https://github.com/prosopo/captcha
cd captcha
npm i
npm run build:all
docker compose --file docker/docker-compose.development.yml up -d
cp demos/client-example-server/env.development demos/client-example-server/.env.development
cp demos/client-example/env.development demos/client-example/.env.development
cp dev/scripts/env.development .env.development
cp dev/scripts/env.development dev/scripts/.env.development
cp dev/scripts/env.development packages/cli/.env.development
cp dev/scripts/env.development packages/procaptcha-bundle/.env.development
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

The development scripts package contains a CLI tool that can be used for various development tasks.

### Deploy Protocol Contract

From the root of the `captcha` workspace run:

```bash
npm run deploy_protocol
```

This is shorthand for the following command:

```bash
npm run -w @prosopo/scripts cli deploy_protocol --update_env
```

Specify the current working directory if you are running from a different location.

```bash
npm run -w @prosopo/scripts cli deploy_protocol --update_env --cwd $(pwd)
```

The default environment is `development`. To deploy to a different environment, set the `NODE_ENV` environment variable.

```bash
NODE_ENV=test npm run -w @prosopo/scripts cli deploy_protocol --update_env
```

### Create env files

TODO

### Setup the Protocol Contract

```bash
npm run setup
```

### Import Contracts using Typechain

```bash
...
```

### Import All Contracts

```bash
...
```

### Fund Dapps

Maintenance script to fund dapps in contract that are not `Active`.

```bash
npm run -w @prosopo/scripts -- cli fund_dapps
```

### Transfer Contract between networks

By default, the current `.env` setup will be used as the `--transfer-to` network.

```bash
Transfer dapps and providers from one contract to another

Options:
  --help                Show help                                      [boolean]
  --version             Show version number                            [boolean]
  --transfer-from       The name of the network and the contract address to tran
                        sfer from `{ network, address }`     [string] [required]
  --transfer-to         The name of the network and the contract address to tran
                        sfer to `{ network, address }`                  [string]
  --transfer-providers  Whether to transfer providers or not
                                           [boolean] [required] [default: false]
  --transfer-dapps      Whether to transfer dapps or not
                                           [boolean] [required] [default: false]
```

From the root of the workspace run:

```bash
npm run -w @prosopo/scripts -- cli transfer_contract --transfer-from '{"network":"rococo", "address":"..."}' --transfer-dapps=true --transfer-providers=true
```

### Display Version

From the root of the workspace run:

```bash
npm run -w @prosopo/scripts -- cli --version
```
