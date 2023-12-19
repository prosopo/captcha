import { BaseParser, ParseOptions, Parser } from "./Parser.js"


export class ArrayParser<T> extends BaseParser<T[]> {
    constructor(private schema: Parser<T>) {
        super()
    }

    parseShape(value: unknown, options?: ParseOptions): T[] {
        // check runtime type
        if (!Array.isArray(value)) {
            throw new Error(`Expected array but got ${typeof value}`)
        }
        // parse each element
        for (const [index, el] of value.entries()) {
            this.schema.parse(el)
        }
        return value as T[]
    }
}