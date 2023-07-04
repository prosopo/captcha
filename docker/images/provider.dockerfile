FROM node:18

RUN apt update

RUN apt install -y debian-keyring debian-archive-keyring apt-transport-https && \
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg && \
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list && \
    apt update && \
    apt install caddy

COPY ./docker/images/provider.Caddyfile /etc/caddy/Caddyfile

RUN echo $(caddy version)

WORKDIR /usr/src/app

COPY ./packages ./packages/
COPY ./package.json ./
COPY ./tsconfig.json ./
COPY ./tsconfig.build.json ./

RUN echo $(ls -la)

RUN npm i
RUN npm run -w @prosopo/provider build
RUN npm run -w @prosopo/cli build

EXPOSE 9229 80 443

ENTRYPOINT [ "npm", "run", "start:provider" ]
