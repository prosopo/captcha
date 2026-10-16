# Procaptcha Cypress Testing

## Pre-requisites

### Install Node.js

<https://nodejs.org/en/download/package-manager>

Then install pnpm 11 with `corepack enable`.

### Install Cypress

<https://docs.cypress.io/guides/getting-started/installing-cypress>

### Set up the containers

```bash
docker compose --file ./docker/docker-compose.development.yml up -d
```

## Workspace Setup

Run all of the following commands from the root of the workspace.

### Install the dependencies

```bash
pnpm install
```

### Set up the environment variables

```bash
cp demos/client-example-server/env.development demos/client-example-server/.env.development
cp demos/client-example/env.development demos/client-example/.env.development
cp dev/scripts/env.development dev/scripts/.env.development
cp dev/scripts/env.development packages/cli/.env.development
cp dev/scripts/env.development packages/procaptcha-bundle/.env.development
```

### Build the packages

```bash
pnpm run build:all
```

### Start the local services

```bash
pnpm run start:all
```

### Single Command

You can use this single command to run all of the above commands at once.

```bash
pnpm install
cp demos/client-example-server/env.development demos/client-example-server/.env.development
cp demos/client-example/env.development demos/client-example/.env.development
cp dev/scripts/env.development dev/scripts/.env.development
cp dev/scripts/env.development packages/cli/.env.development
cp dev/scripts/env.development packages/procaptcha-bundle/.env.development
pnpm run build:all
pnpm run start:all
```

## Run the tests

### Client Example React Demo

This tests the React component in an example login page. Both the server and the client must be running.

```bash
pnpm --filter @prosopo/cypress-shared run cypress:open:client-example
```

### Client Example Bundle Demo

This tests the JavaScript bundle in a static HTML page. Make sure to build the bundle before running the tests. The
bundle will be copied to the client-bundle-example folder by the vite build command.

```bash
NODE_ENV=development pnpm --filter @prosopo/procaptcha-bundle run bundle
pnpm --filter @prosopo/cypress-shared run cypress:open:client-example-bundle
```
