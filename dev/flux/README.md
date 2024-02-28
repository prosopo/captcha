# Prosopo Flux Package (@prosopo/flux)

This package contains the scripts for interacting with the Flux network.

## CLI Usage

### Authentication

#### Authenticate with Flux Main Site only

Use to generate the authentication for a Flux node for a specific app.This allows you to go straight
to [https://runonflux.io/](https://runonflux.io/) and login with the login phrase and signature.

```bash
# authenticate with the network for a specific app
npm run cli auth
{
  nodeAPIURL: URL {
    href: 'https://api.runonflux.io/',
    origin: 'https://api.runonflux.io',
    ...
  },
  nodeLoginPhrase: 'asdlkadalkdalskdasldkadlkadlkaldkasdlk',
  nodeSignature: 'lkjasdlajsdlkajdlkajdlaskjdlaskjdlaskjdaslkd/9I='
}

```

#### Authenticate with a Node and an App

Use to generate the authentication for a Flux node for a specific app. This allows you to go straight to the node for
the app you are working with and login with the login phrase and signature.

```bash
# authenticate with the network for a specific app
npm run cli auth -- --app <app_name>
{
  nodeAPIURL: URL {
    href: 'http://x.x.x.x:16127/',
    origin: 'http://x.x.x.x:16127',
    ...
  },
  nodeLoginPhrase: 'asdlkadalkdalskdasldkadlkadlkaldkasdlk',
  nodeSignature: 'lkjasdlajsdlkajdlkajdlaskjdlaskjdlaskjdaslkd/9I='
}
```

### Redeploy

#### Get Dapps

```bash
# get all dapps
npm run cli getDapps
```

#### Get Dapp

```bash
# get details of a specific dapp
npm run cli getDapp -- --app <app_name>
```

#### Soft redeploy

```bash
# redeploy the app
npm run cli redeploy -- --app <app_name>
...
ℹ apiUrl: http://x.x.x.x:16127/id/verifylogin                                                                                                                                   deploy.js 15:00:42
ℹ { status: 'success',                                                                                                                                                                deploy.js 15:00:42
  data: { message: '<app_name> queried for global soft redeploy' } }
```

#### Hard redeploy

```bash
# hard redeploy the app
npm run cli redeploy -- --app <app_name> --hard
...
ℹ apiUrl: http://x.x.x.x:16127/id/verifylogin                                                                                                                                   deploy.js 15:00:42
ℹ { status: 'success',                                                                                                                                                                deploy.js 15:00:42
  data: { message: '<app_name> queried for global hard redeploy' } }
```
