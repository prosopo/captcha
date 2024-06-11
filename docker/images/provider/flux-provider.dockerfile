FROM node:20

WORKDIR /usr/src/app

COPY ./packages/cli/dist/bundle/ ./
COPY ./128_target_generated.json ./
COPY ./docker/images/provider/provider-init.js ./provider-init.js
COPY ./docker/images/provider/package.json ./package.json

RUN chmod +x ./provider-init.js

RUN echo "$PWD"

EXPOSE 9229 80 443

ENTRYPOINT ["node", "./provider-init.js"]
