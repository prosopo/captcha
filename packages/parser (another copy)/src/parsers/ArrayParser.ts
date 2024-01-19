import { BaseParser, Parser } from "./Parser.js"

export class ArrayParser<T> extends BaseParser<T[]> {

    constructor(private parser: Parser<T>) {
        super()
    }

    parse(value: unknown): T[] {
        if (Array.isArray(value)) {
            const array = value as unknown[]
            return array.map(item => this.parser.parse(item))
        }
        throw new Error(`Expected array but got ${typeof value}`)
    }
}

