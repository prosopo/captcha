import type { Compact } from '@polkadot/types-codec/base'
import type { u128 } from '@polkadot/types-codec/primitive'
import { ProsopoEnvError } from '@prosopo/common'
import { encodeStringAddress } from '@prosopo/provider'
import { PayeeSchema } from '@prosopo/types'
import { lodash } from '@prosopo/util/lodash'
import parser from 'cron-parser'
import type { ArgumentsCamelCase } from 'yargs'
import * as z from 'zod'

export const validateAddress = (
    argv: ArgumentsCamelCase
): { address: string } => {
    const address = encodeStringAddress(argv.address as string)

    return { address }
}

export const validateContract = (argv: ArgumentsCamelCase) => {
    const address = encodeStringAddress(argv.contract as string)

    return { address }
}

export const validatePayee = (argv: ArgumentsCamelCase) => {
    try {
        if (!argv.payee) return
        const _ = lodash()
        const payeeArg: string = _.capitalize(z.string().parse(argv.payee))
        const payee = PayeeSchema.parse(payeeArg)

        return { payee }
    } catch (error) {
        throw new ProsopoEnvError('CLI.PARAMETER_ERROR', {
            context: { payee: [argv.payee], error },
        })
    }
}

export const validateValue = (argv: ArgumentsCamelCase) => {
    if (typeof argv.value !== 'number') {
        throw new ProsopoEnvError('CLI.PARAMETER_ERROR', {
            context: { value: [argv.value] },
        })
    }
    const value: Compact<u128> = argv.value as unknown as Compact<u128>
    return { value }
}

export const validateFee = (argv: ArgumentsCamelCase) => {
    if (typeof argv.fee !== 'number') {
        throw new ProsopoEnvError('CLI.PARAMETER_ERROR', {
            context: { name: validateValue.name, fee: argv.fee },
        })
    }
    const fee: Compact<u128> = argv.fee as unknown as Compact<u128>
    return { fee }
}

export const validateScheduleExpression = (argv: ArgumentsCamelCase) => {
    if (typeof argv.schedule === 'string') {
        const result = parser.parseString(argv.schedule as string)

        if (argv.schedule in result.errors) {
            throw new ProsopoEnvError('CLI.PARAMETER_ERROR', {
                context: {
                    payee: [argv.shedule],
                    failedFuncName: validateScheduleExpression.name,
                },
            })
        }

        return { schedule: argv.schedule as string }
    }
    return { schedule: null }
}
