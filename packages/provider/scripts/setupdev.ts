import {Environment} from '../src/env'
// @ts-ignore
import yargs from 'yargs'
import BN from "bn.js";
import {approveOrDisapproveCommitment, sendFunds, setupDapp, setupDappUser, setupProvider} from "../tests/mocks/setup";

require('dotenv').config()

export const PROVIDER = {
    serviceOrigin: "http://localhost:8282",
    fee: 10,
    payee: "Provider",
    stake: 10,
    datasetFile: '/usr/src/data/captchas.json',
    datasetHash: undefined,
    mnemonic: process.env.PROVIDER_MNEMONIC,
    address: process.env.PROVIDER_ADDRESS
}

export const DAPP = {
    serviceOrigin: "http://localhost:9393",
    mnemonic: "//Ferdie",
    contractAccount: process.env.DAPP_CONTRACT_ADDRESS,
    optionalOwner: "5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL", //Ferdie's address
    fundAmount: 100
}

export const DAPP_USER = {
    mnemonic: "//Charlie",
}

/*
 * Seed the contract with some dummy data
 */
async function run() {
    const env = new Environment("//Alice");
    await env.isReady();
    if (PROVIDER.mnemonic) {
        await processArgs(env);
    }
    process.exit();
}

function processArgs(env) {
    return yargs
        .usage('Usage: $0 [global options] <command> [options]')
        .command('provider', 'Setup a Provider', (yargs) => {
                return yargs
            }, async (argv) => {
                // @ts-ignore
                const providerKeyringPair = env.network.keyring.addFromMnemonic(PROVIDER.mnemonic.toString());
                await sendFunds(env, providerKeyringPair.address, 'Provider', new BN("100000000000000000"));
                await setupProvider(env, providerKeyringPair.address, PROVIDER)
            },
        )
        .command('dapp', 'Setup a Dapp', (yargs) => {
                return yargs
            }, async (argv) => {
                await setupDapp(env, DAPP);
            },
        )
        .command('user', 'Submit and approve Dapp User solution commitments', (yargs) => {
                return yargs
                    .option('approve', {type: 'boolean', demand: false,})
                    .option('disapprove', {type: 'boolean', demand: false,})
            }, async (argv) => {
                const solutionHash = await setupDappUser(env, DAPP_USER, PROVIDER, DAPP);
                if (argv.approve || argv.disapprove) {
                    await approveOrDisapproveCommitment(env, solutionHash, argv.approve, PROVIDER);
                }
            },
        )
        .argv
}


run().catch((err) => {
    console.log(err);
    throw new Error(`Setup dev error`);
});