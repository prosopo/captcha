# Procaptcha Cypress Testing

## Pre-requisites

### Install Node.js

<https://nodejs.org/en/download/package-manager>

Then install pnpm 11 with `corepack enable`.

### Install Cypress

<https://docs.cypress.io/guides/getting-started/installing-cypress>

### Set up the containers

```bash
docker compose --file ./docker/docker-compose.test.yml up -d
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

### Headless, without a local browser

CI runs each `cypress.<type>.config.js` against the bundle demo (see `.github/workflows/cypress.yml`). To do the same
without installing Chrome or the Cypress binary, run the services on the host and Cypress from the
`cypress/included` image, whose version must match `cypress` in `package.json`:

```bash
NODE_EXTRA_CA_CERTS=$PWD/certs/ca.crt NODE_ENV=test pnpm exec concurrently \
  "pnpm run start:server" "pnpm run start:provider:admin" "pnpm run start:bundle" "pnpm run serve:bundle" \
  "pnpm exec tsx ./demos/cypress-shared/scripts/wait-for-services.ts && docker run --rm --network host \
    --user $(id -u):$(id -g) -e HOME=/tmp -e NODE_TLS_REJECT_UNAUTHORIZED=0 -e CAPTCHA_TYPE=image \
    -e CYPRESS_BASE_URL=https://localhost:9232 -v $PWD:$PWD -w $PWD/demos/cypress-shared \
    --entrypoint ./node_modules/.bin/cypress cypress/included:16.1.1 \
    run --browser electron --config-file cypress.image.config.js --spec cypress/e2e/language.cy.ts" \
  --success first --kill-others
```

`NODE_EXTRA_CA_CERTS` stands in for `./install_cert.sh`: without either, the demo server cannot call the provider
over TLS and the signup specs fail with a 500. Drop `--spec` to run every spec the config picks up.

`language.cy.ts` runs the image captcha in Turkish, choosing the language from the browser, from `data-language`, and
from a `data-language` list, and falls back to English for an unsupported language. It also runs it in Arabic, from the
browser and from `data-language`, and checks the widget is laid out right to left (`dir="rtl"` on its host).
