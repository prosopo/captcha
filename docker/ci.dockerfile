FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive
SHELL [ "/bin/bash", "-euxo", "pipefail", "-c" ]

VOLUME /repo
WORKDIR /repo

RUN apt-get update
RUN apt-get install -y curl gnupg  debian-keyring debian-archive-keyring apt-transport-https

RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
RUN apt-get update

RUN apt-get install --no-install-recommends -y git pipx npm python3.8 python3-pip python3.8-venv shellcheck yamllint caddy

# RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# RUN pipx install ansible-core --force && pipx ensurepath --force

# RUN pip install ruff

RUN rm -rf /var/lib/apt/lists/*

ENTRYPOINT [ "/bin/bash", "-euxo", "pipefail" ]
