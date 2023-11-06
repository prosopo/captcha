import { ArgumentsCamelCase } from 'yargs'
import { Compact } from '@polkadot/types-codec/base'
import { PayeeSchema } from '@prosopo/types'
import { ProsopoEnvError } from '@prosopo/common'
import { encodeStringAddress } from '@prosopo/provider'
import { u128 } from '@polkadot/types-codec/primitive'
import { z } from 'zod'
import parser from 'cron-parser'

export const validateAddress = (argv: ArgumentsCamelCase): { address: string } => {
    const address = encodeStringAddress(argv.address as string)

    return { address }
}

export const validateContract = (argv: ArgumentsCamelCase) => {
    const address = encodeStringAddress(argv.contract as string)

    return { address }
}

function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
}

export const validatePayee = (argv: ArgumentsCamelCase) => {
    try {
        if (!argv.payee) return
        const payeeArg: string = capitalizeFirstLetter(z.string().parse(argv.payee))
        const payee = PayeeSchema.parse(payeeArg)

        return { payee }
    } catch (error) {
        throw new ProsopoEnvError(error as Error, 'CLI.PARAMETER_ERROR', {}, [argv.payee])
    }
}

export const validateValue = (argv: ArgumentsCamelCase) => {
    if (typeof argv.value !== 'number') {
        throw new ProsopoEnvError('CLI.PARAMETER_ERROR', validateValue.name, {}, argv.value)
    }
    const value: Compact<u128> = argv.value as unknown as Compact<u128>
    return { value }
}

export const validateFee = (argv: ArgumentsCamelCase) => {
    if (typeof argv.fee !== 'number') {
        throw new ProsopoEnvError('CLI.PARAMETER_ERROR', validateValue.name, {}, argv.fee)
    }
    const fee: Compact<u128> = argv.fee as unknown as Compact<u128>
    return { fee }
}

export const validateScheduleExpression = (argv: ArgumentsCamelCase) => {
    if (typeof argv.schedule === 'string') {
        const result = parser.parseString(argv.schedule as string)

        if (argv.schedule in result.errors) {
            throw new ProsopoEnvError('CLI.PARAMETER_ERROR', validateScheduleExpression.name, {}, [argv.schedule])
        }

        return { schedule: argv.schedule as string }
    } else {
        return { schedule: null }
    }
}
