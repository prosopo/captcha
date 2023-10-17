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
import { TranslationKey, i18n as i18next, translationKeys } from './index.js'
import { at } from '@prosopo/util'

export type TOptions = Record<string, string>
const MAX_ERROR_LENGTH = 1000

export function translateOrFallback(
    key: string | undefined,
    options?: TOptions,
    fallback?: string,
    i18n = i18next
): string {
    try {
        if (key) {
            return i18n.t(key, options)
        } else {
            return fallback || key!
        }
    } catch {
        return fallback || key!
    }
}

export abstract class ProsopoBaseError extends Error {
    protected tKey: TranslationKey | undefined
    protected tParams: Record<string, string> | undefined

    getTranslated(i18n: typeof i18next): string {
        return translateOrFallback(this.tKey, this.tParams, this.message, i18n)
    }
}

export class ProsopoEnvError extends ProsopoBaseError {
    cause: Error | undefined

    constructor(error: ProsopoBaseError)
    constructor(error: Error, context?: TranslationKey, options?: TOptions, ...params: any[])
    constructor(error: TranslationKey, context?: string, options?: TOptions, ...params: any[])

    constructor(
        error: Error | TranslationKey,
        context?: TranslationKey | string,
        options?: TOptions,
        ...params: any[]
    ) {
        const isError = error instanceof Error
        super(isError ? error.message : translateOrFallback(error, options))
        this.name =
            (context && `${ProsopoEnvError.name}@${translateOrFallback(context, options)}`) || ProsopoEnvError.name
        if (isError) {
            this.cause = error
            if (error instanceof ProsopoBaseError) {
                this.tKey = error['tKey']
                this.tParams = error['tParams']
            } else if (translationKeys.includes(context as TranslationKey)) {
                this.tKey = context as TranslationKey
                this.tParams = options || {}
            }
        } else {
            this.tKey = error as TranslationKey
            this.tParams = options || {}
        }

        console.error('\n********************* ERROR *********************\n')
        if (this.cause?.message && this.cause.message.length > MAX_ERROR_LENGTH) {
            this.cause.message = `${at(this.cause.message, -MAX_ERROR_LENGTH)}...`
        }
        console.error(this.cause?.message, ...params)
    }
}

export class ProsopoApiError extends ProsopoEnvError {
    code: number

    constructor(error: Error | TranslationKey, context?: string, code?: number, ...params: any[]) {
        const isError = error instanceof Error
        super(isError ? (error.message as TranslationKey) : error)
        this.code = code ? code : 500
        this.name = (context && `${ProsopoApiError.name}@${context}`) || ProsopoApiError.name

        console.error('\n********************* ERROR *********************\n')
        if (this.cause?.message && this.cause.message.length > MAX_ERROR_LENGTH) {
            this.cause.message = `${at(this.cause.message, -MAX_ERROR_LENGTH)}...`
        }
        console.error(this.cause?.message, ...params)
    }
}
