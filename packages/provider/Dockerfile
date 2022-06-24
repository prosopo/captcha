FROM node:16

WORKDIR /usr/src/app

COPY . .

RUN npm i

EXPOSE 3000
EXPOSE 4000

CMD [ "npm", "run", "serve" ]