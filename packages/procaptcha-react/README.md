# Prosopo Procaptcha React Component Library

React components for integrating the Prosopo [procaptcha](https://github.com/prosopo/procaptcha) into a React app.

Prosopo is a distributed human verification service that can be used to stop bots from interacting with your apps.
Sign up to be a network [beta tester](https://prosopo.io/#signup).

## Installation

You can install this library with:

```bash
npm install @prosopo/procaptcha-react --save
```

## Basic Usage

See the [client example](https://github.com/prosopo/client-example) for a minimal example of these components being used
in a frontend app.

```jsx
<Procaptcha config={config} callbacks={{ onError, onHuman, onExpired }} />
```

### Callbacks

`ProcaptchaEvents` are passed to the captcha component at creation.

The captcha event callbacks are defined as follows:

```typescript
/**
 * A list of all events which can occur during the Procaptcha process.
 */
export interface ProcaptchaEvents {
    onError: (error: Error) => void
    onHuman: (output: ProcaptchaOutput) => void
    onExtensionNotFound: () => void
    onExpired: () => void
    onFailed: () => void
}
```

### onHuman

The `onHuman` callback is called when the user has successfully completed the captcha challenge. The `ProcaptchaOutput`
object contains the following fields:

| Key          | Type   | Description                                                                                                                   |
| ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| commitmentId | string | The commitment ID of the captcha challenge. This is used to verify the user's response on-chain.                              |
| providerUrl  | string | The URL of the provider that the user used to solve the captcha challenge.                                                    |
| dapp         | string | The SITE_KEY of your application / website                                                                                    |
| user         | string | The user's account address                                                                                                    |
| blockNumber  | number | The block number of the captcha challenge. This is used to verify that the contacted provider was randomly selected on-chain. |

### onError

The `onError` callback is called when an error occurs during the captcha process. The `Error` object is a standard
JavaScript error.

### onExpired

The `onExpired` callback is called when the captcha challenge has expired. This can occur if the user takes too long to
complete the challenge.

### onFailed

The `onFailed` callback is called when the user has failed the captcha challenge. This can occur if the user answers the
challenge incorrectly.

## Add the Procaptcha Widget to your Web page using a React Component

You can see Procaptcha being used as a React component in
our [React Demo](https://github.com/prosopo/captcha/blob/main/demos/client-example/src/App.tsx).

The Procaptcha component is called as follows:

```tsx
<Procaptcha config={config} callbacks={{ onError, onHuman, onExpired }} />
```

A config object is required and must contain your SITE_KEY. The callbacks are optional and can be used to handle the
various Procaptcha events. The following config demonstrates the `PROSOPO_SITE_KEY` variable being pulled from
environment variables.

```tsx
const config: ProcaptchaClientConfigInput = {
    account: {
        address: process.env.PROSOPO_SITE_KEY || undefined,
    },
    web2: 'true',
    dappName: 'client-example',
    defaultEnvironment: 'rococo',
    networks: {
        rococo: {
            endpoint: 'wss://rococo-contracts-rpc.polkadot.io:443',
            contract: {
                address: '5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u',
                name: 'prosopo',
            },
        },
    },
    solutionThreshold: 80,
}
```

### Config Options

| Key                | Type   | Description                                                                             |
| ------------------ | ------ | --------------------------------------------------------------------------------------- |
| account            | string | The SITE_KEY you received when you signed up                                            |
| web2               | string | Set to `true` to enable web2 support                                                    |
| dappName           | string | The name of your application / website                                                  |
| defaultEnvironment | string | The default environment to use - set to `rococo`                                        |
| networks           | object | The networks your application supports - copy paste this from the config above          |
| solutionThreshold  | number | The percentage of captcha that a user must have answered correctly to identify as human |

## Verify the User Response Server Side

Please see the main [README](https://github.com/prosopo/captcha/blob/main/README.md) for instructions on how to implement the server side of Procaptcha.
