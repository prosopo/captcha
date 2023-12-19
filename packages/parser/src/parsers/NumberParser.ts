import { BaseParser, ParseOptions, Parser } from "./Parser.js"

class NumberParser extends BaseParser<number> {
    override _parse(value: unknown, options?: ParseOptions): number {
        if (options?.coerce) {
            value = Number(value)
        }
        if (typeof value !== 'number') {
            throw new Error(`Expected number but got ${typeof value}`)
        }
        return value
    }
}

export const pNumber = (): Parser<number> => new NumberParser()