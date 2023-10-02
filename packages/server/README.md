# @prosopo/server

npm package to make verifying Procaptcha soltions easy.

## Installation

You can install this library with:

```bash
npm install @prosopo/server --save
```

## Basic Usage

Simply import the `ProsopoServer` class and instantiate it with your Procaptcha API key.

```typescript
import {ApiParams, ProcaptchaResponse} from '@prosopo/types'
import {ProsopoServer} from '@prosopo/server'

async function getProsopoServer() {
    const config = getProsopoConfig()
    const pairType = (process.env.PAIR_TYPE as KeypairType) || ('sr25519' as KeypairType)
    const ss58Format = parseInt(process.env.SS58_FORMAT || '') || 42
    const pair = await getPair(pairType, ss58Format, process.env.REACT_APP_SERVER_MNEMONIC)
    const prosopoServer = new ProsopoServer(pair, config)
}

async function protectedFunction(server: ProsopoServer, payload: ProcaptchaResponse) {

    if (await server.isVerified(payload[ApiParams.procaptchaResponse])) {
        // perform CAPTCHA protected action
    }

}

const payload = getPayloadFromRequest() // your request payload
getProsopoServer().then((server) => {
    protectedFunction(server, payload).then(() => {
        // ...
    })
})


```

The full example can be seen [here](https://github.com/prosopo/captcha/blob/main/demos/client-example-server/src/app.ts).
