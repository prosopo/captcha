#!/usr/bin/env node
import {Environment} from './env'
import express from 'express'
import {prosopoMiddleware} from './api'
import {handleErrors} from './errorHandler'
import {encodeStringAddress} from './util'
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

const validateAddress = (argv) => {
    let address
    address = encodeStringAddress(argv.address)
    return {address}
}

const validatePayee = (argv) => {
    let payee = argv.payee[0].toUpperCase() + argv.payee.slice(1,).toLowerCase();
    payee = ["Provider", "Dapp"].indexOf(payee) > -1 ? payee : undefined;
    return {payee}
}

async function argParse(args, contractApi) {
    const argv = require('yargs')
        .usage('Usage: $0 [global options] <command> [options]')
        .option('api', {demand: false, default: false, type: 'boolean'})
        .command('provider_register', 'Register a Provider', (yargs) => {
                return yargs
                    .option('serviceOrigin', {type: 'string', demand: true,})
                    .option('fee', {type: 'number', demand: true,})
                    .option('payee', {type: 'string', demand: true,})
                    .option('address', {type: 'string', demand: true,})
            }, async (argv) => {
                let result = await contractApi.providerRegister(argv.serviceOrigin, argv.fee, argv.payee, argv.address)
                console.log(result);
            },
            [validateAddress, validatePayee]
        )
        .command('provider_deregister', 'Deregister a Provider', (yargs) => {
                return yargs
                    .option('address', {type: 'string', demand: true,})
            }, async (argv) => {
                try {
                    console.log("deregistering");
                    let result = await contractApi.providerDeregister(argv.address);
                    console.log("deregister result");
                    console.log(JSON.stringify(result));
                } catch (err) {
                    console.log(err);
                }
            },
            [validateAddress]
        )
        .argv;
    return argv
}


main()
    .catch((error) => {
        console.error(error);
    });
