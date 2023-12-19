import { BaseParser, ParseOptions, Parser } from "./Parser.js"


export class EnumParser2<const U extends string | number | symbol, const T extends readonly U[]> extends BaseParser<
    T[number]
> {
    constructor(private values: T) {
        super()
    }

    _parse(value: unknown, options?: ParseOptions): T[number] {
        // check runtime type
        if (!this.values.includes(value as U)) {
            throw new Error(`Expected enum value to be one of ${this.values.join(', ')} but got ${value}`)
        }
        return value as U
    }

    get options(): Readonly<T[number][]> {
        return this.values
    }

    get enum() {
        const result = {} as {
            [K in T[number]]: K
        }
        for (const value of this.values) {
            result[value] = value
        }
        return result
    }
}

export const pEnum2 = <const U extends string | number | symbol, const T extends readonly U[]>(values: T): Parser<U> => new EnumParser2(values)