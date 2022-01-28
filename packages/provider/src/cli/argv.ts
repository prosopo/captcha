// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import yargs from 'yargs'
import { Compact, u128 } from '@polkadot/types'
import { encodeStringAddress } from '../util'
import { ERRORS } from '../errors'
import { Tasks } from '../tasks/tasks'
import { Payee } from '../types'

const validateAddress = (argv) => {
    const address = encodeStringAddress(argv.address as string)
    return { address }
}

// TODO use zod to validate CLI arguments
const validatePayee = (argv) => {
    const payeeArg: string = argv.payee[0].toUpperCase() + argv.payee.slice(1).toLowerCase() || ''
    const payee = ['Provider', 'Dapp'].indexOf(payeeArg) > -1 ? payeeArg : undefined
    return { payee }
}

const validateValue = (argv) => {
    if (typeof argv.value === 'number') {
        const value: Compact<u128> = argv.value as Compact<u128>
        return { value }
    }
    throw new Error(`${ERRORS.CLI.PARAMETER_ERROR.message}::value::${argv.value}`)
}

export function processArgs (args, env) {
    const tasks = new Tasks(env)
    return yargs
        .usage('Usage: $0 [global options] <command> [options]')
        .option('api', { demand: false, default: false, type: 'boolean' })
        .command(
            'provider_register',
            'Register a Provider',
            (yargs) => yargs
                .option('serviceOrigin', { type: 'string', demand: true })
                .option('fee', { type: 'number', demand: true })
                .option('payee', { type: 'string', demand: true })
                .option('address', { type: 'string', demand: true }),
            async (argv) => {
                const result = await tasks.providerRegister(argv.serviceOrigin as string, argv.fee as number, argv.payee as Payee, argv.address as string)
                console.log(JSON.stringify(result, null, 2))
            },
            [validateAddress, validatePayee]
        )
        .command(
            'provider_update',
            'Update a Provider',
            (yargs) => yargs
            // TODO make all of these optional so that user only has to supply minimum information
                .option('serviceOrigin', { type: 'string', demand: true })
                .option('fee', { type: 'number', demand: true })
                .option('payee', { type: 'string', demand: true })
                .option('address', { type: 'string', demand: true })
                .option('value', { type: 'number', demand: false }),
            async (argv) => {
                const result = await tasks.providerUpdate(argv.serviceOrigin as string, argv.fee as number, argv.payee as Payee, argv.address as string, argv.value as number)
                console.log(JSON.stringify(result, null, 2))
            },
            [validateAddress, validatePayee]
        )
        .command(
            'provider_deregister',
            'Deregister a Provider',
            (yargs) => yargs
                .option('address', { type: 'string', demand: true }),
            async (argv) => {
                try {
                    const result = await tasks.providerDeregister(argv.address as string)
                    console.log(JSON.stringify(result, null, 2))
                } catch (err) {
                    console.log(err)
                }
            },
            [validateAddress]
        )
        .command(
            'provider_unstake',
            'Unstake funds as a Provider',
            (yargs) => yargs
                .option('value', { type: 'number', demand: true }),
            async (argv) => {
                try {
                    const result = await tasks.providerUnstake(argv.value as number)
                    console.log(JSON.stringify(result, null, 2))
                } catch (err) {
                    console.log(err)
                }
            },
            [validateValue]
        )
        .command(
            'provider_add_data_set',
            'Add a dataset as a Provider',
            (yargs) => yargs
                .option('file', { type: 'string', demand: true }),
            async (argv) => {
                try {
                    const result = await tasks.providerAddDataset(argv.file as string)
                    console.log(JSON.stringify(result, null, 2))
                } catch (err) {
                    console.log(err)
                }
            },
            []
        )
        .command(
            'provider_accounts',
            'List provider accounts',
            (yargs) => yargs
                .option('providerId', { type: 'string', demand: false })
                .option('status', { type: 'string', demand: false }),
            async () => {
                try {
                    const result = await tasks.getProviderAccounts()
                    console.log(JSON.stringify(result, null, 2))
                } catch (err) {
                    console.log(err)
                }
            },
            []
        )
        .argv
}
