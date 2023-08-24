FROM node:16

WORKDIR /usr/src/app

COPY ./packages/cli/dist/bundle/ ./
COPY ./128_target_generated.json ./
COPY ./docker/images/provider/provider-init.js ./provider-init.js

RUN chmod +x ./provider-init.js

RUN echo "$PWD"

EXPOSE 9229 80 443

ENTRYPOINT ["node", "./provider-init.js"]
