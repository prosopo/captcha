# Prosopo Flux Package (@prosopo/flux)

This package contains the scripts for interacting with the Flux network.

## CLI Usage

### Authentication

Use to generate the authentication for a Flux node for a specific app.

```bash
# authenticate with the network for a specific app
flux auth --app <app_name>
{
  nodeAPIURL: URL {
    href: 'http://x.x.x.x:16127/',
    origin: 'http://x.x.x.x:16127',
    protocol: 'http:',
    username: '',
    password: '',
    host: 'x.x.x.x:16127',
    hostname: 'x.x.x.x',
    port: '16127',
    pathname: '/',
    search: '',
    searchParams: URLSearchParams {},
    hash: ''
  },
  nodeLoginPhrase: 'asdlkadalkdalskdasldkadlkadlkaldkasdlk',
  nodeSignature: 'lkjasdlajsdlkajdlkajdlaskjdlaskjdlaskjdaslkd/9I='
}
```

### Redeploy

#### Soft redeploy

```bash
# redeploy the app
flux redeploy --app <app_name>
...
ℹ apiUrl: http://x.x.x.x:16127/id/verifylogin                                                                                                                                   deploy.js 15:00:42
ℹ { status: 'success',                                                                                                                                                                deploy.js 15:00:42
  data: { message: '<app_name> queried for global soft redeploy' } }
```

#### Hard redeploy

```bash
# hard redeploy the app
flux redeploy --app <app_name> --hard
...
ℹ apiUrl: http://x.x.x.x:16127/id/verifylogin                                                                                                                                   deploy.js 15:00:42
ℹ { status: 'success',                                                                                                                                                                deploy.js 15:00:42
  data: { message: '<app_name> queried for global hard redeploy' } }
```
