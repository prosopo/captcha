import { BaseParser, Parser } from "./Parser.js"

export class NumberParser extends BaseParser<number> {
    parse(value: unknown): number {
        if (typeof value !== 'number') {
            throw new Error(`Expected number but got ${JSON.stringify(value)} of type ${typeof value}`)
        }
        return value
    }
}

export const pNumber = () => new NumberParser()