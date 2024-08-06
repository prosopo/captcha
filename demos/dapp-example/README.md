# Dapp Example

This repository demonstrates how to call the Prosopo [Protocol](https://github.com/prosopo-io/protocol) contract from within a second contract. The easiest way to use this contract in a development environment is via the [captcha repository](https://github.com/prosopo-io/captcha). Manual build and deploy instructions are included below.

## Prerequisites

### Build and deploy the contract locally

After installing all [substrate pre-requisites](https://docs.substrate.io/main-docs/install/), in the contracts folder run:

```bash
cargo +nightly contract build
```

Then deploy the contract to a substrate node.

#### Deploy via the Command Line

From the root of the repo run the following command:

```bash
npm run deploy_dapp
```

#### Deploy via a User Interfacae

Use [polkadot apps](https://polkadot.js.org/apps/) contract page.
