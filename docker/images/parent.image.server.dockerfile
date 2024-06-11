FROM node:20

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install

COPY ./dist /usr/src/app/dist

EXPOSE 3000

CMD [ "node", "./dist/index.js" ]
