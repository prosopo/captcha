FROM node:20

WORKDIR /usr/src/app

# set shell to bash and error on any failure, unset variables, and pipefail
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

COPY ./packages/cli/dist/bundle/ ./

# make the provider cli executable
# create a package.json file for the provider cli to force it to run in module mode and set the binary for npx
RUN echo '#!/usr/bin/env node' | cat - provider.cli.bundle.js > temp && mv temp provider.cli.bundle.js && \
    echo '{ "name": "prosopo-provider", "bin": { "provider": "./provider.cli.bundle.js" }, "type": "module" }' > /usr/src/app/package.json

# install the provider cli binary
RUN npm i

EXPOSE 9229 80 443

CMD ["npx" , "provider" ,"--api"]
