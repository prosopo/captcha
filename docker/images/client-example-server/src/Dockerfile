FROM node:20

WORKDIR /usr/src/app

# Copy only package.json first for caching npm install
COPY ./demos/client-example-server/package*.json ./

RUN npm install mongodb-memory-server

# Copy your bundled code
COPY ./demos/client-example-server/dist/bundle/ ./

# Pre-download MongoDB binary
RUN npx mongodb-memory-server@latest postinstall

EXPOSE 9228 80 443

CMD ["node", "./prosopo_client_example_server.app.bundle.js"]
