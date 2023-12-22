import { BaseParser, Parser } from "./Parser.js"

class StringParser extends BaseParser<string> {
    override _parse(value: unknown): string {
        if (typeof value !== 'string') {
            throw new Error(`Expected string but got ${typeof value}`)
        }
        return value
    }
}

export const pString = (): StringParser => new StringParser()