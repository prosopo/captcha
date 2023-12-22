import { BaseParser, ParserOptions, Parser } from "./Parser.js"

class BigIntParser extends BaseParser<bigint> {
    override _parse(value: unknown): bigint {
        if (typeof value !== 'bigint') {
            throw new Error(`Expected bigint but got ${typeof value}`)
        }
        return value
    }
}

export const pBigInt = (): BigIntParser => new BigIntParser()