## What is the Demo NFT Marketplace?

The Demo NFT Marketplace is an open source NFT marketplace built by Rarible DAO using the Rarible Protocol. Prosopo has
forked and modified the marketplace to work
with [OpenBrush's PSP34 contracts](https://github.com/Supercolony-net/openbrush-contracts/tree/main/examples/psp34). The
PSP34 contracts have also been modified so that they
are [protected](https://github.com/prosopo-io/demo-nft-marketplace/blob/57fe32a36d2988d3076835fc3ebe3a4dad60efa3/contracts/lib.rs#L209)
by Prosopo's human verification system.

### Demo

[Checkout the demo app!](https://nft.demo.prosopo.io/)

<img alt="Main demo page" src="https://raw.githubusercontent.com/prosopo-io/demo-nft-marketplace/article/.github/images/screenshot1.png">
<img alt="Product demo page" src="https://raw.githubusercontent.com/prosopo-io/demo-nft-marketplace/article/.github/images/screenshot2.png">

### How to run locally

#### 1. Install packages and set up environment variables

```bash
npm install

npm run setup
```

#### 2. Fund your test account

##### 2a. Wallet Setup

You will need to have a test account present in a polkadot wallet. Choose either
[talisman](https://chrome.google.com/webstore/detail/talisman-polkadot-wallet/fijngjgcjhjmmpcmkeiomlglpeiijkld)
, [subwallet](https://chrome.google.com/webstore/detail/subwallet-polkadot-extens/onhogfjeacnfoofkfgppdlbmlmnplgbn)
or [polkadotjs](https://polkadot.js.org/extension/). Please only install *one* wallet in your browser! Once you have
installed a wallet, create an account.

##### 2b. Send some funds to your wallet

Go to [polkadot apps](https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/accounts) and select the
development endpoint (`ws://localhost:9944`).

![Select endpoint](assets/img-endpoint.png)

Send some funds from one of the test accounts (Alice etc.) to your test account.

![Send funds](assets/img-send-funds.png)

#### 3. Start the app

```bash
npm run dev
```

### How it works

The NFT marketplace is composed of two parts - the website and the smart contract backend. A user is requested to
connect their web3 account when they enter the marketplace.

![Selecting an account](https://raw.githubusercontent.com/prosopo-io/demo-nft-marketplace/article/.github/images/screenshot3.png)

Once an account has been selected they can begin the purchase process. Upon clicking buy, the website frontend checks if
the user's account has previously completed captcha challenges by calling
the [prosopo protocol contract](https://github.com/prosopo-io/protocol/). If the user has answered the majority of
previous captcha challenges correctly within a certain timeframe, they will be allowed to purchase an NFT. Otherwise,
they will be shown a captcha challenge.

#### `is_human` checks in Dapp frontend website

The frontend checks the `is_human` function in the protocol contract before it allows the user to purchase.

https://github.com/prosopo-io/demo-nft-marketplace/blob/65669d7d3909bb287718b028e95e013f1c29ee78/src/components/Modal/CheckoutModal.tsx#L49-L59

#### `is_human` checks in NFT Contract

There are additional checks in the NFT marketplace smart contract that prevent the user from calling the NFT marketplace
contract directly, bypassing the frontend checks.

The threshold number of captcha that the user must correctly answer is set to 80% within the last 5 minutes. In this
example, the values are fixed in the NFT contract however they could reside elsewhere.

https://github.com/prosopo-io/demo-nft-marketplace/blob/65669d7d3909bb287718b028e95e013f1c29ee78/contracts/lib.rs#L78-L79

https://github.com/prosopo-io/demo-nft-marketplace/blob/65669d7d3909bb287718b028e95e013f1c29ee78/contracts/lib.rs#L203-L217

https://github.com/prosopo-io/demo-nft-marketplace/blob/65669d7d3909bb287718b028e95e013f1c29ee78/contracts/lib.rs#L186-L200

### Flow

The entire process flow can be visualised as follows.

![Main CAPTCHA flow](https://www.prosopo.io/static/maincaptchaflow.jpg)
