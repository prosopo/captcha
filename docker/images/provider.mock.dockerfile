FROM node:20

WORKDIR /usr/src/app

COPY ./demos/provider-mock/package.json ./

RUN npm i

COPY ./demos/provider-mock/dist/ ./

EXPOSE 9229 80 443

CMD ["node", "./start.js"]
