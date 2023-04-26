# Captcha
Prosopo captcha protection for verifying human users on web applications.

# TODO the below instructions are out of date

- [provider](https://github.com/prosopo/provider)
- [contract](https://github.com/prosopo/contract)
- [procaptcha](https://github.com/prosopo/procaptcha)
- [procaptcha-react](https://github.com/prosopo/procaptcha-react)
- [client-example](https://github.com/prosopo/client-example)
- [demo-nft-marketplace](https://github.com/prosopo/demo-nft-marketplace)

# Prerequisites
- ability to run bash scripts
- docker (tested on v20.10.8 / v20.10.11/ v20.10.14, used 4CPUs, 6GB of memory, 2GB of swap)
- [docker compose v2+](https://www.docker.com/blog/announcing-compose-v2-general-availability/)
- [script repository](https://github.com/prosopo/scripts) cloned locally 

# Usage

```bash
git clone git@github.com:prosopo/workspaces.git
````

## Development Environment Set Up

The following instructions explain how to set up a developer environment in which changes can be made to the various JavaScript packages.


### Pull Submodules

Start by pulling submodules. Run the following command from the root of the integration repository.

```bash
git submodule update --init --recursive --force --checkout
```

### Set up Containers

Setup your integration containers by running the following command from the root of the [scripts](https://github.com/prosopo/scripts) repository.

```bash
docker compose --file ./docker/docker-compose.development.yml up -d
```

This does the following:

1. Pulls and starts a substrate node container containing pre-deployed [protocol](https://github.com/prosopo/protocol/), [dapp-example](https://github.com/prosopo/dapp-example), and [demo-nft-marketplace](https://github.com/prosopo/demo-nft-marketplace) contracts.
2. Pulls and starts up a mongodb container.

### Install node modules

Install the node modules and build the workspace by running the following command from the root of the integration repository.

```bash
npm i && npm run build
```

### Set up a Provider

Providers are the nodes in the network that supply CATPCHA. Run the following command from the root of the integration repository to register a Provider and a Dapp in the Protocol contract and start the Provider API.

```bash
npm run setup && npm run start
```

You can simply run `npm run start` on subsequent runs.

#### Command Details
| Command         | Description                                                |
|-----------------|------------------------------------------------------------|
| `npm run setup` | Registers the Provider and a Dapp in the Protocol contract |
| `npm run start` | Starts the provider API                                    |

### Debugging and Testing a Frontend App

You can now start one of the frontend demos to begin receiving CAPTCHA challenges in the browser. See the READMEs in each of the demos for information on how to run them.

- [demo-nft-marketplace](https://github.com/prosopo/demo-nft-marketplace) (full marketplace)
- [client-example](https://github.com/prosopo/client-example) (minimal implementation)


### Running Tests

Stop your development environment, if it is running.

```bash
docker compose --file docker-compose.development.yml down
```

Set up the test environment and run the tests by running the following command from the root of the integration repository.

```bash
npm run test
```

This will create a test docker environment, register a test Provider, and create a test `env` file before running the tests in [provider](https://github.com/prosopo/provider).
