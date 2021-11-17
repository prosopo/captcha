#!/usr/bin/env node
import {Environment} from './env'
import express from 'express'
import {prosopoMiddleware} from './api'
import {handleErrors} from './errorHandler'
import {argParse} from './argv'
import {contractApiInterface} from './contract'
// @ts-ignore
import yargs from 'yargs'

const app = express();
app.use(express.json())
const port = 3000;

async function main() {
    const env = new Environment();
    await env.isReady();
    const contractApi = new contractApiInterface(env);
    const args = await argParse(process.argv.slice(2), contractApi);

    if (args.api) {
        app.use(prosopoMiddleware(env));
        app.use(handleErrors);
        app.listen(port, () => {
            console.log(`Prosopo app listening at http://localhost:${port}`)
        })
    }
}


main()
    .catch((error) => {
        console.error(error);
    });
