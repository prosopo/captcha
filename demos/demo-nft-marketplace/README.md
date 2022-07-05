## What is CornerStore?

CornerStore is an open source NFT marketplace built by Rarible DAO using the Rarible Protocol. Prosopo has forked and modified the marketplace to work with [OpenBrush's PSP34 contracts](https://github.com/Supercolony-net/openbrush-contracts/tree/main/examples/psp34). The PSP34 contracts have also been modified so that they are [protected](https://github.com/prosopo-io/demo-nft-marketplace/blob/57fe32a36d2988d3076835fc3ebe3a4dad60efa3/contracts/lib.rs#L209) by Prosopo's human verification system.

### Demo

[Checkout the demo app!](https://naughty-easley-e107df.netlify.app/)

<img width="500" alt="Screen Shot 2021-11-16 at 1 37 43 PM" src="https://user-images.githubusercontent.com/24348787/142053850-fb9494c3-66fa-4833-b2c7-87a121f4cdee.png">
<img width="500" alt="Screen Shot 2021-11-16 at 1 37 57 PM" src="https://user-images.githubusercontent.com/24348787/142053834-311a610b-cd35-414a-93c8-b4815b639d10.png">

### Figma 

Feel free to fork our design files to start redesigning the marketplace.
[Figma Design Files](https://www.figma.com/file/USlp6KamaA2H7wWPgfgi2i/Rarible?node-id=834%3A4572)

### Deploy

1. To deploy on Netlify just click the button below 👇

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Screensaver-world/RaribleProtocol-Interface)

2. Replace these inputs with the correct information. These will be added to your .env variables. 
    
<img width="407" alt="Screen Shot 2021-11-25 at 8 22 17 PM" src="https://user-images.githubusercontent.com/24348787/143517507-4ea99dac-3826-477f-bd07-9f0cfe24bd00.png">
    
3. Wait for deployment and your marketplace should be ready to go!

### How to run locally.

```bash
npm install

npm run setup

npm run dev
```
