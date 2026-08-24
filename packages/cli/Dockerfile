FROM node:24

WORKDIR /usr/src/app

# set shell to bash and error on any failure, unset variables, and pipefail
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

COPY ./packages/cli/dist/bundle/ ./

COPY ./packages/locale/dist/locales/ ./locales/

# download the GeoLite2 databases into the same directory
RUN curl -L -o GeoLite2-Country.mmdb https://git.io/GeoLite2-Country.mmdb
RUN curl -L -o GeoLite2-City.mmdb https://git.io/GeoLite2-City.mmdb
RUN curl -L -o GeoLite2-ASN.mmdb https://git.io/GeoLite2-ASN.mmdb

# make the provider cli executable and set the binary for npx. The
# generated package.json declares `sharp` as a runtime dependency so
# `npm i` installs the linux-x64 native binary — vite bundles the JS
# shim but not the platform-specific .node addon, and the puzzle
# renderer imports sharp from @prosopo/puzzle-assets at runtime.
# --os=linux --cpu=x64 --include=optional forces npm to fetch the
# correct optional platform variant regardless of the build host.
RUN echo '#!/usr/bin/env node' | cat - provider.cli.bundle.js > temp && mv temp provider.cli.bundle.js && \
    echo '{ "name": "prosopo-provider", "bin": { "provider": "./provider.cli.bundle.js" }, "type": "module", "dependencies": { "sharp": "0.35.3" } }' > /usr/src/app/package.json && \
    npm i --include=optional --os=linux --cpu=x64

EXPOSE 9229 9339 80 443

CMD ["npx" , "provider" ,"--api"]
