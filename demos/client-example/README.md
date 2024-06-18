# Getting Started with the Client Example

This project is a _minimal_ example demonstrating how to include Prosopo Procaptcha in a client React app.

## Quickstart

#### 1. Build & Deploy

Run these commands from the root of the [captcha](https://github.com/prosopo/captcha) repo:

```bash
cp demos/client-example/env.production demos/client-example/.env.production && \
npm i && \
npm run start:demo
```

Make sure you replace the following placeholder in the `.env.production` file with your own site key. You can obtain
this by logging into the [Prosopo portal](https://portal.prosopo.io).

```typescript
PROSOPO_SITE_KEY=<YOUR SITE KEY HERE>
```

#### 2. Visit the App

The app is now running in development mode. Open [http://localhost:9230](http://localhost:9230) to view it in the
browser. You also need
to [start the backend server](https://github.com/prosopo/captcha/blob/main/demos/client-example-server/README.md) to
test the verification process.

## 🚧 Developing the Client Example

You can run in development mode to make changes to the client-example by following these instructions:

#### 1. Build & Deploy

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

#### 2. Visit the App

The app is now running in development mode. Open [http://localhost:9230](http://localhost:9230) to view it in the
browser.
