# Prosopo Provider Command Line Interface

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

## Commands

### Start the API

```bash
$ npx provider start
```

### Register your Provider

```bash
$ npx provider provider_register --url https://YOUR_URL --fee 0 --payee Dapp
```

### Fund your Provider

```bash
$ npx provider provider_update --value 1000 --address YOUR_ADDRESS
```

### Set a new Dataset

```bash
$ npx provider provider_set_data_set --file /path/to/dataset.json
```

### Deregister your Provider

```bash
$ npx provider provider_deregister
```

### List details of a single Provider

```bash
$ npx provider provider_details --address PROVIDER_ADDRESS
```

### Get a list of provider accounts from the contract

```bash
$ npx provider provider_accounts
```

### View the Provider Version

```bash
$ npx provider version
```
