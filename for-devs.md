## Developer Information

This file is intended for developers. It provides details on the project's structure and instructions on how to work
with it.

### 1. Packages

Client-side (browser):

* **procaptcha-bundle** - Displaying captcha widget
* inner:
    - procaptcha-frictionless
    - procaptcha-react (image)
    - procaptcha-pow

Server-side (node.js):

* **provider** - API Endpoints vendor for the captcha widget

### 2. Code Quality & Style

* [ESLint](https://eslint.org/) - static code analyses
* [Biome](https://biomejs.dev/) - formatting (see `/biome.json`)

If your IDE supports `biome` (directly, or via plugin), you can configure it to work with the `/biome.json`).

### 2. Commands

* Installation: `npm install`
* Building packages: `npm run build:all`
* Building the bundle: `npm run build:bundle`
* Linting: `npm run lint-fix` (formatting & code validation)

### 3. Environment Setup for Tests (Once)

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

### 4. Running E2E Client Tests Locally

#### 4.1) Launching services

The DB is docked, and to start the DB service, run the following:

```
docker compose --file ./docker/docker-compose.test.yml up -d --remove-orphans --force-recreate --always-recreate-deps
NODE_ENV="test" npm run setup
```

> Note: the second command should be called once per the container lifetime, and adds the initial data, like domains,
> siteKeys, etc.

Then start the services:

```
npm run -w @prosopo/client-example-server build && NODE_ENV=test npm run start:server
NODE_ENV=test npm run start:demo
NODE_ENV=test npm run start:provider:admin
```

#### 4.2) Running the Tests

```
NODE_ENV=test npm run -w @prosopo/cypress-shared cypress:open:client-example
```

#### 4.3) Stopping Docker Services

After the tests finish, stop the Docker services with:

```
docker compose --file ./docker/docker-compose.test.yml down
```

### 5. Running E2E Bundle Tests Locally

#### 5.1) Launching Services

For bundle tests, use the same services as for the E2E client tests, plus the following:

```
NODE_ENV="development" npm -w @prosopo/procaptcha-bundle run bundle
NODE_ENV=test npm run start:bundle
```

#### 5.2) Running the Tests

```
NODE_ENV=test npm -w @prosopo/cypress-shared run cypress:open:client-bundle-example
```
