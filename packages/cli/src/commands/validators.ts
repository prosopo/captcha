// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import * as z from 'zod'
import type { ArgumentsCamelCase } from 'yargs'
import type { Compact } from '@polkadot/types-codec/base'
import { PayeeSchema } from '@prosopo/types'
import { ProsopoEnvError } from '@prosopo/common'
import { encodeStringAddress } from '@prosopo/provider'
import { lodash } from '@prosopo/util/lodash'
import type { u128 } from '@polkadot/types-codec/primitive'
import parser from 'cron-parser'

export const validateAddress = (argv: ArgumentsCamelCase): { address: string } => {
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
        throw new ProsopoEnvError('CLI.PARAMETER_ERROR', { context: { payee: [argv.payee], error } })
    }
}

export const validateValue = (argv: ArgumentsCamelCase) => {
    if (typeof argv.value !== 'number') {
        throw new ProsopoEnvError('CLI.PARAMETER_ERROR', { context: { value: [argv.value] } })
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
                context: { payee: [argv.shedule], failedFuncName: validateScheduleExpression.name },
            })
        }

        return { schedule: argv.schedule as string }
    } else {
        return { schedule: null }
    }
}
