import {Environment} from './env'
import express from 'express'
const app = express();
const port = 3000;
import {prosopoMiddleware} from './api';

async function main() {
    const env = new Environment();
    await env.contract;
    app.use(prosopoMiddleware(env.contract, env.db))
    app.listen(port, () => {
        console.log(`Prosopo app listening at http://localhost:${port}`)
    })

    // RUN COMMANDS - which ones need to be exposed on CLI?
    // provider register
    // provider stake
    // provider unstake
    // provider update
    // provider deregsiter
    // provider add data set (blockchain)
    // provider approve
    // provider disapprove
    // dapp register
    // dapp update
    // dapp fund
    // dapp cancel
    // dapp deregister
    // dappuser send solution

}

main()
    .catch((error) => {
        console.error(error);
    });
