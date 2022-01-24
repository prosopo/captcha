import { Environment } from '../src/env'
// @ts-ignore
import yargs from 'yargs'
import BN from 'bn.js'
import { approveOrDisapproveCommitment, sendFunds, setupDapp, setupDappUser, setupProvider } from '../tests/mocks/setup'
import { Payee } from '../src/types'
import { KeyringInstance, KeyringPair } from '@polkadot/keyring/types'

require('dotenv').config()

const ENVVARS = ['PROVIDER_MNEMONIC', 'PROVIDER_ADDRESS', 'DAPP_CONTRACT_ADDRESS']

export const PROVIDER = {
    serviceOrigin: 'http://localhost:8282',
    fee: 10,
    payee: Payee.Provider,
    stake: 10,
    datasetFile: '/usr/src/data/captchas.json',
    datasetHash: undefined,
    mnemonic: process.env.PROVIDER_MNEMONIC || '',
    address: process.env.PROVIDER_ADDRESS || '',
    captchaDatasetId: ''
}

export const DAPP = {
    serviceOrigin: 'http://localhost:9393',
    mnemonic: '//Ferdie',
    contractAccount: process.env.DAPP_CONTRACT_ADDRESS || '',
    optionalOwner: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL', // Ferdie's address
    fundAmount: 100
}

export const DAPP_USER = {
    mnemonic: '//Charlie',
    address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'
}

/*
 * Seed the contract with some dummy data
 */
async function run () {
    const env = new Environment('//Alice')
    await env.isReady()
    ENVVARS.map(envvar => {
        if (!envvar) {
            throw new Error(`Environment Variable ${envvar} is not set`)
        }
        return undefined
    })
    await processArgs(env)
    process.exit()
}

function processArgs (env) {
    return yargs
        .usage('Usage: $0 [global options] <command> [options]')
        .command('provider', 'Setup a Provider', (yargs) => {
            return yargs
        }, async () => {
            const providerKeyringPair: KeyringPair = env.network.keyring.addFromMnemonic(PROVIDER.mnemonic)
            await sendFunds(env, providerKeyringPair.address, 'Provider', new BN('100000000000000000'))
            await setupProvider(env, providerKeyringPair.address, PROVIDER)
        }
        )
        .command('dapp', 'Setup a Dapp', (yargs) => {
            return yargs
        }, async () => {
            await setupDapp(env, DAPP)
        }
        )
        .command('user', 'Submit and approve Dapp User solution commitments', (yargs) => {
            return yargs
                .option('approve', { type: 'boolean', demand: false })
                .option('disapprove', { type: 'boolean', demand: false })
        }, async (argv) => {
            const solutionHash: string | undefined = await setupDappUser(env, DAPP_USER, PROVIDER, DAPP)
            if ((argv.approve || argv.disapprove) && solutionHash !== undefined) {
                await approveOrDisapproveCommitment(env, solutionHash, argv.approve as boolean, PROVIDER)
            }
        }
        )
        .argv
}

run().catch((err) => {
    console.log(err)
    throw new Error('Setup dev error')
})
