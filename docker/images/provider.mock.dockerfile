FROM node:20

WORKDIR /usr/src/app

COPY ./demos/provider-mock/dist/ ./
COPY ./demos/provider-mock/package.json ./

RUN npm i

EXPOSE 9229 80 443

CMD ["node", "./start.js"]
