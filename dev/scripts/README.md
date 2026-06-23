# Prosopo Dev Scripts Package

Scripts and configuration for setting up a Prosopo development environment.

## Prerequisites

- A unix-style environment (Linux, MacOS, WSL2)
- [Docker](https://docs.docker.com/get-docker/)
- [Node.js](https://nodejs.org/en/download/)

## Dev Setup

### Quickstart

```bash
git clone https://github.com/prosopo/captcha
cd captcha
npm i
npm run build:all
docker compose --file docker/docker-compose.development.yml up -d
cp demos/client-example-server/env.development demos/client-example-server/.env.development
cp demos/client-example/env.development demos/client-example/.env.development
cp dev/scripts/env.development .env.development
cp dev/scripts/env.development dev/scripts/.env.development
cp dev/scripts/env.development packages/cli/.env.development
cp dev/scripts/env.development packages/procaptcha-bundle/.env.development
npm run setup:all
```

Then start services in separate terminals:

```bash
# Terminal 1 - Example server
npm run start:server

# Terminal 2 - Provider API
npm run start:provider

# Terminal 3 - Demo app
npm run start:demo
```

### Step by Step

#### 1. Start Containers

```bash
docker compose --file ./docker/docker-compose.development.yml up -d
```

#### 2. Install Dependencies

```bash
npm i
```

#### 3. Build All Packages

```bash
npm run build:all
```

#### 4. Configure Environment

Copy the template env files. You can use `./dev/scripts/env.development` as a base.

#### 5. Run Setup

Registers a provider, loads a dataset, and registers site keys:

```bash
npm run setup:all
```

#### 6. Start Services

```bash
npm run start:provider
```

## Testing

```bash
npm run test
```

## CLI

The dev scripts CLI provides development utilities:

```bash
# Run the setup (register provider, load dataset, register site keys)
npm run setup

# Create env files from templates
npm run -w @prosopo/scripts -- cli create_env_files

# Encode/decode Procaptcha tokens
npm run -w @prosopo/scripts -- cli token

# Display version
npm run -w @prosopo/scripts -- cli --version
```
