# Prosopo Dev Scripts Package

Scripts and configuration for setting up a Prosopo development environment.

## Prerequisites

- A unix-style environment (Linux, MacOS, WSL2)
- [Docker](https://docs.docker.com/get-docker/)
- [Node.js](https://nodejs.org/en/download/)
- [pnpm](https://pnpm.io/installation) 11 (`corepack enable`)

## Dev Setup

### Quickstart

```bash
git clone https://github.com/prosopo/captcha
cd captcha
pnpm install
pnpm run build:all
docker compose --file docker/docker-compose.development.yml up -d
cp demos/client-example-server/env.development demos/client-example-server/.env.development
cp demos/client-example/env.development demos/client-example/.env.development
cp dev/scripts/env.development .env.development
cp dev/scripts/env.development dev/scripts/.env.development
cp dev/scripts/env.development packages/cli/.env.development
cp dev/scripts/env.development packages/procaptcha-bundle/.env.development
pnpm run setup:all
```

Then start services in separate terminals:

```bash
# Terminal 1 - Example server
pnpm run start:server

# Terminal 2 - Provider API
pnpm run start:provider

# Terminal 3 - Demo app
pnpm run start:demo
```

### Step by Step

#### 1. Start Containers

```bash
docker compose --file ./docker/docker-compose.development.yml up -d
```

#### 2. Install Dependencies

```bash
pnpm install
```

#### 3. Build All Packages

```bash
pnpm run build:all
```

#### 4. Configure Environment

Copy the template env files. You can use `./dev/scripts/env.development` as a base.

#### 5. Run Setup

Registers a provider, loads a dataset, and registers site keys:

```bash
pnpm run setup:all
```

#### 6. Start Services

```bash
pnpm run start:provider
```

## Testing

```bash
pnpm run test
```

## CLI

The dev scripts CLI provides development utilities:

```bash
# Run the setup (register provider, load dataset, register site keys)
pnpm run setup

# Create env files from templates
pnpm --filter @prosopo/scripts run cli create_env_files

# Encode/decode Procaptcha tokens
pnpm --filter @prosopo/scripts run cli token

# Display version
pnpm --filter @prosopo/scripts run cli --version
```
