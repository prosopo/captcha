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

const MAX_ERROR_LENGTH = 1000

export function translateOrFallback(key: string, fallback?: string, i18n = i18next): string {
    try {
        if (key && translationKeys.includes(key as TranslationKey)) {
            return i18n.t(key)
        } else {
            return fallback || key
        }
    } catch {
        return fallback || key
    }
}

export abstract class ProsopoBaseError extends Error {
    debugInfo: any
    cause: Error | undefined
    context: string | undefined

    constructor(
        error: Error | TranslationKey | unknown,
        options?: { context?: TranslationKey | string; [key: string]: any }
    ) {
        // Check if error is an Error
        if (error instanceof Error) {
            super(error.message)
            this.cause = error

            // Add context if provided
            this.context = options?.context ? translateOrFallback(options.context) : undefined
        }

        // Check if error is a TranslationKey
        else if (typeof error === 'string') {
            super(translateOrFallback(error, `Translation key not found, original error: ${error}`))
        } else {
            super('Unknown error')
            this.debugInfo = { unknownError: error }
        }

        // Add options to debugInfo
        this.debugInfo = { ...this.debugInfo, options }
    }
}

export class ProsopoEnvError extends ProsopoBaseError {
    missingParams: string[]

    constructor(
        error: Error | TranslationKey | unknown,
        options?: { context?: TranslationKey | string; missingParams?: string[]; [key: string]: any }
    ) {
        super(error, options)
        this.name = 'ProsopoEnvError'
        this.missingParams = options?.missingParams || []
    }
}

export class ProsopoContractError extends ProsopoBaseError {
    constructor(
        error: Error | TranslationKey | unknown,
        options?: { context?: TranslationKey | string; [key: string]: any }
    ) {
        super(error, options)
        this.name = 'ProsopoContractError'
    }
}

export class ProsopoDBError extends ProsopoBaseError {
    constructor(
        error: Error | TranslationKey | unknown,
        options?: { context?: TranslationKey | string; [key: string]: any }
    ) {
        super(error, options)
        this.name = 'ProsopoDBError'
    }
}

export class ProsopoCliError extends ProsopoBaseError {
    constructor(
        error: Error | TranslationKey | unknown,
        options?: { context?: TranslationKey | string; [key: string]: any }
    ) {
        super(error, options)
        this.name = 'ProsopoCliError'
    }
}

export class ProsopoDatasetError extends ProsopoBaseError {
    constructor(
        error: Error | TranslationKey | unknown,
        options?: { context?: TranslationKey | string; [key: string]: any }
    ) {
        super(error, options)
        this.name = 'ProsopoDatasetError'
    }
}

export class ProsopoError extends ProsopoBaseError {
    constructor(
        error: Error | TranslationKey | unknown,
        options?: { context?: TranslationKey | string; [key: string]: any }
    ) {
        super(error, options)
        this.name = 'ProsopoError'
    }
}

export class ProsopoApiError extends ProsopoEnvError {
    code: number

    constructor(
        error: Error | TranslationKey | unknown,
        options?: { context?: TranslationKey | string; code?: number; [key: string]: any }
    ) {
        super(error, options)
        this.name = 'ProsopoApiError'
        this.code = options?.code ?? 500
    }
}
