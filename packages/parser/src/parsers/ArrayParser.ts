import { BaseParser, ParseOptions, Parser } from "./Parser.js"


class ArrayParser<T> extends BaseParser<T[]> {
    constructor(private schema: Parser<T>) {
        super()
    }

    _parse(value: unknown, options?: ParseOptions): T[] {
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

export const pArray = <T>(schema: Parser<T>): Parser<T[]> => new ArrayParser(schema)
