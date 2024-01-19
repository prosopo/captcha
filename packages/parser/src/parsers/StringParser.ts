import { BaseParser, Parser } from "./Parser.js"

export class StringParser extends BaseParser<string> {
    parse(value: unknown): string {
        if (typeof value !== 'string') {
            throw new Error(`Expected string but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value
    }
}

export const pString = () => new StringParser()