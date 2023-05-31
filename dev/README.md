## Dev Setup

### Set up Containers

Setup your integration containers by running the following command from the root of
the [scripts](https://github.com/prosopo/scripts) repository.

```bash
docker compose --file ./docker/docker-compose.development.yml up -d
```

This does the following:

1. Pulls and starts a substrate node container containing pre-deployed [protocol](https://github.com/prosopo/protocol/)
2. Pulls and starts up a mongodb container.

#### Substrate Container Details

| Container Name                                                      | Description                                                                                   |
|---------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| prosopo/substrate:dev-aura-aadbbed50ede27817158c7517f13f6f61c9cf000 | Substrate node with pre-deployed protocol at commit aadbbed50ede27817158c7517f13f6f61c9cf000. |
| prosopo/substrate-contracts-node:v0.25                              | Substrate contracts node version 0.25 with no contracts.                                      |
| prosopo/substrate-contracts-node:v0.24                              | Substrate contracts node version 0.24 with no contracts.                                      |

### Install node modules

Install the node modules by running the following command from the root of the captcha workspace.

```bash
npm i
```

### Build all packages

Build all packages by running the following command from the root of the captcha workspace.

```bash
npm run bd dev
```

### Deploy contracts (Optional)

If you want to deploy your own protocol or dapp contract, you can do so by running the following command from the root
of the captcha workspace. Any .env files will be updated with the new contract addresses.

```bash
npm run deploy_protocol
npm run deploy_dapp
npm run setup
```

#### Env file

You must have a valid env file in `./packages/dev/` for these commands to work. You can use the
file `./packages/env.development` as a template.

### Set up a Provider and Register a Dapp

Providers are the nodes in the network that supply CAPTCHA. Run the following command from the root of the captcha
workspace to register a Provider and a Dapp in the Protocol contract and start the Provider API.

```bash
npm run setup && npm run start
```

**Protocol** and **Dapp** contracts **must** exist on the substrate node for the setup script to run.
