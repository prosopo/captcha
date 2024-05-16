# Procaptcha Cypress Testing

## Pre-requisites

### Install Node.js

https://nodejs.org/en/download/package-manager

### Install Cypress

https://docs.cypress.io/guides/getting-started/installing-cypress

### Set up the containers

```bash
docker compose --file ./docker/docker-compose.development.yml up -d
```

## Workspace Setup

Run all of the following commands from the root of the workspace.

#### Install the dependencies

```bash
npm install
```

#### Set up the environment variables

```bash
cp demos/client-example-server/env.development demos/client-example-server/.env.development
cp demos/client-example/env.development demos/client-example/.env.development
cp dev/scripts/env.development dev/scripts/.env.development
cp dev/scripts/env.development packages/cli/.env.development
cp dev/scripts/env.development packages/procaptcha-bundle/.env.development
```

#### Build the packages

```bash
npm run build:all
```

#### Start the local services

```bash
npm run start:all
```

#### Single Command

You can use this single command to run all of the above commands at once.

```bash
npm install
cp demos/client-example-server/env.development demos/client-example-server/.env.development
cp demos/client-example/env.development demos/client-example/.env.development
cp dev/scripts/env.development dev/scripts/.env.development
cp dev/scripts/env.development packages/cli/.env.development
cp dev/scripts/env.development packages/procaptcha-bundle/.env.development
npm run build:all
npm run start:all
```

## Run the tests

### Client Example React Demo

This tests the React component in an example login page. Both the server and the client must be running.

```bash
npm -w @prosopo/cypress-shared run cypress:open:client-example
```

### Client Example Bundle Demo

This tests the JavaScript bundle in a static HTML page. Make sure to build the bundle before running the tests. The
bundle will be copied to the client-bundle-example folder by the vite build command.

```bash
npm -w @prosopo/procaptcha-bundle run bundle:dev
npm -w @prosopo/cypress-shared run cypress:open:client-example-bundle
```
