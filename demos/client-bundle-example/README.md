# Getting Started with the Client Bundle Example

This project is a _minimal_ example demonstrating how to include the Prosopo Procaptcha bundle in a client app.

## How to run locally

### 1. One-time setup

Run these commands once from the root of the [captcha](https://github.com/prosopo/captcha) repo:

```bash
./setup_certs.sh && \
./install_cert.sh && \
cp dev/scripts/env.development dev/scripts/.env.development && \
cp dev/scripts/env.development packages/procaptcha-bundle/.env.development && \
docker compose --file ./docker/docker-compose.development.yml up -d && \
npm i && \
npm run build:all && \
npm run setup:all && \
NODE_ENV=development npm -w @prosopo/procaptcha-bundle run bundle
```

### 2. Run the long-running processes

These three commands need to run concurrently — either in separate terminals,
or via `npm run start:all` which uses `concurrently` to bundle them:

```bash
# Terminal A — serves the bundled widget JS at https://localhost:9269
NODE_ENV=development npm -w @prosopo/procaptcha-bundle run serve

# Terminal B — provider + example server + demo (concurrent)
NODE_ENV=development npm run start:all
```

### 3. Visit the App

The app is now running in development mode. Open [https://localhost:9232](https://localhost:9232) to view it in the
browser.
