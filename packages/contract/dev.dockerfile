FROM node:16-alpine AS dev
RUN apk add --update --no-cache python3 gcc g++ libc-dev make && ln -sf python3 /usr/bin/python
RUN apk add curl zsh git
ENV USER=node
RUN mkdir -p /usr/src/app && chown -R $USER:$USER /usr/src/app
RUN mkdir -p /usr/src/redspot && chown -R $USER:$USER /usr/src/redspot
RUN mkdir -p /usr/src/data && chown -R $USER:$USER /usr/src/data
USER $USER
WORKDIR /usr/src/app
RUN sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN . ~/.cargo/env && \
    rustup default stable &&\
    rustup update &&\
    rustup update nightly &&\
    rustup target add wasm32-unknown-unknown --toolchain nightly && \
    cargo install cargo-contract --vers ^0.16 --force --locked
RUN rm -rf /usr/src/app/build
CMD ["zsh", "./devops/startup.sh"]