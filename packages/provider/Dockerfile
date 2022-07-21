FROM node:16

WORKDIR /usr/src/app

COPY . ./

RUN npm i
RUN npm run build:config -- ./tsconfig.docker.json

EXPOSE 3000

ENTRYPOINT [ "npm", "run", "serve" ]