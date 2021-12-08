FROM node:16-alpine AS dev

WORKDIR /usr/src/app
RUN apk add --update --no-cache python3 gcc g++ libc-dev make && ln -sf python3 /usr/bin/python

CMD ["sleep", "infinity"]