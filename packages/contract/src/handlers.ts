// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import { DispatchError } from '@polkadot/types/interfaces'
import { ProsopoBaseError, TOptions, translateOrFallback } from '@prosopo/common'
import { TranslationKey, i18n, translationKeys } from '@prosopo/common'

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
