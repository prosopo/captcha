import { Compact, u128 } from '@polkadot/types'
import { PayeeSchema } from '@prosopo/types'
import { ProsopoEnvError } from '@prosopo/common'
import { encodeStringAddress } from '@prosopo/provider'
import parser from 'cron-parser'

export const validateAddress = (argv): { address: string } => {
    const address = encodeStringAddress(argv.address as string)

    return { address }
}

export const validateContract = (argv) => {
    const address = encodeStringAddress(argv.contract as string)

    return { address }
}

export const validatePayee = (argv) => {
    try {
        if (!argv.payee) return
        const payeeArg: string = argv.payee[0].toUpperCase() + argv.payee.slice(1).toLowerCase() || ''
        const payee = PayeeSchema.parse(payeeArg)

        return { payee }
    } catch (error) {
        throw new ProsopoEnvError(error, 'CLI.PARAMETER_ERROR', {}, [argv.payee])
    }
}

export const validateValue = (argv) => {
    if (typeof argv.value !== 'number') {
        throw new ProsopoEnvError('CLI.PARAMETER_ERROR', validateValue.name, {}, argv.value)
    }
    const value: Compact<u128> = argv.value as Compact<u128>
    return { value }
}

export const validateFee = (argv) => {
    if (typeof argv.fee !== 'number') {
        throw new ProsopoEnvError('CLI.PARAMETER_ERROR', validateValue.name, {}, argv.fee)
    }
    const fee: Compact<u128> = argv.fee as Compact<u128>
    return { fee }
}

export const validateScheduleExpression = (argv) => {
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
