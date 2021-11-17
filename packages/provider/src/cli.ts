#!/usr/bin/env node
import {Environment} from './env'
import express from 'express'
import {prosopoMiddleware} from './api'
import {handleErrors} from './errorHandler'
import {encodeStringAddress} from './util'
// @ts-ignore
import yargs from 'yargs'

const app = express();
app.use(express.json())
const port = 3000;

async function main() {
    const env = new Environment();
    const args = argParse(process.argv.slice(2), env.contract);
    console.log(args);
    if (args.api) {
        app.use(prosopoMiddleware(env));
        app.use(handleErrors);
        app.listen(port, () => {
            console.log(`Prosopo app listening at http://localhost:${port}`)
        })
    }

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

const validateArgs = (argv) => {
    let address
    address = encodeStringAddress(argv.address)
    let payee = argv.payee[0].toUpperCase() + argv.payee.slice(1,).toLowerCase();
    payee = ["Provider", "Dapp"].indexOf(payee) > -1 ? payee : undefined;
    return {address, payee}
}

function argParse(args, contract) {

    function providerRegister(serviceOrigin, fee, payee, address) {
        console.log("providerRegister triggered");
    }

    var argv = require('yargs')
        .usage('Usage: $0 [options] <command> [options]')
        .option('api', {demand: false, default: false, type: 'boolean'})
        .command('provider_register', 'Register a Provider', (yargs) => {
                return yargs
                    .option('serviceOrigin', {type: 'string', demand: true,})
                    .option('fee', {type: 'number', demand: true,})
                    .option('payee', {type: 'string', demand: true,})
                    .option('address', {type: 'string', demand: true,})
            }, (argv) => {
                providerRegister(argv.serviceOrigin, argv.fee, argv.payee, argv.address)
            },
            [validateArgs]
        )
        .argv;
    return argv
}


main()
    .catch((error) => {
        console.error(error);
    });
