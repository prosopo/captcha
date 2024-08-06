# Prosopo Provider Command Line Interface

The Provier CLI allows you to set up a Provider instance and begin to serve CAPTCHA challenges to the Prosopo Network.
This will allow you to obtain valuable human-labelled image data. As we are currently in beta testing, the CLI is **only
useable for development purposes**.

The Provider CLI is intended to be used from within the Prosopo Provider Container Image. It is not intended to be used
directly from the host machine. A bundled version of the CLI is available in the Provider Container Image.

## Container Image

### Get the Container ID

To execute commands against the running Provider, you must first get the Container ID of the running Provider Container.

    ```bash
    $ PROVIDER_CONTAINER = docker ps -q -f name=docker-provider
    ```

### Execute a command inside the provider container

You can then execute the commands as follows:

    ```bash
    $ docker exec -it $PROVIDER_CONTAINER bash -c "npx provider <command>"
    ```

### Executing Commands in the Container

### Register your Provider

You must first register your Provider in the network contract in order to be selected as a CAPTCHA Provider.

```bash
npx provider provider_register --url https://YOUR_URL --fee 0 --payee Dapp
```

### Fund your Provider

It is necessary to fund your Provider with at least the minimum fee amount in order to serve CAPTCHA challenges. The
funds are used to incentivise good behaviour by Providers.

```bash
npx provider provider_update --value 1000 --address YOUR_ADDRESS
```

### Set a new Dataset

You must load a dataset in to your database in order to provider CAPTCHA challenges. The dataset contains the CAPTCHA
challenges that will be served to users. The format for the dataset is
defined [here](https://github.com/prosopo/captcha/blob/main/packages/types/src/datasets/dataset.ts) and an example
dataset can be seen [here](https://github.com/prosopo/captcha/blob/main/dev/data/captchas.json).

```bash
npx provider provider_set_data_set --file /path/to/dataset.json
```

### Start the API

Start the API and a begin to serve CAPTCHA challenges.

```bash
npx provider start
```

### Deregister your Provider

When you no longer wish to be part of the Prosopo Network, you can stop serving CAPTCHA challenges by deregistering.

```bash
npx provider provider_deregister
```

### List details of a single Provider

```bash
npx provider provider_details --address PROVIDER_ADDRESS
```

### Get a list of provider accounts from the contract

```bash
npx provider provider_accounts
```

### View the Provider Version

```bash
npx provider version
```

## Full CLI Usage

`--help` output from the CLI.

```bash
Usage: cli.js [global options] <command> [options]

Commands:
  cli.js provider_register            Register a Provider
  cli.js provider_update              Update a Provider
  cli.js provider_deregister          Deregister a Provider
  cli.js provider_set_data_set        Add a dataset as a Provider
  cli.js dapp_register                Register a Dapp
  cli.js dapp_update                  Register a Dapp
  cli.js provider_accounts            List all provider accounts
  cli.js dapp_accounts                List all dapp accounts
  cli.js provider_details             List details of a single Provider
  cli.js provider_dataset             Exports a dataset from the provider database
  cli.js dapp_details                 List details of a single Dapp
  cli.js calculate_captcha_solutions  Calculate captcha solutions
  cli.js batch_commit                 Batch commit user solutions to contract
  cli.js version                      Return the version of the software

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
  --api                                               [boolean] [default: false]

```
