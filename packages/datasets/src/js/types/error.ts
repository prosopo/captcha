
import { TranslationKey, i18n, i18n as i18next, translationKeys } from '@prosopo/i18n'

export type TOptions = Record<string, string>

export function translateOrFallback(key: string | undefined, options?: TOptions, fallback?: string, i18n = i18next): string {
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
    protected tParams: Record<string, string>

    getTranslated(i18n: typeof i18next): string {
        return translateOrFallback(this.tKey, this.tParams, this.message, i18n)
    }
}

export class ProsopoEnvError extends ProsopoBaseError {
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
        console.error(this.cause, this.stack, ...params)
    }
}