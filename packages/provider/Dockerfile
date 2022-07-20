FROM node:16

WORKDIR /usr/src/app

COPY . ./

ENV NODE_ENV $NODE_ENV

RUN npm i
# RUN npm run setup

EXPOSE 3000

CMD [ "npm", "run", "start" ]