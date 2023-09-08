FROM node:18

WORKDIR /usr/src/app

COPY ./packages/cli/dist/bundle/ ./

CMD echo '{ "type": "module" }' > package.json

EXPOSE 9229 80 443

CMD exec /bin/bash -c "node provider.cli.bundle.js --api"
