import { BaseParser, ParseOptions, Parser } from "./Parser.js"

interface BigIntParserOptions {
    coerce?: boolean // coerce any value to a boolean, e.g. 1 -> true, 'false' -> false, etc.
}
class BigIntParser extends BaseParser<bigint, BigIntParserOptions> {
    override _parse(value: unknown, options?: BigIntParserOptions): bigint {
        if (options?.coerce) {
            const t = typeof value
            const v = t === 'string' ? value as string : t === 'number' ? value as number : t === 'boolean' ? value as boolean : t === 'bigint' ? value as bigint : String(value)
            value = BigInt(v)
        }
        if (typeof value !== 'bigint') {
            throw new Error(`Expected bigint but got ${typeof value}`)
        }
        return value
    }
}

export const pBigInt = (): Parser<bigint, BigIntParserOptions> => new BigIntParser()