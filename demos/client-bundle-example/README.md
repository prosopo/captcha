# Getting Started with the Client Bundle Example

This project is a _minimal_ example demonstrating how to include the Prosopo Procaptcha bundle in a client app.

## How to run locally

### 1. Build & Deploy

Run these commands from the root of the [captcha](https://github.com/prosopo/captcha) repo:

```bash
cp dev/scripts/env.development dev/scripts/.env.development && \
cp dev/scripts/env.development packages/procaptcha-bundle/.env.development && \
docker compose --file ./docker/docker-compose.development.yml up -d && \
npm i && \
npm run build:all && \
npm run setup:all && \
NODE_ENV=development npm -w @prosopo/procaptcha-bundle run bundle && \
npm run start:all
```

### 2. Visit the App

The app is now running in development mode. Open [http://localhost:9232](http://localhost:9232) to view it in the
browser.
