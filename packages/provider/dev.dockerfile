FROM node:16-alpine AS dev

WORKDIR /usr/src/app
RUN apk add --update --no-cache python3 gcc g++ libc-dev make && ln -sf python3 /usr/bin/python
RUN apk add curl zsh git
RUN sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

CMD ["zsh", "./devops/startup.sh"]