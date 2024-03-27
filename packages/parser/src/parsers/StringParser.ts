import { BaseParser, ParseOptions, Parser } from "./Parser.js"

interface StringParserOptions {
    coerce?: boolean // coerce any value to a boolean, e.g. 1 -> true, 'false' -> false, etc.
}
class StringParser extends BaseParser<string, StringParserOptions> {
    override _parse(value: unknown, options?: ParseOptions): string {
        if (options?.coerce) {
            value = String(value)
        }
        if (typeof value !== 'string') {
            throw new Error(`Expected string but got ${typeof value}`)
        }
        return value
    }
}

export const pString = (): Parser<string, StringParserOptions> => new StringParser()