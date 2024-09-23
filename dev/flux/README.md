# @prosopo/flux

This package contains a Command Line Interface (CLI) for interacting with the Flux cloud network.

## CLI Usage

### Authentication

#### Authenticate with Flux Main Site only

Use to generate the authentication for a Flux node for a specific app.This allows you to go straight
to the [RunOnFlux Login](https://cloud.runonflux.io/login.html) and login with the login phrase and signature.

```bash
# authenticate with the network for a specific app
npx flux auth
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
npx flux auth <app_name>
{
  nodeAPIURL: URL {
    # You can now visit this (using port 16126) to login with the login phrase and signature
    href: 'http://x.x.x.x:16127/',
    origin: 'http://x.x.x.x:16127',
    ...
  },
  nodeLoginPhrase: 'asdlkadalkdalskdasldkadlkadlkaldkasdlk',
  nodeSignature: 'lkjasdlajsdlkajdlkajdlaskjdlaskjdlaskjdaslkd/9I='
}
```

#### Authenticate with a Node and an App and a specific Node

Use to generate the authentication for a Flux node for a specific app on a specific node.

```bash
# authenticate with the network for a specific app at a specific ip
npx flux auth <app_name> --ip <node_ip=x.x.x.x:port>
```

### Get Dapp Details

#### Get Dapps

Use this command to get a list of all your dapps that are running on the network.

```bash
# get all dapps
npx flux getDapps
```

### Get Dapp

#### Full Details

Use this command to get the full details of a dapp running on the network.

```bash
# get details of a specific dapp
npx flux getDapp <app_name>
```

#### Nodes only

Use this command to get the IP addresses of the nodes that are running the app.

```bash
# get details of a specific dapp and show only the nodes
npx flux getDapp <app_name> --nodes
```

### Redeploy

#### Soft redeploy

Restart the app on all nodes that are running the app.

```bash
# redeploy the app
npx flux redeploy <app_name>
...
ℹ apiUrl: http://x.x.x.x:16127/id/verifylogin                                                                                                                                   deploy.js 15:00:42
ℹ { status: 'success',                                                                                                                                                                deploy.js 15:00:42
  data: { message: '<app_name> queried for global soft redeploy' } }
```

#### Hard redeploy

Remove the container and restart the app on all nodes that are running the app.

```bash
# hard redeploy the app
npx flux redeploy <app_name> --hard
...
ℹ apiUrl: http://x.x.x.x:16127/id/verifylogin                                                                                                                                   deploy.js 15:00:42
ℹ { status: 'success',                                                                                                                                                                deploy.js 15:00:42
  data: { message: '<app_name> queried for global hard redeploy' } }
```

### Logs

#### Get Logs

Use this command to get the logs of the app for all nodes.

```bash
# get logs of a specific dapp
npx flux getLogs <app_name>

┌─────────┬─────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────┐
│ (index) │               url               │                                              logs                                              │
├─────────┼─────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
│    0    │ 'http://x.x.x.x:16126/' │  '{"status":"success","data":"... ...'  │
│    1    │               ''                │ "d-0-...\\nApp running on port 9232\\n * Serving Flask app 'app'" │
│    2    │               ''                │                                  '\\n * Debug mode: off\\n"}'                                  │
│    3    │   'http://x.x.x.x:16186/'   │  '{"status":"success","data":"... ...'  │
│    4    │               ''                │ "d-0-...\\nApp running on port 9232\\n * Serving Flask app 'app'" │
│    5    │               ''                │                                  '\\n * Debug mode: off\\n"}'                                  │
│    6    │  'http://x.x.x.x:16126/'   │  '{"status":"success","data":"... ...'  │
│    7    │               ''                │ "d-0-...\\nApp running on port 9232\\n * Serving Flask app 'app'" │
│    8    │               ''                │                                  '\\n * Debug mode: off\\n"}'                                  │
│    9    │   'http://x.x.x.x:16146/'   │ '<html><body><h2>Flux Node is not confirmed on the network</h2>\nIt may take a few minutes f'  │
│   10    │               ''                │      'or your Flux Node to be available over domain.<br>\nEU-NODES-1-1\n</body></html>\n'      │
└─────────┴─────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────┘

```

#### Get Logs from a specific Node

Use this command to get the logs of the app from a specific node.

```bash
# get logs of a specific dapp at a specific ip
npx flux getLogs <app_name> --ip <node_ip=x.x.x.x:port>
```

#### Save the logs to a file

Use this command to get the logs of the app from a specific node.

```bash
# get logs of a specific dapp and save them to a file. The log format will be `host | log` with the logs separated by a newline
npx flux getLogs <app_name> --file <file_name>
```

#### Sign a Message

Use this command to sign a message with the private key of the node.

```bash
# sign a message
> npx flux sign <msg>
CLI:info {
  _: [ 'sign' ],
  '$0': 'node_modules/.bin/flux',
  msg: '<msg>'
}
CLI:info Public Key: 15...b
CLI:info Base64 Signature: H...=
```

### Format an env file

Use this command to format an env file in the array format needed for updating in FluxOS. The output will be printed to the terminal.

```bash
# format the env file
> npx flux formatenv .env
CLI:info ["FOO=bar","BAR=BLAH"]
```

You can write the output to a file by using the `--write` flag.

```bash
# format the env file and write the output to a file
> npx flux formatenv .env --write <file_name>
```
