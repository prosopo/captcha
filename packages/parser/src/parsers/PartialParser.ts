import { Parseable } from "./Parseable.js"
import { BaseParser, ParseOptions, Parser } from "./Parser.js"

class PartialParser<T extends {}> extends BaseParser<Partial<T>> {
    constructor(private schema: Parseable<T>) {
        super()
    }

    override _parse(value: unknown, options?: ParseOptions): Partial<T> {
        // TODO allow optional keys to do partial parsing
        throw new Error("Method not implemented.")
    }

    override validate(value: Partial<T>): void {
        super.validate(value)
        // TODO allow optional keys to do partial validation
        throw new Error("Method not implemented.")
    }
}

export const pPartial = <T extends {}>(schema: Parseable<T>): Parser<Partial<T>> => new PartialParser(schema)