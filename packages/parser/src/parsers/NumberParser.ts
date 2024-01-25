import { BaseParser, Parser } from "./Parser.js"

export class NumberParser extends BaseParser<number> {
    parse(value: unknown): number {
        if (typeof value !== 'number') {
            throw new Error(`Expected number but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value
    }

    override clone(): Parser<number> {
        return pNumber()
    }
}

export const pNumber = () => new NumberParser()