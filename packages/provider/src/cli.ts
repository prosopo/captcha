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
}

main()
    .catch((error) => {
        console.error(error);
    });
