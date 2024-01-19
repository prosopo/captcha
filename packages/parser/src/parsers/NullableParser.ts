import { BaseParser, Parser } from "./Parser.js"


export class NullableParser<T> extends BaseParser<T | null> {
    parse(value: unknown): T | null {
        if (value === null) {
            return null
        }
        throw new Error(`Expected null but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
    }
}

export const pNullable = () => new NullableParser()