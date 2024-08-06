# client-example-server

This example server implements signup, login and authorisation methods for a typical node backend application. The code
is based
on [an article written by Agustin Fernandez](https://www.asapdevelopers.com/build-a-react-native-login-app-with-node-js-backend/)
and is adapted to use a Mongo In-Memory Database. This backend server integrates with the client-example React app.

## Quickstart

### Test Your Site Key and Secret Key

#### 1. Build & Deploy

From the root of this repository, run the following commands:

```bash
cp demos/client-example-server/env.production demos/client-example-server/.env.production && \
npm i && \
npm run start:server
```

Make sure you replace the following placeholders in the `.env.production` file with your own site key and secret key.
You can obtain these by logging into the [Prosopo portal](https://portal.prosopo.io).

```typescript
PROSOPO_SITE_KEY=<YOUR SITE KEY HERE>
PROSOPO_SITE_PRIVATE_KEY=<YOUR SECRET KEY HERE>
```

Run this example API in conjunction with
the [client-example](https://github.com/prosopo/captcha/tree/main/demos/client-example) React app.

## 🚧 Developing the Client Example Server

You can run in development mode to make changes to the client-example-server by following these instructions:

### Build & Deploy

From the root of this repository, run the following commands:

```bash
cp demos/client-example-server/env.development demos/client-example-server/.env.development && \
cp dev/scripts/env.development dev/scripts/.env.development && \
docker compose --file ./docker/docker-compose.development.yml up -d && \
npm i && \
npm run build:all && \
npm run setup:all && \
npm run start:server
```

### Use the API

The server should now be running at localhost:9228. You can customise this in the `.env.development` file. Run this
example API in conjunction with the [client-example](https://github.com/prosopo/captcha/tree/main/demos/client-example)
React app.
