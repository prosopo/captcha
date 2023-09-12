FROM node:14

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install

COPY ./dist ./dist

EXPOSE 3000

CMD [ "node", "./dist/index.js" ]
