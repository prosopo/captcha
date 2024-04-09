# Getting Started with the Client Example

This project is a _minimal_ example demonstrating how to include Prosopo Procaptcha in a client React app.

## How to run locally

### 1. Build & Deploy

Run these commands from the root of the [captcha](https://github.com/prosopo/captcha) repo:

```bash
cp demos/client-example/env.development demos/client-example/.env.development && \
cp dev/scripts/env.development dev/scripts/.env.development && \
docker compose --file ./docker/docker-compose.development.yml up -d && \
npm i && \
npm run build:all && \
npm run setup:all && \
npm run start:demo
```

### 2. Visit the App

The app is now running in development mode. Open [http://localhost:9230](http://localhost:9230) to view it in the
browser.
