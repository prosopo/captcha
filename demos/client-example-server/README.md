# client-example-server

This example server implements signup, login and authorisation methods for a typical node backend application. The code
is based
on [an article written by Agustin Fernandez](https://www.asapdevelopers.com/build-a-react-native-login-app-with-node-js-backend/)
and is adapted to use a Mongo In-Memory Database. This backend server integrates with the client-example React app.

## How to run locally

### 1. Build & Deploy

From the roof of this repository, run the following commands:

```bash
cp demos/client-example-server/env.development demos/client-example-server/.env.development && \
cp dev/scripts/env.development dev/scripts/.env.development && \
docker compose --file ./docker/docker-compose.development.yml up -d && \
npm i && \
npm run build:all && \
npm run setup:all && \
npm run start:server
```

### 2. Use the API

The server should now be running at localhost:9228. You can customise this in the `.env.development` file. Run this
example API in conjunction with the [client-example](https://github.com/prosopo/captcha/tree/main/demos/client-example)
React app.
