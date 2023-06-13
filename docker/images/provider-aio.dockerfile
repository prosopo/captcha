FROM mongo:latest

# work in the prosopo folder
WORKDIR /prosopo

# install dependencies
# curl for downloading the mongodb gpg key
RUN apt-get update && apt-get install -y \
    curl

# install nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# install nodejs
RUN nvm install node
RUN export NVM_DIR="$HOME/.nvm" \
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# copy in the dist folder
