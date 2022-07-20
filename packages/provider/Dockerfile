FROM node:16

WORKDIR /usr/src/app

COPY . ./

ENV NODE_ENV $NODE_ENV
ENV DATABASE_PASSWORD $MONGO_INITDB_ROOT_PASSWORD

RUN npm i
RUN npm run build:docker

EXPOSE 3000

ENTRYPOINT [ "npm", "run", "serve:docker" ]