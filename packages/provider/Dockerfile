FROM node:16

WORKDIR /usr/src/app

COPY . ./

ENV NODE_ENV $NODE_ENV

RUN npm i

EXPOSE 3000

ENTRYPOINT [ "npm", "run", "serve" ]