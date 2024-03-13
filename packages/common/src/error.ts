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
import { LogLevel, Logger, TranslationKey, getLoggerDefault, i18n as i18next } from './index.js'

type BaseErrorOptions<ContextType> = {
    name?: string
    translationKey?: TranslationKey
    logger?: Logger
    logLevel?: LogLevel
    context?: ContextType
    silent?: boolean
}

interface BaseContextParams {
    [key: string]: any
    failedFuncName?: string
}

type EnvContextParams = BaseContextParams & { missingEnvVars?: string[] }
type ContractContextParams = BaseContextParams
type DBContextParams = BaseContextParams & { captchaId?: string[] }
type CliContextParams = BaseContextParams
type DatasetContextParams = BaseContextParams
type ApiContextParams = BaseContextParams & { code?: number }

export abstract class ProsopoBaseError<ContextType extends BaseContextParams = BaseContextParams> extends Error {
    translationKey: string | undefined
    context: ContextType | undefined

    constructor(error: Error | TranslationKey, options?: BaseErrorOptions<ContextType>) {
        const logger = options?.logger || getLoggerDefault()
        const logLevel = options?.logLevel || 'error'

        if (error instanceof Error) {
            super(error.message)
            this.translationKey = options?.translationKey
            this.context = {
                ...(options?.context as ContextType),
                ...(options?.translationKey ? { translationMessage: i18next.t(options.translationKey) } : {}),
            }
        } else {
            super(i18next.t(error))
            this.translationKey = error
            this.context = options?.context
        }
        if (options?.silent) this.logError(logger, logLevel)
    }

    private logError(logger: Logger, logLevel: LogLevel) {
        const errorFormatter = '\n*************** ERROR ***************\n'
        const errorName = `Error Type: ${this.name}\n`
        const errorParams = JSON.stringify({ error: this.message, context: this.context })
        const errorMessage = `${errorFormatter}${errorName}${errorParams}`
        logger[logLevel](errorMessage)
    }
}

// Generic error class
export class ProsopoError extends ProsopoBaseError<BaseContextParams> {
    constructor(error: Error | TranslationKey, options?: BaseErrorOptions<BaseContextParams>) {
        const errorName = options?.name || 'ProsopoError'
        options = { ...options, name: errorName }
        super(error, options)
    }
}

export class ProsopoEnvError extends ProsopoBaseError<EnvContextParams> {
    constructor(error: Error | TranslationKey, options?: BaseErrorOptions<EnvContextParams>) {
        const errorName = options?.name || 'ProsopoEnvError'
        options = { ...options, name: errorName }
        super(error, options)
    }
}

export class ProsopoContractError extends ProsopoBaseError<ContractContextParams> {
    constructor(error: Error | TranslationKey, options?: BaseErrorOptions<ContractContextParams>) {
        const errorName = options?.name || 'ProsopoContractError'
        options = { ...options, name: errorName }
        super(error, options)
    }
}

export class ProsopoDBError extends ProsopoBaseError<DBContextParams> {
    constructor(error: Error | TranslationKey, options?: BaseErrorOptions<DBContextParams>) {
        const errorName = options?.name || 'ProsopoDBError'
        options = { ...options, name: errorName }
        super(error, options)
    }
}

export class ProsopoCliError extends ProsopoBaseError<CliContextParams> {
    constructor(error: Error | TranslationKey, options?: BaseErrorOptions<CliContextParams>) {
        const errorName = options?.name || 'ProsopoCliError'
        options = { ...options, name: errorName }
        super(error, options)
    }
}

export class ProsopoDatasetError extends ProsopoBaseError<DatasetContextParams> {
    constructor(error: Error | TranslationKey, options?: BaseErrorOptions<DatasetContextParams>) {
        const errorName = options?.name || 'ProsopoDatasetError'
        options = { ...options, name: errorName }
        super(error, options)
    }
}

export class ProsopoApiError extends ProsopoBaseError<ApiContextParams> {
    code: number

    constructor(error: Error | TranslationKey, options?: BaseErrorOptions<ApiContextParams>) {
        const errorName = options?.name || 'ProsopoApiError'
        const errorCode = options?.context?.code || 500
        options = { ...options, name: errorName, context: { ...options?.context, errorCode } }
        super(error, options)
        this.code = errorCode
    }
}
