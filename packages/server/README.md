# @prosopo/server

Server-side package for verifying [Prosopo Procaptcha](https://prosopo.io) tokens.

## Installation

```bash
npm install @prosopo/server --save
```

## Basic Usage

```typescript
import { ProsopoServer } from "@prosopo/server"
import { getServerConfig } from "@prosopo/server"
import { getPair } from "@prosopo/keyring"

const config = getServerConfig()
const pair = getPair(process.env.PROSOPO_SITE_PRIVATE_KEY, config.account.address)
const server = new ProsopoServer(config, pair)

// Verify a Procaptcha token from the client
const result = await server.isVerified(token)
if (result.verified) {
    // user passed the captcha
}
```

See the [client-example-server](https://github.com/prosopo/captcha/tree/main/demos/client-example-server) for a full working example, and the [docs](https://docs.prosopo.io) for integration instructions.
