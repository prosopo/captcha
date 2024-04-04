# Getting Started with the Client Example

This project is a _minimal_ example demonstrating how to include Prosopo PoW Procaptcha in a client React app.

To begin, clone this repository and navigate to the `client-pow-example` directory. Then copy the template env file and start the app.

## How to run locally

### 1. Build & Deploy

Run these commands from the root of the [captcha](https://github.com/prosopo/captcha) repo:

```bash
cp demos/client-example-server/env.development demos/client-example-server/.env.development && \
cp demos/client-pow-example/env.development demos/client-pow-example/.env.development && \
cp dev/scripts/env.development dev/scripts/.env.development && \
cp dev/scripts/env.development packages/cli/.env.development && \
cp dev/scripts/env.development packages/procaptcha-bundle/.env.development && \
docker compose --file ./docker/docker-compose.development.yml up -d && \
npm i && \
npm run build:all && \
npm run setup:all && \
npm run start:all:pow
```

### 2. Visit the App

The app is now running in development mode. Open [http://localhost:9240](http://localhost:9240) to view it in the
browser.
