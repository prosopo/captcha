FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive
SHELL [ "/bin/bash", "-e", "-c" ]

VOLUME /repo
WORKDIR /repo

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl wget gnupg debian-keyring debian-archive-keyring apt-transport-https ca-certificates \
    # caddy
    && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg \
    && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list \
    # gh cli
    && mkdir -p -m 755 /etc/apt/keyrings \
    && wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    # docker
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null \
    # install deps
    && apt-get update \
    && apt-get install -y --no-install-recommends curl git pipx npm python3.8 python3-pip python3.8-venv shellcheck yamllint caddy gh docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin \
    # cleanup
    && apt-get autoremove \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set rustup and cargo home dirs
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    # Configure pipx to install applications globally
    PIPX_BIN_DIR=/usr/local/bin \
    PIPX_HOME=/usr/local/pipx \
    NVM_DIR=/usr/local/nvm \
    PROFILE=/dev/null \
    NODE_VERSION=20.16.0 \
    TOOLCHAIN_VERSION=1.77.0
RUN mkdir -p $RUSTUP_HOME $CARGO_HOME $PIPX_HOME $NVM_DIR \
    && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash \
    && source ${NVM_DIR}/nvm.sh && nvm install --default ${NODE_VERSION} \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain ${TOOLCHAIN_VERSION} --profile minimal

# Add cargo to the PATH
ENV PATH=$PATH:$CARGO_HOME/bin:$RUSTUP_HOME \
    # Add node to the PATH
    PATH="$NVM_DIR/versions/node/v${NODE_VERSION}/bin:$PATH"

RUN pipx install ansible-core \
    && pipx install ruff \
    && apt-get autoremove \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# RUN echo "alias pip='pip3'" >> ~/.bashrc

ENTRYPOINT [ "/bin/bash", "-e" ]
