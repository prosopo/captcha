FROM node:20

COPY ./demos/client-example-server/dist/bundle/ /usr/src/app

EXPOSE 9228 80 443

WORKDIR /usr/src/app

# Download MongoDB binary
RUN npm install mongodb-memory-server

# Copy bundled code
COPY ./demos/client-example-server/dist/bundle/ ./

EXPOSE 9228 80 443

CMD ["node", "./prosopo_client_example_server.app.bundle.js"]
