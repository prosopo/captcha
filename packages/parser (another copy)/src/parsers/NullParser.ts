import { BaseParser, Parser } from "./Parser.js"


export class NullParser<T> extends BaseParser<T | null> {
    constructor(private parser: Parser<T>) {
        super()
    }

    parse(value: unknown): T | null {
        if (value === null) {
            return null
        }
        return this.parser.parse(value)
    }
}