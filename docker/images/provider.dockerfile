FROM node:18

WORKDIR /usr/src/app

COPY ./packages/cli/dist/bundle/ ./

# make the provider cli executable
RUN echo '#!/usr/bin/env node' | cat - provider.cli.bundle.js > temp && mv temp provider.cli.bundle.js

# create a package.json file for the provider cli to force it to run in module mode and set the binary for npx
RUN echo '{ "name": "prosopo-provider", "bin": { "provider": "./provider.cli.bundle.js" }, "type": "module" }' > /usr/src/app/package.json

# install the provider cli binary
RUN npm i

EXPOSE 9229 80 443

CMD exec /bin/bash -c "npx provider --api"
