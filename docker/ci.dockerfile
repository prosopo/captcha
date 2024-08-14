FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive
# force bash to run in interactive mode so nvm is loaded
RUN sed -i 's/[ -z "$PS1" ] && return/# [ -z "$PS1" ] && return/' ~/.bashrc
SHELL [ "/bin/bash", "-e", "-c" ]

VOLUME /repo
WORKDIR /repo

RUN apt-get update
RUN apt-get install -y curl gnupg debian-keyring debian-archive-keyring apt-transport-https

RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
RUN apt-get update

RUN apt-get install -y --no-install-recommends git
RUN apt-get install -y --no-install-recommends pipx
RUN apt-get install -y --no-install-recommends npm
RUN apt-get install -y --no-install-recommends python3.8
RUN apt-get install -y --no-install-recommends python3-pip
RUN apt-get install -y --no-install-recommends python3.8-venv
RUN apt-get install -y --no-install-recommends shellcheck
RUN apt-get install -y --no-install-recommends yamllint
RUN apt-get install -y --no-install-recommends caddy
RUN apt-get install -y --no-install-recommends wget
RUN mkdir -p -m 755 /etc/apt/keyrings \
    && wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install gh -y

RUN apt-get install ca-certificates curl
RUN install -m 0755 -d /etc/apt/keyrings
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
RUN chmod a+r /etc/apt/keyrings/docker.asc
RUN echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
RUN apt-get update
RUN apt-get install -y --no-install-recommends docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
RUN source ~/.bashrc && nvm install 20 && nvm use 20

RUN pipx install ansible

RUN pip install ruff

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain 1.77

RUN rm -rf /var/lib/apt/lists/*

RUN echo "alias pip='pip3'" >> ~/.bashrc

ENTRYPOINT [ "/bin/bash", "-euxo", "pipefail" ]
