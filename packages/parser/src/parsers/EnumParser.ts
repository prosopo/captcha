import { BaseParser, ParseOptions } from "./Parser.js"

export type EnumVariant = string | number

export type EnumMap<U extends EnumVariant, T extends Readonly<U[]>> = {
    [K in T[number]]: K
}

export class EnumParser<U extends EnumVariant, T extends ReadonlyArray<U>> extends BaseParser<T[number]> {
    readonly #options: T

    constructor(options: T) {
        super()
        this.#options = options
    }

    parseShape(value: unknown, options?: ParseOptions): T[number] {
        // check runtime type
        if (!this.options.includes(value as U)) {
            throw new Error(`Expected enum option to be one of ${this.options.join(', ')} but got ${value}`)
        }
        return value as U
    }

    get options(): Readonly<T[number][]> {
        return this.#options
    }

    get enum() {
        const result = {} as {
            [K in T[number]]: K
        }
        for (const value of this.options) {
            result[value] = value
        }
        return result
    }
}
