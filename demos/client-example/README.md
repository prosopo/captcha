# Getting Started with the Client Example

This project is a *minimal* example demonstrating how to include the Prosopo human verification system in a client React
app.

## How to run locally

### 1. Build & Deploy

Run these commands from the root of the captcha repo:

```bash
cp demos/client-example-server/env.development demos/client-example-server/.env.test && \
cp demos/client-example/env.development demos/client-example/.env.test && \
cp dev/scripts/env.test dev/scripts/.env.test && \
cp dev/scripts/env.test packages/cli/.env.test && \
cp dev/scripts/env.test packages/procaptcha-bundle/.env.test && \
docker compose --file ./docker/docker-compose.development.yml up -d && \
npm i && \
npm run build:all && \
npm run setup:all && \
npm run start:all
```

### 2. Visit the App

The app is now running in development mode. Open [http://localhost:9230](http://localhost:9230) to view it in the
browser.
