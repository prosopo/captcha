FROM node:20

COPY ./demos/provider-mock/dist/bundle/ /usr/src/app

EXPOSE 9229 9339 80 443

WORKDIR /usr/src/app

EXPOSE 9229 80 443

CMD ["node", "./provider-mock.start.bundle.js"]
