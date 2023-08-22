FROM node:16

WORKDIR /usr/src/app

COPY ./packages/cli/dist/bundle/ ./
COPY ./128_target_generated.json ./
COPY ./docker/images/provider/provider-init.js ./provider-init.js

RUN chmod +x ./provider-init.js

EXPOSE 9229 80 443

CMD ["node", "./provider-init.js"]
