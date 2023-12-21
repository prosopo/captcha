import { BaseParser, ParserOptions, Parser } from "./Parser.js"

class NumberParser extends BaseParser<number> {
    override _parse(value: unknown): number {
        if (typeof value !== 'number') {
            throw new Error(`Expected number but got ${typeof value}`)
        }
        return value
    }
}

export const pNumber = (): Parser<number> => new NumberParser()