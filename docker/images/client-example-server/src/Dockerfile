FROM node:20

COPY ./demos/client-example-server/dist/bundle/ /usr/src/app

EXPOSE 9228 80 443

WORKDIR /usr/src/app

EXPOSE 9228 80 443

CMD ["node", "./prosopo_client_example_server.bundle.js"]
