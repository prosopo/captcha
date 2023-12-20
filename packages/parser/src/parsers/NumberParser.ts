import { BaseParser, ParseOptions, Parser } from "./Parser.js"

interface NumberParserOptions {
    coerce?: boolean // coerce any value to a boolean, e.g. 1 -> true, 'false' -> false, etc.
}

class NumberParser extends BaseParser<number, NumberParserOptions> {
    override _parse(value: unknown, options?: NumberParserOptions): number {
        if (options?.coerce) {
            value = Number(value)
        }
        if (typeof value !== 'number') {
            throw new Error(`Expected number but got ${typeof value}`)
        }
        return value
    }
}

export const pNumber = (): Parser<number, NumberParserOptions> => new NumberParser()