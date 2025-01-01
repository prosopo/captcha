# Developer Information

This file is intended for developers. It provides details on the project's structure and instructions on how to work
with it.

## 1. Packages

Client-side (browser):

* **procaptcha-bundle** - Displaying captcha widget
* inner:
    - procaptcha-frictionless
    - procaptcha-react (image)
    - procaptcha-pow

Server-side (node.js):

* **provider** - API Endpoints provider for the captcha widget
* **database** - Mongo DB Query builder
* inner:
    - types-database - declaration of interfaces and types used in the Query builder

## 2. Code Quality & Style

* [ESLint](https://eslint.org/) - static code analyses
* [Biome](https://biomejs.dev/) - formatting (see `/biome.json`)

If your IDE supports `biome` (directly, or via plugin), you can configure it to work with the `/biome.json`).

## 3. Names in code

* `dapp`, `dappAccount` = `clientId` = `siteKey` in the portal
* `user`, `userAccount` = `userId`

## 3. Commands

* Installation: `npm install`
* Building packages: `npm run build:all`
* Building the bundle: `npm run build:bundle`
* Linting: `npm run lint-fix` (formatting & code validation)

## 4. Running Tests (locally)

### 4.1) Environment Setup

> This step should be done only once, after the repository has been cloned, then this step should be omitted.

To set up the environment for testing, run the following commands:

```
cp demos/client-example-server/env.development demos/client-example-server/.env.test
cp demos/client-example/env.development demos/client-example/.env.test
cp demos/client-bundle-example/env.development demos/client-bundle-example/.env.test
cp dev/scripts/env.test .env.test
cp dev/scripts/env.test dev/scripts/.env.test
cp dev/scripts/env.test packages/cli/.env.test
cp dev/scripts/env.test packages/procaptcha-bundle/.env.test
```

### 4.2) Launching DB service

The DB is necessary for all kind of the tests. Since the DB is docked, to start the DB service run the following:

```
docker compose --file ./docker/docker-compose.test.yml up -d --remove-orphans --force-recreate --always-recreate-deps
```

Note: After the testing is done, stop it using the `down` command:

```
docker compose --file ./docker/docker-compose.test.yml down
```

### 4.3) DB population

This command should be called once per the container lifetime, and adds the initial data, like domains,
siteKeys, etc.

```
NODE_ENV="test" npm run setup
```

### 4.4) Running all unit tests

Launch services:

```
NODE_ENV=test npm run start:provider:admin
```

* `Provider:admin` service is required for the `provider` unit tests.

Run all the unit tests:

```
npm run test
```

* The command will loop through all the `package/*` folders, and run individual unit tests for each
  package.

Tip: You can also run package-related unit tests individually, by running `npm run test` inside the target package
folder.

### 4.5) Running E2E Client Tests

Launch services:

```
npm run -w @prosopo/client-example-server build && NODE_ENV=test npm run start:server
NODE_ENV=test npm run start:demo
NODE_ENV=test npm run start:provider:admin
```

Run tests:

```
NODE_ENV=test npm run -w @prosopo/cypress-shared cypress:open:client-example
```

### 4.6) Running E2E Bundle Tests

Launch services:

```
npm run -w @prosopo/client-example-server build && NODE_ENV=test npm run start:server
NODE_ENV=test npm run start:demo
NODE_ENV=test npm run start:provider:admin
NODE_ENV="development" npm -w @prosopo/procaptcha-bundle run bundle
NODE_ENV=test npm run start:bundle
```

Run tests:

```
NODE_ENV=test npm -w @prosopo/cypress-shared run cypress:open:client-bundle-example
```
