# Prosopo Provider CLI

The Provider CLI is used to manage and run a [Prosopo Procaptcha](https://prosopo.io) Provider instance. It can start the Provider API server, manage datasets, register site keys, and run scheduled maintenance tasks.

The CLI is intended to be used from within the Prosopo Provider container image. A bundled version is available in the container.

## Usage

### Start the API Server

```bash
node ./dist/cli.js --api
```

Start with admin endpoints enabled:

```bash
node ./dist/cli.js --api --adminApi
```

Start in development mode (watches `.env` for changes and hot-restarts):

```bash
node ./dist/cli.js --api --dev
```

### Load a Dataset

Load a captcha dataset into the provider database:

```bash
node ./dist/cli.js provider_set_data_set --file /path/to/dataset.json
```

### Register a Site Key

```bash
node ./dist/cli.js site_key_register <sitekey> <tier>
```

Or register via an API call to another provider:

```bash
node ./dist/cli.js site_key_register_api <sitekey> <tier>
```

### Database Management

Create indexes on the internal database:

```bash
node ./dist/cli.js ensure_indexes
```

Create indexes on the external captcha database:

```bash
node ./dist/cli.js ensure_external_indexes
```

### Other Commands

```bash
node ./dist/cli.js store_captchas              # Store captcha records externally
node ./dist/cli.js update_spam_email_domains    # Update spam email domain blocklist
node ./dist/cli.js migrate_abuser_score_threshold # Run database migration
node ./dist/cli.js version                      # Print the software version
```

## Global Options

```
--api        Start the Provider API server              [boolean] [default: false]
--adminApi   Enable admin API endpoints                 [boolean] [default: false]
--help       Show help                                                   [boolean]
--version    Show version number                                         [boolean]
```
