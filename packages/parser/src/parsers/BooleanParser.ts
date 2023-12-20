import { BaseParser, ParseOptions, Parser } from "./Parser.js"

interface BooleanParserOptions {
    coerce?: boolean // coerce any value to a boolean, e.g. 1 -> true, 'false' -> false, etc.
}

class BooleanParser extends BaseParser<boolean, BooleanParserOptions> {
    override _parse(value: unknown, options?: BooleanParserOptions): boolean {
        if (
            options?.coerce
        ) {
            value = Boolean(value)
        }
        if (typeof value !== 'boolean') {
            throw new Error(`Expected boolean but got ${typeof value}: ${value}`)
        }
        return value
    }
}

export const pBoolean = (): Parser<boolean, BooleanParserOptions> => new BooleanParser()