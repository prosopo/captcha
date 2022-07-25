# Getting Started with the Client Example

This project is a *minimal* example demonstrating how to include the Prosopo human verification system in a client app.

## Prerequisites

You will need to have access to a substrate node with the [protocol contract](https://github.com/prosopo-io/protocol) and also a [provider API instance](https://github.com/prosopo-io/provider) to run the demo. Follow the [development environment set up instructions in our integration repository](https://github.com/prosopo-io/integration#development-environment-set-up) to spin up the required containers.

## Config

The following env vars will need to be set in a `.env` file for this example to run.

```bash
REACT_APP_API_BASE_URL
REACT_APP_API_PATH_PREFIX
REACT_APP_DAPP_CONTRACT_ADDRESS
```

If using the [integration development environment](https://github.com/prosopo-io/integration#development-environment-set-up), these variables will be as follows:

```bash
REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_API_PATH_PREFIX=/v1/prosopo
REACT_APP_DAPP_CONTRACT_ADDRESS=5Go2hCf1WHzKqt1HGCUwhKfUS85477HUHgvaKkMJRYBfyiUP
```

## Usage

The captcha component is created using the React package [procaptcha-react](https://github.com/prosopo-io/procaptcha-react).

## Available Scripts

In the project directory, you can run:

#### `npm start`

Runs the app in the development mode.
Open [http://localhost:3001](http://localhost:3001) to view it in the browser.

The page will reload if you make edits.
You will also see any lint errors in the console.


