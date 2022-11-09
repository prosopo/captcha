// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of contract <https://github.com/prosopo/contract>.
//
// contract is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// contract is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with contract. If not, see <http://www.gnu.org/licenses/>.
import { DispatchError } from '@polkadot/types/interfaces'
import { ProsopoBaseError, TOptions, translateOrFallback } from '@prosopo/datasets'
import { TranslationKey, i18n, translationKeys } from '@prosopo/i18n'

export class ProsopoContractError extends ProsopoBaseError {
    constructor(error: DispatchError, context?: string, options?: TOptions, ...params: any[])
    constructor(error: DispatchError, context?: TranslationKey, options?: TOptions, ...params: any[])
    constructor(error: string, context?: string, options?: TOptions, ...params: any[])
    constructor(error: TranslationKey, context?: string, options?: TOptions, ...params: any[])

    constructor(
        error: DispatchError | string,
        context?: TranslationKey | string,
        options?: TOptions,
        ...params: any[]
    ) {
        if (typeof error === 'string') {
            super(translateOrFallback(error, options, error, i18n))
            if (translationKeys.includes(error as TranslationKey)) {
                this.tKey = context as TranslationKey
            }
        } else {
            const mod = error.asModule
            const dispatchError = error.registry.findMetaError(mod)
            super(`${dispatchError.section}.${dispatchError.name}`)
            if (translationKeys.includes(context as TranslationKey)) {
                this.tKey = context as TranslationKey
            }
        }
        this.tParams = options || {}

        this.name = (context && `${ProsopoContractError.name}@${context}`) || ProsopoContractError.name
        console.error('\n********************* ERROR *********************\n')
        console.error(error, this.stack, ...params)
    }
}
