import { BaseParser } from "./Parser.js"

export class BigIntParser extends BaseParser<bigint> {
    parse(value: unknown): bigint {
        if (typeof value !== 'bigint') {
            throw new Error(`Expected boolean but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value
    }
}

export const pBigInt = () => new BigIntParser()