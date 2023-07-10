FROM node:18

WORKDIR /usr/src/app

COPY ./packages/cli/dist/bundle/ ./

EXPOSE 9229 80 443

CMD exec /bin/bash -c "npm run start"
