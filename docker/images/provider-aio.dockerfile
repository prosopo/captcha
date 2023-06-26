FROM mongo:latest

RUN mkdir -p /app/nvm
ENV NVM_DIR /app/nvm
ENV NODE_VERSION 18.0.0

RUN apt-get update
RUN apt-get install -y curl

# Install nvm with node and npm
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.39.3/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

# work in the app folder
WORKDIR /app
# copy in the dist folder
COPY ./packages /app/packages
COPY ./node_modules /app/node_modules
COPY ./docker/images/script.sh /app/script.sh
COPY ./docker/images/script.js /app/script.js

ENTRYPOINT [ "bash", "/app/script.sh"]
