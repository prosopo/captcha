FROM node:20

WORKDIR /usr/src/app

# set shell to bash and error on any failure, unset variables, and pipefail
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

COPY ./packages/cli/dist/bundle/ ./
COPY ./packages/locale/dist/locales/ ./locales/

# make the provider cli executable and create package.json
RUN echo '#!/usr/bin/env node' | cat - provider.cli.bundle.js > temp && mv temp provider.cli.bundle.js && \
    echo '{ "name": "prosopo-provider", "bin": { "provider": "./provider.cli.bundle.js" }, "type": "module" }' > /usr/src/app/package.json

# install the provider cli binary
RUN npm i

# Create a static directory for Caddy and write robots.txt inside the image
RUN mkdir -p /srv/static && \
    echo -e "User-agent: *\nDisallow: /" > /srv/static/robots.txt

EXPOSE 9229 9339 80 443

CMD ["npx", "provider", "--api"]
