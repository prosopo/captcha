FROM node:16

WORKDIR /usr/src/app

COPY . ./

RUN npm i
RUN npm run build:docker

EXPOSE 3000

ENTRYPOINT [ "npm", "run", "serve:docker" ]